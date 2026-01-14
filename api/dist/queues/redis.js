import { Redis } from "ioredis";
let redisSingleton = null;
export function getRedisConnection() {
    const redisUrl = process.env["REDIS_URL"] ?? "redis://localhost:6379";
    if (!redisSingleton) {
        redisSingleton = new Redis(redisUrl, {
            maxRetriesPerRequest: null,
        });
    }
    return redisSingleton;
}
export function getRedisUrl() {
    return process.env["REDIS_URL"] ?? "redis://localhost:6379";
}
//# sourceMappingURL=redis.js.map