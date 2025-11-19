import { z } from "zod";

export const envSchema = z.object({
  SLACK_APP_INSTALL_URL: z.string(),
  SLACK_CLIENT_ID: z.string(),
  SLACK_CLIENT_SECRET: z.string(),
  SLACK_INTEGRATION_ID: z.string(),
  SLACK_SIGNING_SECRET: z.string().optional(),
});

type SlackEnv = z.infer<typeof envSchema>;

let env: SlackEnv | null | undefined;

export const getSlackEnv = (): SlackEnv | null => {
  if (env !== undefined) {
    return env;
  }

  const rawEnv: Partial<SlackEnv> = {
    SLACK_APP_INSTALL_URL: process.env.SLACK_APP_INSTALL_URL,
    SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID,
    SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET,
    SLACK_INTEGRATION_ID: process.env.SLACK_INTEGRATION_ID,
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
  };

  const requiredKeys: (keyof SlackEnv)[] = [
    "SLACK_APP_INSTALL_URL",
    "SLACK_CLIENT_ID",
    "SLACK_CLIENT_SECRET",
    "SLACK_INTEGRATION_ID",
  ];

  const missing = requiredKeys.filter((key) => !rawEnv[key]);

  if (missing.length > 0) {
    console.warn(
      `[Slack] Slack integration is not configured. Missing env vars: ${missing.join(", ")}`,
    );
    env = null;
    return env;
  }

  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    console.warn(
      `[Slack] Slack environment variables are invalid: ${parsed.error.message}`,
    );
    env = null;
    return env;
  }

  env = parsed.data;
  return env;
};
