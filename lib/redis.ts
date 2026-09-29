import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasRedis = Boolean(redisUrl && redisToken);

const lockerUrl = process.env.UPSTASH_REDIS_REST_LOCKER_URL;
const lockerToken = process.env.UPSTASH_REDIS_REST_LOCKER_TOKEN;
const hasLocker = Boolean(lockerUrl && lockerToken);

// Upstash is optional. A missing client must not crash login or email
// verification. Calls no-op until the env vars are set.
function disabledRedis() {
  return new Proxy(
    {},
    {
      get() {
        return async () => null;
      },
    },
  ) as Redis;
}

export const redis: Redis = hasRedis
  ? new Redis({ url: redisUrl as string, token: redisToken as string })
  : disabledRedis();

export const lockerRedisClient: Redis = hasLocker
  ? new Redis({ url: lockerUrl as string, token: lockerToken as string })
  : disabledRedis();

// Create a new ratelimiter, that allows 10 requests per 10 seconds by default
export const ratelimit = (
  requests: number = 10,
  seconds:
    | `${number} ms`
    | `${number} s`
    | `${number} m`
    | `${number} h`
    | `${number} d` = "10 s",
) => {
  if (!hasRedis) {
    return {
      limit: async (_identifier: string) => ({
        success: true,
        limit: requests,
        remaining: requests,
        reset: Date.now(),
        pending: Promise.resolve(),
      }),
    };
  }

  return new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(requests, seconds),
    analytics: true,
    prefix: "atlas-impact",
  });
};
