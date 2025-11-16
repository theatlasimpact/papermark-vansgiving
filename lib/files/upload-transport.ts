export type UploadTransport = "s3" | "vercel" | (string & {});

const normalizedTransport = (
  process.env.NEXT_PUBLIC_UPLOAD_TRANSPORT ?? "s3"
).toLowerCase() as UploadTransport;

/**
 * Returns the configured upload transport.
 * Defaults to "s3" to preserve existing behavior when undefined.
 */
export const getUploadTransport = (): UploadTransport => normalizedTransport;

/** Returns true when uploads should go through S3/TUS. */
export const isS3UploadTransport = (): boolean => normalizedTransport === "s3";

/** Returns true when uploads should go through Vercel Blob. */
export const isVercelUploadTransport = (): boolean =>
  normalizedTransport === "vercel";
