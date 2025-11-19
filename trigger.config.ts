import { ffmpeg } from "@trigger.dev/build/extensions/core";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { defineConfig, timeout } from "@trigger.dev/sdk/v3";

export default defineConfig({
  // Use the project ref shown in your Trigger.dev dashboard:
  // Project settings → Project ref
  project: "proj_qvgnzxziyvafzroodbjg",

  // Where your jobs live
  dirs: ["./lib/trigger"],

  maxDuration: timeout.None, // no max duration
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  build: {
    extensions: [
      prismaExtension({
        schema: "prisma/schema/schema.prisma",
      }),
      ffmpeg(),
    ],
  },
});
