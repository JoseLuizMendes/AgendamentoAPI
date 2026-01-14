import { Redis } from "ioredis";

let redisSingleton: Redis | null = null;

export function getRedisConnection(): Redis {
  const redisUrl = process.env["REDIS_URL"] ?? "redis://localhost:6379";

  if (!redisSingleton) {
    redisSingleton = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
    });
  }

  return redisSingleton;
}

export function getRedisUrl(): string {
  return process.env["REDIS_URL"] ?? "redis://localhost:6379";
}
