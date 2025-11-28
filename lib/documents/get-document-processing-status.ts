import prisma from "@/lib/prisma";

import { isDocumentProcessingDisabled } from "./processing-flags";
import type { DocumentProcessingStatus } from "./document-processing-types";

const PROCESSABLE_TYPES = ["pdf", "docs", "slides", "cad"];

function requiresProcessing(type?: string | null) {
  if (!type) {
    return false;
  }
  return PROCESSABLE_TYPES.includes(type.toLowerCase());
}

function getProcessingTimeoutMs() {
  const minutes = Number(
    process.env.DOCUMENT_PROCESSING_TIMEOUT_MINUTES ?? "10",
  );
  const normalizedMinutes = Number.isFinite(minutes) ? minutes : 10;
  return normalizedMinutes * 60 * 1000;
}

export async function getDocumentProcessingStatus(
  documentVersionId: string,
): Promise<DocumentProcessingStatus> {
  if (isDocumentProcessingDisabled) {
    return {
      state: "READY",
      message: "Processing disabled; ready to view.",
      terminal: true,
    };
  }

  const version = await prisma.documentVersion.findUnique({
    where: { id: documentVersionId },
    select: {
      id: true,
      hasPages: true,
      createdAt: true,
      updatedAt: true,
      type: true,
      document: {
        select: {
          type: true,
        },
      },
    },
  });

  if (!version) {
    return {
      state: "FAILED",
      message: "Document version not found.",
      terminal: true,
    };
  }

  const detectedType = version.type ?? version.document?.type ?? undefined;

  if (!requiresProcessing(detectedType)) {
    return {
      state: "READY",
      message: "Ready to view.",
      terminal: true,
    };
  }

  if (version.hasPages) {
    return {
      state: "READY",
      message: "Ready to view.",
      terminal: true,
    };
  }

  const now = Date.now();
  const referenceTime = (version.updatedAt ?? version.createdAt).getTime();
  const timedOut = now - referenceTime > getProcessingTimeoutMs();

  if (timedOut) {
    return {
      state: "FAILED",
      message:
        "Preview processing is unavailable. The document will still open as a static file.",
      terminal: true,
    };
  }

  return {
    state: "PROCESSING",
    message: "Processing document...",
    terminal: false,
  };
}
