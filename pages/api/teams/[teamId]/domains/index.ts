import { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth/next";

import { addDomainToVercel, validDomainRegex } from "@/lib/domains";
import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { getTeamWithDomain } from "@/lib/team/helper";
import { CustomUser } from "@/lib/types";
import { log } from "@/lib/utils";
import {
  isPrivilegedAdmin,
  isPrivilegedDomain,
} from "@/lib/utils/admin";

import { authOptions } from "../../../auth/[...nextauth]";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    // GET /api/teams/:teamId/domains
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const { teamId } = req.query as { teamId: string };

    const userId = (session.user as CustomUser).id;

    try {
      const { team } = await getTeamWithDomain({
        teamId,
        userId,
        options: {
          select: {
            slug: true,
            verified: true,
            isDefault: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      });

      const domains = team.domains;
      return res.status(200).json(domains);
    } catch (error) {
      errorhandler(error, res);
    }
  } else if (req.method === "POST") {
    // POST /api/teams/:teamId/domains
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      res.status(401).end("Unauthorized");
      return;
    }

    const sessionUser = session.user as CustomUser;
    const userId = sessionUser.id;
    const { teamId } = req.query as { teamId: string };

    if (!teamId) {
      return res.status(401).json("Unauthorized");
    }

    try {
      await getTeamWithDomain({
        teamId,
        userId,
      });

      const { domain } = req.body;

      const sanitizedDomain = domain
        .trim()
        .toLowerCase()
        .replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
        .split("/")[0];

      const isAdminOverride =
        isPrivilegedAdmin(sessionUser.email) &&
        isPrivilegedDomain(sanitizedDomain);

      if (!isAdminOverride) {
        const validDomain = validDomainRegex.test(sanitizedDomain);
        if (validDomain !== true) {
          return res.status(422).json("Invalid domain");
        }

        if (sanitizedDomain.toLowerCase().includes("papermark")) {
          return res
            .status(400)
            .json({ message: "Domain cannot contain 'papermark'" });
        }

        const existingDomain = await prisma.domain.findFirst({
          where: {
            slug: sanitizedDomain,
          },
        });

        if (existingDomain) {
          return res.status(400).json({ message: "Domain already exists" });
        }
      }

      const response = await prisma.domain.upsert({
        where: { slug: sanitizedDomain },
        update: {
          userId,
          teamId,
          verified: isAdminOverride ? true : undefined,
          lastChecked: isAdminOverride ? new Date() : undefined,
        },
        create: {
          slug: sanitizedDomain,
          userId,
          teamId,
          verified: isAdminOverride ? true : undefined,
        },
      });

      if (!isAdminOverride) {
        await addDomainToVercel(sanitizedDomain);
      } else {
        await log({
          message: `Admin override accepted domain ${sanitizedDomain} without DNS verification`,
          type: "info",
        });
      }

      return res.status(201).json(response);
    } catch (error) {
      log({
        message: `Failed to add domain. \n\n ${error} \n\n*Metadata*: \`{teamId: ${teamId}, userId: ${userId}}\``,
        type: "error",
        mention: true,
      });
      errorhandler(error, res);
    }
  } else {
    // We only allow GET and POST requests
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
