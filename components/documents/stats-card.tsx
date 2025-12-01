import ErrorPage from "next/error";

import { TStatsData } from "@/lib/swr/use-stats";

import { Skeleton } from "@/components/ui/skeleton";

import StatsElement from "./stats-element";

export default function StatsCard({
  statsData,
}: {
  statsData: { stats: TStatsData | undefined; loading: boolean; error: any };
}) {
  const { stats, loading, error } = statsData;

  if (error && error.status === 404) {
    return <ErrorPage statusCode={404} />;
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 space-y-2 border-foreground/5 sm:grid-cols-3 sm:space-x-2 sm:space-y-0 lg:grid-cols-3 lg:space-x-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            className="rounded-lg border border-foreground/5 px-4 py-6 sm:px-6 lg:px-8"
            key={i}
          >
            <Skeleton className="h-6 w-[80%] rounded-sm" />
            <Skeleton className="mt-4 h-8 w-9" />
          </div>
        ))}
      </div>
    );
  }

  const analyticsEnabled = stats?.analyticsEnabled ?? true;
  const totalDurationMs = stats?.total_duration ?? 0;
  const durationValue =
    totalDurationMs < 60000
      ? Math.round(totalDurationMs / 1000).toString()
      : `${Math.floor(totalDurationMs / 60000)}:${
          Math.round((totalDurationMs % 60000) / 1000) < 10
            ? `0${Math.round((totalDurationMs % 60000) / 1000)}`
            : Math.round((totalDurationMs % 60000) / 1000)
        }`;
  const durationUnit = totalDurationMs < 60000 ? "seconds" : "minutes";

  const statistics = [
    {
      name: "Number of views",
      value: (stats?.totalViews ?? 0).toString(),
      active: true,
    },
    {
      name: "Average view completion",
      value: `${stats?.avgCompletionRate ?? 0}%`,
      active: analyticsEnabled && (stats?.totalViews ?? 0) > 0,
    },
    {
      name: "Total average view duration",
      value: durationValue,
      unit: durationUnit,
      active: analyticsEnabled && totalDurationMs > 0,
    },
  ];

  return stats ? (
    <div className="grid grid-cols-1 space-y-2 border-foreground/5 sm:grid-cols-3 sm:space-x-2 sm:space-y-0 lg:grid-cols-3 lg:space-x-3">
      {statistics.map((stat, statIdx) => (
        <StatsElement key={statIdx} stat={stat} statIdx={statIdx} />
      ))}
    </div>
  ) : null;
}
