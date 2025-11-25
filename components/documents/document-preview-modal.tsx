import { useTeam } from "@/context/team-context";
import { XIcon } from "lucide-react";
import useSWRImmutable from "swr/immutable";
import { toast } from "sonner";

import { fetcher } from "@/lib/utils";
import { useDocumentPreview } from "@/lib/swr/use-document-preview";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import LoadingSpinner from "@/components/ui/loading-spinner";

import { PreviewViewer } from "./preview-viewers/preview-viewer";

interface DocumentPreviewModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentPreviewModal({
  documentId,
  isOpen,
  onClose,
}: DocumentPreviewModalProps) {
  const { currentTeam } = useTeam();
  const teamId = currentTeam?.id;
  const {
    document: documentData,
    loading,
    error,
  } = useDocumentPreview(documentId, isOpen);

  const { data: overview } = useSWRImmutable<Record<string, any>>(
    isOpen && teamId
      ? `/api/teams/${teamId}/documents/${documentId}/overview`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const fallbackFileUrl =
    overview?.versions?.[0]?.originalFile ||
    overview?.versions?.[0]?.file ||
    overview?.originalFile ||
    overview?.file;

  const handleClose = () => {
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose();
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    // Prevent clicks from propagating to underlying elements
    e.stopPropagation();
  };

  const handleOpenOriginal = () => {
    if (fallbackFileUrl) {
      window.open(fallbackFileUrl, "_blank");
    } else {
      toast.error(
        "Original file unavailable. Please re-upload and retry preview.",
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="h-[99vh] w-[90%] rounded-lg bg-gray-900 p-0 data-[state=open]:slide-in-from-bottom-0 md:w-[80vw] md:max-w-[80vw]"
        onKeyDown={handleKeyDown}
        onClick={handleContentClick}
        isPreviewDialog
      >
        {/* Header with close button */}
        <div className="absolute right-4 top-4 z-50 flex gap-2">
          {fallbackFileUrl ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenOriginal}
              className="rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              Open original file
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 rounded-full bg-black/20 text-white hover:bg-black/40"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
              <LoadingSpinner className="mx-auto h-8 w-8 text-white" />
              <p className="mt-2 text-sm text-gray-400">Loading preview...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex h-full w-full items-center justify-center">
            <div className="space-y-3 text-center">
              <p className="text-red-400">
                {(error as Error).message || "Failed to load document preview"}
              </p>
              <p className="text-sm text-gray-400">
                Trigger.dev preview runners might be idle. You can still open
                the original file below.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleOpenOriginal}
                disabled={!fallbackFileUrl}
              >
                {fallbackFileUrl ? "Open original" : "Original unavailable"}
              </Button>
            </div>
          </div>
        )}

        {/* Document preview */}
        {documentData && !loading && !error && (
          <PreviewViewer documentData={documentData} onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}
