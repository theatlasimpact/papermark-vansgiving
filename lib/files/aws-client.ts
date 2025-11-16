import {
  type StorageConfig,
  getStorageConfig,
  getTeamStorageConfigById,
} from "@/ee/features/storage/config";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import { isS3UploadTransport } from "./upload-transport";

export const getS3Client = (storageRegion?: string) => {
  if (!isS3UploadTransport()) {
    throw new Error("S3 upload transport is disabled on this deployment.");
  }

  const config = getStorageConfig(storageRegion);

  return new S3Client({
    endpoint: config.endpoint || undefined,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
};

export const getS3ClientForTeam = async (teamId: string) => {
  if (!isS3UploadTransport()) {
    throw new Error("S3 upload transport is disabled on this deployment.");
  }

  const config = await getTeamStorageConfigById(teamId);

  return new S3Client({
    endpoint: config.endpoint || undefined,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
};

export const getLambdaClient = (storageRegion?: string) => {
  if (!isS3UploadTransport()) {
    throw new Error("S3 upload transport is disabled on this deployment.");
  }

  const config = getStorageConfig(storageRegion);

  return new LambdaClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
};

export const getLambdaClientForTeam = async (teamId: string) => {
  if (!isS3UploadTransport()) {
    throw new Error("S3 upload transport is disabled on this deployment.");
  }

  const config = await getTeamStorageConfigById(teamId);

  return new LambdaClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
};

/**
 * Gets both S3 client and storage config for a team in a single call.
 * This is more efficient than calling getS3ClientForTeam and getTeamStorageConfigById separately.
 *
 * @param teamId - The team ID
 * @returns Promise<{ client: S3Client, config: StorageConfig }> - Both client and config
 */
export const getTeamS3ClientAndConfig = async (teamId: string) => {
  if (!isS3UploadTransport()) {
    throw new Error("S3 upload transport is disabled on this deployment.");
  }

  const config = await getTeamStorageConfigById(teamId);

  const client = new S3Client({
    endpoint: config.endpoint || undefined,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return { client, config };
};
