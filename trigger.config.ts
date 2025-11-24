import { ffmpeg } from "@trigger.dev/build/extensions/core";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { defineConfig, timeout } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "papermark-vansgiving-uCzl",
  runtime: "node",
  triggerDirectories: ["./lib/trigger", "./trigger"],
  maxDuration: timeout.None,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true
    }
  },
  build: {
    extensions: [
      prismaExtension({
        schema: "prisma/schema/schema.prisma",
        mode: "legacy",
      }),
      ffmpeg()
    ]
  }
});
