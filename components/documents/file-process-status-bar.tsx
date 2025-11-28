import { useEffect, useMemo, useState } from "react";

import useSWRImmutable from "swr/immutable";

import { Progress } from "@/components/ui/progress";
import type { DocumentProcessingStatus } from "@/lib/documents/document-processing-types";
import { isDocumentProcessingDisabled } from "@/lib/documents/processing-flags";
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
  const processingDisabled = isDocumentProcessingDisabled;
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (processingDisabled && onProcessingChange) {
      onProcessingChange(false);
    }
  }, [processingDisabled, onProcessingChange]);

  if (processingDisabled) {
    return null;
  }

  const { data } = useSWRImmutable<ProgressTokenResponse>(
    `/api/progress-token?documentVersionId=${documentVersionId}`,
    fetcher,
    {
      isPaused: () => processingDisabled,
    },
  );

  const { status: progressStatus, error: progressError } =
    useDocumentProgressStatus(
      documentVersionId,
      processingDisabled ? null : data?.publicAccessToken,
      processingDisabled
        ? { state: "READY", message: "", terminal: true }
        : data?.processingStatus,
    );

  const resolvedStatus = useMemo(() => {
    if (processingDisabled) {
      return { state: "COMPLETED", progress: 100, text: "" };
    }
    return progressStatus;
  }, [processingDisabled, progressStatus]);

  useEffect(() => {
    if (!onProcessingChange || processingDisabled) return;
    onProcessingChange(
      resolvedStatus.state === "QUEUED" || resolvedStatus.state === "EXECUTING",
    );
  }, [resolvedStatus.state, onProcessingChange, processingDisabled]);

  useEffect(() => {
    if (resolvedStatus.state !== "QUEUED") {
      return;
    }

    const interval = setInterval(() => {
      setMessageIndex((current) => (current + 1) % QUEUED_MESSAGES.length);
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [resolvedStatus.state]);

  useEffect(() => {
    if (resolvedStatus.state === "COMPLETED" && !processingDisabled) {
      mutateDocument?.();
    }
  }, [resolvedStatus.state, mutateDocument, processingDisabled]);

  if (processingDisabled || resolvedStatus.state === "COMPLETED") {
    return null;
  }

  if (resolvedStatus.state === "QUEUED" && !progressError) {
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
      resolvedStatus.state,
    )
  ) {
    return (
      <Progress
        value={0}
        text={
          progressError?.message ||
          resolvedStatus.text ||
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
      value={resolvedStatus.progress || 0}
      text={resolvedStatus.text || "Processing document..."}
      className={cn("w-full rounded-none text-[8px] font-semibold", className)}
    />
  );
}
