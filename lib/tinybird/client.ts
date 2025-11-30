import { Tinybird } from "@chronark/zod-bird";

export class TinybirdUnauthorizedError extends Error {
  constructor(message = "Tinybird unauthorized") {
    super(message);
    this.name = "TinybirdUnauthorizedError";
  }
}

export const tinybirdClient = new Tinybird({
  token: process.env.TINYBIRD_TOKEN!,
});

export async function callTinybird<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = error?.response?.status ?? error?.status;
    const message = String(error?.message ?? "");

    if (status === 401 || status === 403 || message.includes("Unauthorized")) {
      throw new TinybirdUnauthorizedError(
        message || "Tinybird unauthorized",
      );
    }

    throw error;
  }
}

// Note: To enable full analytics (durations, completion, etc.) the deployment
// must be configured with a valid Tinybird token and the expected Tinybird
// pipes. When Tinybird is not authorized, API routes will gracefully return
// zeroed analytics with analyticsEnabled=false.
