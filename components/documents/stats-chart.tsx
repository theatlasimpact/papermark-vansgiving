import ErrorPage from "next/error";

import { TStatsData } from "@/lib/swr/use-stats";

import BarChartComponent from "../charts/bar-chart";
import StatsChartSkeleton from "./stats-chart-skeleton";

export default function StatsChart({
  documentId,
  statsData,
  totalPagesMax = 0,
}: {
  documentId: string;
  statsData: { stats: TStatsData | undefined; loading: boolean; error: any };
  totalPagesMax?: number;
}) {
  const { stats, loading, error } = statsData;

  if (error && error.status === 404) {
    return <ErrorPage statusCode={404} />;
  }

  if (loading) {
    return <StatsChartSkeleton className="my-8" />;
  }

  const analyticsEnabled = stats?.analyticsEnabled ?? true;

  const durationData = (stats?.duration?.data ?? []).reduce(
    (
      acc: {
        pageNumber: string;
        data: { versionNumber: number; avg_duration: number }[];
      }[],
      dataItem,
    ) => {
      const pageIndex = acc.findIndex(
        (item) => item.pageNumber === dataItem.pageNumber,
      );

      if (pageIndex !== -1) {
        const versionIndex = acc[pageIndex].data.findIndex(
          (v) => v.versionNumber === dataItem.versionNumber,
        );
        if (versionIndex === -1) {
          acc[pageIndex].data.push({
            versionNumber: dataItem.versionNumber,
            avg_duration: dataItem.avg_duration,
          });
        } else {
          acc[pageIndex].data[versionIndex] = {
            ...acc[pageIndex].data[versionIndex],
            avg_duration: dataItem.avg_duration,
          };
        }
      } else {
        acc.push({
          pageNumber: dataItem.pageNumber,
          data: [
            {
              versionNumber: dataItem.versionNumber,
              avg_duration: dataItem.avg_duration,
            },
          ],
        });
      }

      return acc;
    },
    Array.from({ length: totalPagesMax }, (_, i) => ({
      pageNumber: (i + 1).toString(),
      data: [],
    })),
  ).filter((item) => item.data.length > 0);

  if (!analyticsEnabled || durationData.length === 0) {
    return (
      <div className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
        Detailed engagement analytics are disabled or unavailable for this document.
      </div>
    );
  }

  return (
    <div className="rounded-bl-lg border-b border-l pb-0.5 pl-0.5 md:pb-1 md:pl-1">
      <BarChartComponent data={durationData} />
    </div>
  );
}
