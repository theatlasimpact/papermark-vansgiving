import { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { getViewPageDuration } from "@/lib/tinybird";
import { CustomUser } from "@/lib/types";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    // GET /api/teams/:teamId/documents/:id/views/:viewId/stats
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const {
      teamId,
      id: docId,
      viewId,
    } = req.query as {
      teamId: string;
      id: string;
      viewId: string;
    };

    const userId = (session.user as CustomUser).id;

    try {
      const teamAccess = await prisma.userTeam.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId,
          },
        },
        select: {
          status: true,
          blockedAt: true,
        },
      });

      if (!teamAccess || teamAccess.status !== "ACTIVE" || teamAccess.blockedAt) {
        return res.status(403).end("Unauthorized");
      }

      const document = await prisma.document.findUnique({
        where: {
          id: docId,
          teamId,
        },
        select: { id: true },
      });

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const duration = await getViewPageDuration({
        documentId: docId,
        viewId: viewId,
        since: 0,
      });

      const normalizedDuration = {
        ...duration,
        data: duration.data.map((dataPoint) => ({
          ...dataPoint,
          // Tinybird returns seconds; convert to milliseconds for UI consumers.
          sum_duration: dataPoint.sum_duration * 1000,
        })),
      };

      const total_duration = normalizedDuration.data.reduce(
        (totalDuration, data) => totalDuration + data.sum_duration,
        0,
      );

      const stats = { duration: normalizedDuration, total_duration };

      return res.status(200).json(stats);
    } catch (error) {
      errorhandler(error, res);
    }
  } else {
    // We only allow GET and POST requests
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
