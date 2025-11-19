import { NextApiRequest, NextApiResponse } from "next";

import { getDocumentProcessingStatus } from "@/lib/documents/get-document-processing-status";
import { generateTriggerPublicAccessToken } from "@/lib/utils/generate-trigger-auth-token";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { documentVersionId } = req.query;

  if (!documentVersionId || typeof documentVersionId !== "string") {
    return res.status(400).json({ error: "Document version ID is required" });
  }

  try {
    const processingStatus = await getDocumentProcessingStatus(documentVersionId);

    let publicAccessToken: string | null = null;

    try {
      publicAccessToken = await generateTriggerPublicAccessToken(
        `version:${documentVersionId}`,
      );
    } catch (tokenError) {
      console.warn("Unable to generate progress token", tokenError);
    }

    return res.status(200).json({
      publicAccessToken,
      processingStatus,
    });
  } catch (error) {
    console.error("Error generating token:", error);
    return res.status(500).json({ error: "Failed to resolve document status" });
  }
}
