import { useEffect, useState } from "react";

import useSWRImmutable from "swr/immutable";

import { Progress } from "@/components/ui/progress";

import type { DocumentProcessingStatus } from "@/lib/documents/document-processing-types";
import { cn, fetcher } from "@/lib/utils";
import { useDocumentProgressStatus } from "@/lib/utils/use-progress-status";

const QUEUED_MESSAGES = [
  "Converting document...",
  "Optimizing for viewing...",
  "Preparing preview...",
  "Almost ready...",
];

type ProgressTokenResponse = {
  publicAccessToken: string | null;
  processingStatus?: DocumentProcessingStatus;
};

export default function FileProcessStatusBar({
  documentVersionId,
  className,
  mutateDocument,
  onProcessingChange,
}: {
  documentVersionId: string;
  className?: string;
  mutateDocument?: () => void;
  onProcessingChange?: (processing: boolean) => void;
}) {
  const [messageIndex, setMessageIndex] = useState(0);
  const { data } = useSWRImmutable<ProgressTokenResponse>(
    `/api/progress-token?documentVersionId=${documentVersionId}`,
    fetcher,
  );

  const { status: progressStatus, error: progressError } =
    useDocumentProgressStatus(
      documentVersionId,
      data?.publicAccessToken,
      data?.processingStatus,
    );

  useEffect(() => {
    if (!onProcessingChange) return;
    onProcessingChange(
      progressStatus.state === "QUEUED" ||
        progressStatus.state === "EXECUTING",
    );
  }, [progressStatus.state, onProcessingChange]);

  useEffect(() => {
    if (progressStatus.state !== "QUEUED") {
      return;
    }

    const interval = setInterval(() => {
      setMessageIndex((current) => (current + 1) % QUEUED_MESSAGES.length);
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [progressStatus.state]);

  useEffect(() => {
    if (progressStatus.state === "COMPLETED") {
      mutateDocument?.();
    }
  }, [progressStatus.state, mutateDocument]);

  if (progressStatus.state === "COMPLETED") {
    return null;
  }

  if (progressStatus.state === "QUEUED" && !progressError) {
    return (
      <Progress
        value={0}
        text={QUEUED_MESSAGES[messageIndex]}
        className={cn(
          "w-full rounded-none text-[8px] font-semibold",
          className,
        )}
      />
    );
  }

  if (
    progressError ||
    ["FAILED", "CRASHED", "CANCELED", "SYSTEM_FAILURE"].includes(
      progressStatus.state,
    )
  ) {
    return (
      <Progress
        value={0}
        text={
          progressError?.message ||
          progressStatus.text ||
          "Error processing document"
        }
        error={true}
        className={cn(
          "w-full rounded-none text-[8px] font-semibold",
          className,
        )}
      />
    );
  }

  return (
    <Progress
      value={progressStatus.progress || 0}
      text={progressStatus.text || "Processing document..."}
      className={cn("w-full rounded-none text-[8px] font-semibold", className)}
    />
  );
}
