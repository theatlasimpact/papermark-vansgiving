import { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth/next";

import { LIMITS } from "@/lib/constants";
import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { teamHasFeature } from "@/lib/plan/guards";
import { callTinybird, getViewPageDuration } from "@/lib/tinybird";
import { CustomUser } from "@/lib/types";
import { log } from "@/lib/utils";

import { authOptions } from "../../auth/[...nextauth]";

type AnalyticsUnavailableReason = "unauthorized" | "error" | undefined;

type ViewDurationResult = {
  data: { pageNumber: string; sum_duration: number }[];
};

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    // GET /api/links/:id/visits
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    // get link id from query params
    const { id } = req.query as { id: string };

    const userId = (session.user as CustomUser).id;

    try {
      // get the numPages from document
      const result = await prisma.link.findUnique({
        where: {
          id: id,
        },
        select: {
          deletedAt: true,
          document: {
            select: {
              id: true,
              ownerId: true,
              numPages: true,
              versions: {
                where: { isPrimary: true },
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { numPages: true },
              },
              team: {
                select: {
                  id: true,
                  plan: true,
                  users: {
                    select: {
                      userId: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // If link doesn't exist (deleted), return empty array
      if (!result || !result.document || result.deletedAt) {
        return res.status(200).json({
          visits: [],
          totalVisits: 0,
          analyticsEnabled: true,
        });
      }

      // authorize: allow document owners or team members
      const isOwner = result.document.ownerId === userId;
      const isTeamMember = result.document.team?.users.some(
        (user) => user.userId === userId,
      );

      const membership = result.document.team
        ? await prisma.userTeam.findUnique({
            where: {
              userId_teamId: {
                userId,
                teamId: result.document.team.id,
              },
            },
            select: { status: true, blockedAt: true },
          })
        : null;

      const hasActiveMembership =
        membership?.status === "ACTIVE" && !membership?.blockedAt;
      const isAuthorized = isOwner || (isTeamMember && hasActiveMembership);

      if (!isAuthorized) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const numPages =
        result?.document?.versions[0]?.numPages ||
        result?.document?.numPages ||
        0;

      const views = await prisma.view.findMany({
        where: {
          linkId: id,
        },
        orderBy: {
          viewedAt: "desc",
        },
      });

      // limit the number of views to 20 on free plan
      const limitedViews =
        !teamHasFeature(result?.document?.team?.plan || "free", "viewsFull")
          ? views.slice(0, LIMITS.views)
          : views;

      let analyticsEnabled = true;
      let analyticsUnavailableReason: AnalyticsUnavailableReason;
      let viewsWithDuration;

      const durationResults = await Promise.all(
        limitedViews.map((view) =>
          callTinybird(() =>
            getViewPageDuration({
              documentId: view.documentId!,
              viewId: view.id,
              since: 0,
            }),
          ),
        ),
      );

      const durationError = durationResults.find(
        (result) => !result.ok && !result.unauthorized,
      );
      const durationUnauthorized = durationResults.some(
        (result) => !result.ok && result.unauthorized,
      );

      if (durationError) {
        throw durationError.error ?? new Error("Failed to fetch durations");
      }

      analyticsEnabled = !durationUnauthorized;
      analyticsUnavailableReason = durationUnauthorized
        ? "unauthorized"
        : undefined;

      const safeDuration = (result: ViewDurationResult | undefined) =>
        result?.data ?? [];

      // Construct the response combining views and their respective durations
      viewsWithDuration = limitedViews.map((view, index) => {
        const durationResult = durationResults[index];
        const normalizedDuration = {
          data: safeDuration(durationResult.ok ? durationResult.data : undefined).map(
            (dataPoint) => ({
              ...dataPoint,
              // Tinybird returns seconds; convert to milliseconds for UI consumers.
              sum_duration: dataPoint.sum_duration * 1000,
            }),
          ),
        };

        const totalDurationMs = normalizedDuration.data.reduce(
          (totalDuration, data) => totalDuration + data.sum_duration,
          0,
        );

        // calculate the completion rate
        const completionRate = numPages
          ? (normalizedDuration.data.filter((data) => data.sum_duration > 0).length /
              numPages) *
            100
          : 0;
        const completionPercent = Math.min(100, Math.round(completionRate));

        return {
          ...view,
          duration: normalizedDuration,
          totalDuration: totalDurationMs,
          durationSeconds: totalDurationMs / 1000,
          completionRate: completionPercent,
          completionPercent,
        };
      });

      return res.status(200).json({
        visits: viewsWithDuration,
        totalVisits: limitedViews.length,
        analyticsEnabled,
        analyticsUnavailableReason,
      });
    } catch (error) {
      log({
        message: `Failed to get views for link: _${id}_. \n\n ${error} \n\n*Metadata*: \`{userId: ${userId}}\``,
        type: "error",
      });
      errorhandler(error, res);
    }
  } else {
    // We only allow GET requests
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
