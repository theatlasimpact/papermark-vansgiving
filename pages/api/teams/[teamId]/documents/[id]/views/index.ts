import { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { View } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";
import { getServerSession } from "next-auth/next";

import { LIMITS } from "@/lib/constants";
import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { getViewPageDuration } from "@/lib/tinybird";
import { getVideoEventsByDocument } from "@/lib/tinybird/pipes";
import { CustomUser } from "@/lib/types";
import { log } from "@/lib/utils";

type DocumentVersion = {
  versionNumber: number;
  createdAt: Date;
  numPages: number | null;
  type: string | null;
  length: number | null;
};

type Document = {
  id: string;
  versions: DocumentVersion[];
  numPages: number | null;
  type: string | null;
  ownerId: string | null;
  team?: {
    users: { userId: string }[];
  };
  _count: {
    views: number;
  };
};

type VideoEvent = {
  view_id: string;
  start_time: number;
  end_time: number;
  event_type: string;
};

type ViewWithExtras = View & {
  link: { name: string | null };
  feedbackResponse: {
    id: string;
    data: JsonValue;
  } | null;
  agreementResponse: {
    id: string;
    agreementId: string;
    agreement: { name: string };
  } | null;
};

async function getVideoViews(
  views: ViewWithExtras[],
  document: Document,
  videoEvents: { data: VideoEvent[] },
) {
  const durationsPromises = views.map((view) => {
    const viewEvents =
      videoEvents?.data.filter(
        (event) =>
          event.view_id === view.id &&
          ["played", "muted", "unmuted", "rate_changed"].includes(
            event.event_type,
          ) &&
          event.end_time > event.start_time &&
          event.end_time - event.start_time >= 1,
      ) || [];

    const timestampCounts = new Map<number, number>();
    const uniqueTimestamps = new Set<number>();

    viewEvents.forEach((event) => {
      for (let t = event.start_time; t < event.end_time; t++) {
        const timestamp = Math.floor(t);
        timestampCounts.set(
          timestamp,
          (timestampCounts.get(timestamp) || 0) + 1,
        );
        uniqueTimestamps.add(timestamp);
      }
    });

    let totalWatchTime = 0;
    timestampCounts.forEach((count) => {
      totalWatchTime += count;
    });

    const uniqueWatchTime = uniqueTimestamps.size;

    return {
      data: [],
      totalWatchTime,
      uniqueWatchTime,
      videoLength: document.versions[0]?.length || 0,
    };
  });

  const durations = await Promise.all(durationsPromises);

  return views.map((view, index) => {
    const relevantDocumentVersion = document.versions.find(
      (version) => version.createdAt <= view.viewedAt,
    );

    const duration = durations[index];
    const completionRate =
      duration.videoLength > 0
        ? Math.min(100, (duration.uniqueWatchTime / duration.videoLength) * 100)
        : 0;

    return {
      ...view,
      duration: durations[index],
      totalDuration: duration.totalWatchTime * 1000,
      completionRate: completionRate.toFixed(),
      versionNumber: relevantDocumentVersion?.versionNumber || 1,
      versionNumPages: 0,
    };
  });
}

async function getDocumentViews(views: ViewWithExtras[], document: Document) {
  const durationsPromises = views.map((view) => {
    return getViewPageDuration({
      documentId: document.id,
      viewId: view.id,
      since: 0,
    });
  });

  const durations = await Promise.all(durationsPromises);

  return views.map((view, index) => {
    const relevantDocumentVersion = document.versions.find(
      (version) => version.createdAt <= view.viewedAt,
    );

    const numPages =
      relevantDocumentVersion?.numPages || document.numPages || 0;
    const completionRate = numPages
      ? (durations[index].data.length / numPages) * 100
      : 0;

    return {
      ...view,
      duration: durations[index],
      totalDuration: durations[index].data.reduce(
        (total: number, data: { sum_duration: number }) =>
          total + data.sum_duration,
        0,
      ),
      completionRate: completionRate.toFixed(),
      versionNumber: relevantDocumentVersion?.versionNumber || 1,
      versionNumPages: numPages,
    };
  });
}

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const { teamId, id: docId } = req.query as { teamId: string; id: string };
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "10", 10);
    const offset = (page - 1) * limit;

    const userId = (session.user as CustomUser).id;

    try {
      const [team, document, membership] = await Promise.all([
        prisma.team.findUnique({
          where: { id: teamId },
          select: { plan: true },
        }),
        prisma.document.findUnique({
          where: { id: docId, teamId: teamId },
          select: {
            id: true,
            ownerId: true,
            numPages: true,
            type: true,
            team: {
              select: {
                users: {
                  select: {
                    userId: true,
                  },
                },
              },
            },
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
                views: true,
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

      if (!team) {
        return res.status(404).end("Team not found");
      }

      if (!document) {
        return res.status(404).end("Document not found");
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

      if (document._count.views === 0) {
        return res.status(200).json({
          viewsWithDuration: [],
          hiddenViewCount: 0,
          totalViews: 0,
        });
      }

      const views = await prisma.view.findMany({
        skip: offset,
        take: limit,
        where: {
          documentId: docId,
        },
        orderBy: {
          viewedAt: "desc",
        },
        include: {
          link: {
            select: {
              name: true,
            },
          },
          feedbackResponse: {
            select: {
              id: true,
              data: true,
            },
          },
          agreementResponse: {
            select: {
              id: true,
              agreementId: true,
              agreement: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      const users = await prisma.user.findMany({
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
      });

      const limitedViews =
        team.plan === "free" && offset >= LIMITS.views ? [] : views;

      let viewsWithDuration;
      try {
        if (document.type === "video") {
          const videoEvents = await getVideoEventsByDocument({
            document_id: docId,
          });
          viewsWithDuration = await getVideoViews(
            limitedViews,
            document,
            videoEvents,
          );
        } else {
          viewsWithDuration = await getDocumentViews(limitedViews, document);
        }
      } catch (durationError) {
        await log({
          message: `Failed to load view durations for document ${docId}: ${durationError}`,
          type: "error",
        });
        viewsWithDuration = limitedViews.map((view) => {
          const relevantDocumentVersion = document.versions.find(
            (version) => version.createdAt <= view.viewedAt,
          );
          const numPages =
            relevantDocumentVersion?.numPages || document.numPages || 0;

          return {
            ...view,
            duration: { data: [] },
            totalDuration: 0,
            completionRate: 0,
            versionNumber: relevantDocumentVersion?.versionNumber || 1,
            versionNumPages: numPages,
          };
        });
      }

      viewsWithDuration = viewsWithDuration.map((view: any) => ({
        ...view,
        internal: users.some((user) => user.email === view.viewerEmail),
      }));

      return res.status(200).json({
        viewsWithDuration,
        hiddenViewCount: Math.max(views.length - limitedViews.length, 0),
        totalViews: document._count.views || 0,
      });
    } catch (error) {
      log({
        message: `Failed to get views for document: _${docId}_. \n\n ${error} \n\n*Metadata*: \`{teamId: ${teamId}, userId: ${userId}}\``,
        type: "error",
      });
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
