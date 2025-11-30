import { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { View } from "@prisma/client";
import { getServerSession } from "next-auth/next";

import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import {
  callTinybird,
  TinybirdUnauthorizedError,
  getTotalAvgPageDuration,
  getTotalDocumentDuration,
  getViewPageDuration,
} from "@/lib/tinybird";
import { getVideoEventsByDocument } from "@/lib/tinybird/pipes";
import { CustomUser } from "@/lib/types";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const {
      teamId,
      id: docId,
      excludeTeamMembers,
    } = req.query as {
      teamId: string;
      id: string;
      excludeTeamMembers?: string;
    };

    const excludeMembers = excludeTeamMembers === "true";
    const userId = (session.user as CustomUser).id;

    try {
      const [document, membership] = await Promise.all([
        prisma.document.findUnique({
          where: {
            id: docId,
            teamId,
          },
          select: {
            id: true,
            teamId: true,
            numPages: true,
            type: true,
            ownerId: true,
            versions: {
              orderBy: { createdAt: "desc" },
              select: {
                versionNumber: true,
                createdAt: true,
                numPages: true,
                type: true,
                length: true,
              },
            },
            _count: {
              select: {
                views: { where: { isArchived: false } },
              },
            },
          },
        }),
        prisma.userTeam.findUnique({
          where: {
            userId_teamId: {
              userId,
              teamId,
            },
          },
          select: {
            role: true,
            status: true,
            blockedAt: true,
          },
        }),
      ]);

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const hasActiveMembership =
        membership &&
        membership.status === "ACTIVE" &&
        !membership.blockedAt;
      const isAuthorized =
        document.ownerId === userId || hasActiveMembership === true;

      if (!isAuthorized) {
        return res.status(403).end("Unauthorized");
      }

      const [views, users] = await Promise.all([
        prisma.view.findMany({
          where: {
            documentId: docId,
          },
        }),
        excludeMembers
          ? prisma.user.findMany({
              where: {
                teams: {
                  some: {
                    teamId: teamId,
                    status: "ACTIVE",
                    blockedAt: null,
                  },
                },
              },
              select: {
                email: true,
              },
            })
          : Promise.resolve([]),
      ]);

      const excludedTeamViews = views.filter((view: View) =>
        users.some((user: { email: string | null }) =>
          user.email !== null && user.email === view.viewerEmail,
        ),
      );

      const archivedViews = views.filter((view) => view.isArchived === true);

      const allExcludedViews = excludeMembers
        ? [...excludedTeamViews, ...archivedViews]
        : [...archivedViews];

      const filteredViews = views.filter(
        (view) => !allExcludedViews.map((view) => view.id).includes(view.id),
      );

      if (filteredViews.length === 0) {
        return res.status(200).json({
          views: [],
          duration: { data: [] },
          total_duration: 0,
          avgCompletionRate: 0,
          totalViews: 0,
          analyticsEnabled: true,
        });
      }

      let durationWithMs: {
        data: { avg_duration: number; pageNumber: string; versionNumber: number }[];
      } = { data: [] };
      let totalDurationAverageMs = 0;
      let avgCompletionRate = 0;
      let analyticsEnabled = true;

      try {
        const [duration, totalDocumentDuration] = await Promise.all([
          callTinybird(() =>
            getTotalAvgPageDuration({
              documentId: docId,
              excludedLinkIds: "",
              excludedViewIds: allExcludedViews.map((view) => view.id).join(","),
              since: 0,
            }),
          ),
          callTinybird(() =>
            getTotalDocumentDuration({
              documentId: docId,
              excludedLinkIds: "",
              excludedViewIds: allExcludedViews.map((view) => view.id).join(","),
              since: 0,
            }),
          ),
        ]);

        durationWithMs = {
          ...duration,
          data: duration.data.map((dataPoint) => ({
            ...dataPoint,
            // Tinybird returns seconds; convert to milliseconds for UI consumers.
            avg_duration: dataPoint.avg_duration * 1000,
          })),
        };

        if (filteredViews.length > 0) {
          const totalDuration = totalDocumentDuration.data?.[0]?.sum_duration ?? 0;
          totalDurationAverageMs =
            (totalDuration * 1000) / (filteredViews.length || 1);
        }

        if (filteredViews.length > 0) {
          if (document.type === "video") {
            const videoEvents = await callTinybird(() =>
              getVideoEventsByDocument({
                document_id: docId,
              }),
            );

            const completionRates = await Promise.all(
              filteredViews.map(async (view) => {
                const viewEvents =
                  videoEvents?.data.filter(
                    (event: any) =>
                      event.view_id === view.id &&
                      ["played", "muted", "unmuted", "rate_changed"].includes(
                        event.event_type,
                      ) &&
                      event.end_time > event.start_time &&
                      event.end_time - event.start_time >= 1,
                  ) || [];

                const uniqueTimestamps = new Set<number>();
                viewEvents.forEach((event: any) => {
                  for (let t = event.start_time; t < event.end_time; t++) {
                    uniqueTimestamps.add(Math.floor(t));
                  }
                });

                const videoLength = document.versions[0]?.length || 0;
                return videoLength > 0
                  ? Math.min(100, (uniqueTimestamps.size / videoLength) * 100)
                  : 0;
              }),
            );

            avgCompletionRate =
              completionRates.reduce((sum, rate) => sum + rate, 0) /
              completionRates.length;
          } else {
            const completionRates = await Promise.all(
              filteredViews.map(async (view) => {
                const pageData = await callTinybird(() =>
                  getViewPageDuration({
                    documentId: docId,
                    viewId: view.id,
                    since: 0,
                  }),
                );

                const relevantVersion = document.versions.find(
                  (version) => version.createdAt <= view.viewedAt,
                );
                const numPages =
                  relevantVersion?.numPages || document.numPages || 0;

                return numPages > 0 ? (pageData.data.length / numPages) * 100 : 0;
              }),
            );

            avgCompletionRate =
              completionRates.reduce((sum, rate) => sum + rate, 0) /
              completionRates.length;
          }
        }
      } catch (durationError) {
        if (durationError instanceof TinybirdUnauthorizedError) {
          analyticsEnabled = false;
          durationWithMs = { data: [] };
          totalDurationAverageMs = 0;
          avgCompletionRate = 0;
        } else {
          throw durationError;
        }
      }

      const stats = {
        views: filteredViews,
        duration: durationWithMs,
        total_duration: totalDurationAverageMs,
        avgCompletionRate: Math.round(avgCompletionRate),
        totalViews: filteredViews.length,
        analyticsEnabled,
      };

      return res.status(200).json(stats);
    } catch (error) {
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
