import React from "react";

import { EyeIcon } from "lucide-react";

import { isDocumentProcessingDisabled } from "@/lib/documents/processing-flags";

import { ButtonTooltip } from "../ui/tooltip";
import { Button } from "../ui/button";
import { DocumentPreviewModal } from "./document-preview-modal";

interface DocumentPreviewButtonProps {
  documentId: string;
  primaryVersion?: {
    hasPages?: boolean;
    type?: string | null;
    numPages?: number | null;
  };
  isProcessing?: boolean;
  variant?: "ghost" | "outline" | "default" | "secondary";
  size?: "sm" | "default" | "lg" | "icon";
  children?: React.ReactNode;
  className?: string;
  showTooltip?: boolean;
}

export function DocumentPreviewButton({
  documentId,
  primaryVersion,
  isProcessing = false,
  variant = "ghost",
  size = "icon",
  children,
  className,
  showTooltip = true,
}: DocumentPreviewButtonProps) {
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const processingDisabled = isDocumentProcessingDisabled;

  const derivedProcessing =
    !processingDisabled &&
    (isProcessing ||
      (!!primaryVersion &&
        ["pdf", "docs", "slides", "cad"].includes(
          primaryVersion.type || "",
        ) &&
        !primaryVersion.hasPages));

  const supportsPreview = () => {
    if (!primaryVersion) return true;
    if (processingDisabled) return true;
    if (primaryVersion.hasPages) return true;
    if (primaryVersion.type === "image") return true;
    return false;
  };

  if (!supportsPreview()) {
    return null;
  }

  const handlePreviewClick = (
    e?: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e?.stopPropagation();
    e?.preventDefault();

    if (derivedProcessing) return;
    setIsPreviewOpen(true);
  };

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={handlePreviewClick}
      disabled={derivedProcessing}
      className={className}
    >
      {children || (
        <>
          <EyeIcon className="h-4 w-4" />
          {size !== "icon" && <span className="ml-1">Preview</span>}
        </>
      )}
    </Button>
  );

  const wrappedButton = showTooltip ? (
    <ButtonTooltip
      content={
        derivedProcessing ? "Preview will be ready soon" : "Quick preview of document"
      }
    >
      {button}
    </ButtonTooltip>
  ) : (
    button
  );

  return (
    <>
      {wrappedButton}
      <DocumentPreviewModal
        documentId={documentId}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </>
  );
}

export default DocumentPreviewButton;

// Helper function to check if document is processing
export function isDocumentProcessing(primaryVersion?: {
  hasPages?: boolean;
  type?: string | null;
  numPages?: number | null;
}) {
  if (isDocumentProcessingDisabled) return false;
  if (!primaryVersion) return false;

  const shouldHavePages = ["pdf", "docs", "slides", "cad"].includes(
    primaryVersion.type || "",
  );

  return shouldHavePages && !primaryVersion.hasPages;
}
