export default function StatsChartDummy({
  totalPagesMax = 0,
}: {
  totalPagesMax?: number;
}) {
  return (
    <div className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
      Detailed engagement analytics will appear here after your document receives views.
      {totalPagesMax ? ` (Currently configured for up to ${totalPagesMax} pages.)` : ""}
    </div>
  );
}
