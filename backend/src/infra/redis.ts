import Redis from "ioredis";

/**
 * Redis client configuration for production use.
 * 
 * Key settings:
 * - enableOfflineQueue: false - Prevents queuing commands when Redis is down.
 *   Commands fail fast instead of blocking, ensuring the app never waits on Redis.
 * - maxRetriesPerRequest: 1 - Low retry count to avoid blocking requests.
 *   Redis is best-effort only; failures must not impact application flow.
 * 
 * Philosophy: Redis is a performance optimization cache, never a hard dependency.
 * If Redis is unavailable, the app must continue working via PostgreSQL.
 */
export const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT
    ? Number(process.env.REDIS_PORT)
    : 6379,

  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});


redis.on("connect", () => {
    console.log("Redis Connected");
})

redis.on("error", (err) => {
    // NEVER CRASH THE APP IF REDIS IS NOT AVAILABLE. 
    console.error("Redis error: ", err.message);
})