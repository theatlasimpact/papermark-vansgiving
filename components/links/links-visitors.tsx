import { Gauge } from "@/components/ui/gauge";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { VisitorAvatar } from "@/components/visitors/visitor-avatar";

import { useLinkVisits } from "@/lib/swr/use-link";
import { durationFormat, timeAgo } from "@/lib/utils";

export default function LinksVisitors({
  linkId,
  linkName,
}: {
  linkId: string;
  linkName: string;
}) {
  const { views, loading, error } = useLinkVisits(linkId);

  if (loading) {
    return (
      <>
        <TableRow>
          <TableCell colSpan={2}>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-6 w-[220px]" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-16" />
          </TableCell>
          <TableCell className="hidden sm:table-cell"></TableCell>
        </TableRow>
      </>
    );
  }

  if (error) {
    return (
      <TableRow>
        <TableCell colSpan={4} className="text-sm text-muted-foreground">
          Unable to load views for {linkName}. Please try again.
        </TableCell>
      </TableRow>
    );
  }

  if (!views || views.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={4} className="text-sm text-muted-foreground">
          No views yet for {linkName}.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {views.map((view) => (
        <TableRow key={view.id}>
          <TableCell colSpan={2}>
            <div className="flex items-center overflow-visible sm:space-x-3">
              <VisitorAvatar
                viewerEmail={view.viewerEmail}
                className="h-7 w-7 text-xs md:h-8 md:w-8 md:text-sm"
              />

              <p className="overflow-visible text-sm text-gray-800 dark:text-gray-200">
                {view.viewerEmail ? view.viewerEmail : "Anonymous"}
              </p>
            </div>
          </TableCell>

          <TableCell>
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="whitespace-nowrap text-sm text-muted-foreground">
                {durationFormat(view.totalDuration)}
              </div>

              <div className="text-xs md:text-sm">
                <Gauge
                  value={view.completionRate ?? 0}
                  size={"small"}
                  showValue={true}
                />
              </div>
            </div>
          </TableCell>

          <TableCell>
            <div>
              <time
                className="truncate text-sm text-muted-foreground"
                dateTime={new Date(view.viewedAt).toISOString()}
              >
                {timeAgo(view.viewedAt)}
              </time>
            </div>
          </TableCell>
          <TableCell className="hidden sm:table-cell"></TableCell>
        </TableRow>
      ))}
    </>
  );
}
