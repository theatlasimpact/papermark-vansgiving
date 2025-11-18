import { NextApiRequest, NextApiResponse } from "next";

import { getLimits } from "@/ee/limits/server";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

import { newId } from "@/lib/id-helper";
import { hasDataRoomTrial, teamHasFeature } from "@/lib/plan/guards";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    // GET /api/teams/:teamId/datarooms
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const userId = (session.user as CustomUser).id;
    const { teamId } = req.query as { teamId: string };

    try {
      const teamAccess = await prisma.userTeam.findUnique({
        where: {
          userId_teamId: {
            userId: userId,
            teamId: teamId,
          },
        },
        select: {
          teamId: true,
        },
      });

      if (!teamAccess) {
        return res.status(401).end("Unauthorized");
      }

      // Check if the user is part of the team
      const datarooms = await prisma.dataroom.findMany({
        where: {
          teamId: teamId,
        },
        include: {
          _count: {
            select: { documents: true, views: true },
          },
          links: {
            where: {
              linkType: "DATAROOM_LINK",
              deletedAt: null,
            },
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              isArchived: true,
              expiresAt: true,
              createdAt: true,
            },
          },
          views: {
            orderBy: {
              viewedAt: "desc",
            },
            take: 1,
            select: {
              viewedAt: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json(datarooms);
    } catch (error) {
      console.error("Request error", error);
      return res.status(500).json({ error: "Error fetching datarooms" });
    }
  } else if (req.method === "POST") {
    // POST /api/teams/:teamId/datarooms
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      res.status(401).end("Unauthorized");
      return;
    }

    const userId = (session.user as CustomUser).id;

    const { teamId } = req.query as { teamId: string };
    const { name } = req.body as { name: string };

    try {
      // Check if the user is part of the team
      const team = await prisma.team.findUnique({
        where: {
          id: teamId,
          users: {
            some: {
              userId: userId,
            },
          },
        },
        select: {
          id: true,
          plan: true,
          _count: {
            select: { datarooms: true },
          },
        },
      });

      if (!team) {
        return res.status(401).end("Unauthorized");
      }

      const hasTrialAccess = hasDataRoomTrial(team.plan);
      const canUseDatarooms =
        hasTrialAccess || teamHasFeature(team.plan, "datarooms");

      if (!canUseDatarooms) {
        return res.status(401).end("Unauthorized");
      }

      // Limits: Check if the user has reached the limit of datarooms in the team
      const dataroomCount = team._count.datarooms;
      const limits = await getLimits({ teamId, userId });

      if (!hasTrialAccess && limits && dataroomCount >= limits.datarooms) {
        return res
          .status(403)
          .json({ message: "You have reached the limit of datarooms" });
      }

      if (hasTrialAccess && dataroomCount > 0) {
        return res
          .status(400)
          .json({ message: "Trial data room already exists" });
      }

      const pId = newId("dataroom");

      const dataroom = await prisma.dataroom.create({
        data: {
          name: name,
          teamId: teamId,
          pId: pId,
        },
      });

      const dataroomWithCount = {
        ...dataroom,
        _count: { documents: 0 },
      };

      res.status(201).json({ dataroom: dataroomWithCount });
    } catch (error) {
      console.error("Request error", error);
      res.status(500).json({ error: "Error creating dataroom" });
    }
  } else {
    // We only allow POST requests
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
