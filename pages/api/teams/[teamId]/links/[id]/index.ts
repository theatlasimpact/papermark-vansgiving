import { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth/next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";
import { log } from "@/lib/utils";
import { canDeleteLink } from "@/lib/permissions/link";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).end("Unauthorized");
  }

  const { teamId, id: linkId } = req.query as {
    teamId?: string;
    id?: string;
  };

  if (!teamId || !linkId) {
    return res
      .status(400)
      .json({ error: "Both teamId and link id are required parameters." });
  }

  const userId = (session.user as CustomUser)?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const membership = await prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
      select: {
        role: true,
        blockedAt: true,
        status: true,
      },
    });

    if (!canDeleteLink(membership)) {
      await log({
        message: `Link delete denied: user ${userId} is not allowed to edit team ${teamId}. Link ${linkId}.`,
        type: "error",
      });
      return res
        .status(403)
        .json({ error: "You do not have permission to delete this link." });
    }

    const linkToDelete = await prisma.link.findFirst({
      where: {
        id: linkId,
        teamId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!linkToDelete) {
      return res.status(404).json({ error: "Link not found" });
    }

    await prisma.link.update({
      where: { id: linkId },
      data: {
        deletedAt: new Date(),
        isArchived: true,
      },
    });

    await log({
      message: `Link deleted: ${linkId} by user ${userId} in team ${teamId}.`,
      type: "info",
    });

    return res.status(204).end();
  } catch (error) {
    await log({
      message: `Failed to delete link: ${linkId} in team ${teamId}. \n\n ${error} \n\n*Metadata*: \`{teamId: ${teamId}, userId: ${userId}}\``,
      type: "error",
    });
    errorhandler(error, res);
  }
}
