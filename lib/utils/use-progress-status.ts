"use client";

import { useEffect, useMemo, useState } from "react";

import { type RunStatus } from "@trigger.dev/core/v3";
import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks";

import type { DocumentProcessingStatus } from "@/lib/documents/document-processing-types";
import { parseStatus } from "@/lib/utils/generate-trigger-status";

interface IDocumentProgressStatus {
  state: RunStatus;
  progress: number;
  text: string;
}

export function useDocumentProgressStatus(
  documentVersionId: string,
  publicAccessToken: string | undefined | null,
  snapshot?: DocumentProcessingStatus,
) {
  const { runs = [], error } = useRealtimeRunsWithTag(
    `version:${documentVersionId}`,
    {
      enabled: !!publicAccessToken,
      accessToken: publicAccessToken ?? undefined,
    },
  );

  const [terminalOverride, setTerminalOverride] =
    useState<IDocumentProgressStatus | null>(null);

  useEffect(() => {
    if (!snapshot) {
      setTerminalOverride(null);
      return;
    }

    if (snapshot.state === "READY") {
      setTerminalOverride({
        state: "COMPLETED",
        progress: 100,
        text: snapshot.message || "Ready to view.",
      });
      return;
    }

    if (snapshot.state === "FAILED") {
      setTerminalOverride({
        state: "FAILED",
        progress: 0,
        text: snapshot.message || "Preview unavailable.",
      });
      return;
    }

    setTerminalOverride(null);
  }, [snapshot]);

  const baseProcessingStatus = useMemo<IDocumentProgressStatus>(() => {
    if (snapshot?.state === "PROCESSING") {
      return {
        state: "EXECUTING",
        progress: 5,
        text: snapshot.message || "Processing document...",
      };
    }

    return {
      state: "QUEUED",
      progress: 0,
      text: "Initializing...",
    };
  }, [snapshot]);

  if (terminalOverride) {
    return { status: terminalOverride, error, run: runs[0] };
  }

  if (runs.length === 0) {
    return { status: baseProcessingStatus, error, run: undefined };
  }

  const activeRun = runs.find((run) =>
    ["QUEUED", "EXECUTING"].includes(run.status),
  );

  const status: IDocumentProgressStatus = {
    state: "QUEUED",
    progress: baseProcessingStatus.progress,
    text: baseProcessingStatus.text,
  };

  if (activeRun) {
    status.state = activeRun.status;
    if (activeRun.metadata) {
      const { progress, text } = parseStatus(activeRun.metadata);
      status.progress = progress;
      status.text = text;
    }
    return { status, error, run: activeRun };
  }

  const failedRun = runs.find((run) =>
    ["FAILED", "CRASHED", "CANCELED", "SYSTEM_FAILURE"].includes(
      run.status,
    ),
  );

  if (failedRun) {
    status.state = failedRun.status;
    if (failedRun.metadata) {
      const { progress, text } = parseStatus(failedRun.metadata);
      status.progress = progress;
      status.text = text;
    } else {
      status.progress = 0;
      status.text = "Error processing document.";
    }
    return { status, error, run: failedRun };
  }

  const allCompleted = runs.every((run) => run.status === "COMPLETED");
  if (allCompleted) {
    status.state = "COMPLETED";
    status.progress = 100;
    status.text = "Processing complete";
  }

  return {
    status,
    error,
    run: runs[0],
  };
}
