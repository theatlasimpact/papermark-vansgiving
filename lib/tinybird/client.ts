import { Tinybird } from "@chronark/zod-bird";

export class TinybirdUnauthorizedError extends Error {
  constructor(message = "Tinybird unauthorized") {
    super(message);
    this.name = "TinybirdUnauthorizedError";
  }
}

export type TinybirdResult<T> =
  | { ok: true; data: T; unauthorized: false; error?: undefined }
  | { ok: false; unauthorized: boolean; error?: unknown; data?: undefined };

export const tinybirdHost =
  process.env.TINYBIRD_HOST || "https://api.us-east.tinybird.co";
export const tinybirdReadToken =
  process.env.TINYBIRD_READ_TOKEN || process.env.TINYBIRD_TOKEN || "";
export const tinybirdWriteToken =
  process.env.TINYBIRD_WRITE_TOKEN ||
  process.env.TINYBIRD_TOKEN ||
  tinybirdReadToken;

export const tinybirdClient = new Tinybird({
  token: tinybirdReadToken,
  baseUrl: tinybirdHost,
});

export const tinybirdIngestClient = new Tinybird({
  token: tinybirdWriteToken,
  baseUrl: tinybirdHost,
});

export async function callTinybird<T>(
  fn: () => Promise<T>,
): Promise<TinybirdResult<T>> {
  if (!tinybirdReadToken) {
    return {
      ok: false,
      unauthorized: true,
      error: new TinybirdUnauthorizedError(
        "Tinybird read token not configured",
      ),
    };
  }

  try {
    const data = await fn();
    return { ok: true, data, unauthorized: false };
  } catch (error: any) {
    const status = error?.response?.status ?? error?.status;
    const message = String(error?.message ?? "");

    if (status === 401 || status === 403 || message.includes("Unauthorized")) {
      return { ok: false, unauthorized: true, error };
    }

    return { ok: false, unauthorized: false, error };
  }
}

// Note: To enable full analytics (durations, completion, etc.) the deployment
// must be configured with a valid Tinybird host and token(s). When Tinybird is
// not authorized, API routes will gracefully return zeroed analytics with
// analyticsEnabled=false.
