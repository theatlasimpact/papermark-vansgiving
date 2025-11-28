import { getSlackEnv } from "./env";

const serverSideSlackConfigured =
  typeof window === "undefined" ? !!getSlackEnv() : false;

const clientSideSlackConfigured =
  process.env.NEXT_PUBLIC_SLACK_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_ENABLE_SLACK === "true";

export const slackIntegrationEnabled =
  serverSideSlackConfigured || clientSideSlackConfigured;
