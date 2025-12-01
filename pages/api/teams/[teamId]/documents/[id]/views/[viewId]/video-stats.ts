import { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

import prisma from "@/lib/prisma";
import { callTinybird } from "@/lib/tinybird";
import { getVideoEventsByView } from "@/lib/tinybird/pipes";
import { CustomUser } from "@/lib/types";

type AnalyticsUnavailableReason = "unauthorized" | "error" | undefined;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      teamId,
      id: documentId,
      viewId,
    } = req.query as {
      teamId: string;
      id: string;
      viewId: string;
    };
    const userId = (session.user as CustomUser).id;

    // Check document access
    const doc = await prisma.document.findFirst({
      where: {
        id: documentId,
        teamId,
        team: {
          users: {
            some: {
              userId,
            },
          },
        },
      },
      include: {
        versions: {
          where: {
            isPrimary: true,
          },
          select: {
            length: true,
          },
        },
      },
    });

    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const videoLength = doc.versions[0]?.length;
    if (!videoLength) {
      return res.status(400).json({ error: "Video length not found" });
    }

    let analyticsEnabled = true;
    let analyticsUnavailableReason: AnalyticsUnavailableReason;

    const response = await callTinybird(() =>
      getVideoEventsByView({
        view_id: viewId,
        document_id: documentId,
      }),
    );

    if (!response.ok) {
      if (response.unauthorized) {
        analyticsEnabled = false;
        analyticsUnavailableReason = "unauthorized";
      } else {
        console.error("Error fetching video stats:", response.error);
        return res.status(500).json({ error: "Internal Server Error" });
      }
    }

    if (!response.ok || !response.data?.data) {
      return res
        .status(200)
        .json({ data: [], analyticsEnabled, analyticsUnavailableReason });
    }

    // Filter for valid events and ensure valid time ranges > 1 second
    const validEvents = response.data.data.filter((event: any) =>
      (event.event_type === "played" ||
        event.event_type === "muted" ||
        event.event_type === "unmuted" ||
        event.event_type === "rate_changed") &&
      event.end_time > event.start_time &&
      event.end_time - event.start_time >= 1,
    );

    // Create a baseline array with zeros for every second
    const viewDistributionMap = new Map<number, number>();
    for (let t = 0; t <= videoLength; t++) {
      viewDistributionMap.set(t, 0);
    }

    // Fill in the actual playback periods
    validEvents.forEach((event: any) => {
      // For each second in the duration, increment the view count
      for (let t = event.start_time; t < event.end_time; t++) {
        viewDistributionMap.set(t, (viewDistributionMap.get(t) || 0) + 1);
      }
    });

    // Convert to sorted array
    const distributionArray = Array.from(viewDistributionMap.entries())
      .map(([start_time, views]) => ({
        start_time,
        views,
      }))
      .sort((a, b) => a.start_time - b.start_time);

    return res.status(200).json({
      data: distributionArray,
      analyticsEnabled,
      analyticsUnavailableReason,
    });
  } catch (error) {
    console.error("Error fetching video stats:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
