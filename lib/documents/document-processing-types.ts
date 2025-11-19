export type DocumentProcessingState = "PROCESSING" | "READY" | "FAILED";

export interface DocumentProcessingStatus {
  state: DocumentProcessingState;
  message: string;
  terminal: boolean;
}
