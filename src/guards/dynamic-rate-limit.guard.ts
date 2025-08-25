import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
/**
 * Guard that applies dynamic rate limiting using Redis and Lua scripting.
 * 
 * The guard uses a Lua script to ensure atomic operations in Redis for:
 * - Incrementing request counters
 * - Handling TTL (time-to-live) for request windows
 * - Blocking users temporarily if they exceed the limit
 * 
 * This allows fine-grained rate limiting per route and user/IP configuration.
 */
export class DynamicRateLimitGuard implements CanActivate {
  private rateLimitScript: string;

  constructor(private redisService: RedisService) {
    /**
     * Lua script for atomic rate limiting in Redis.
     * 
     * Behavior:
     * - Initializes a record if it does not exist
     * - Resets the counter if expired
     * - Increments the counter for each request
     * - Blocks the user if they exceed the limit
     * - Stores and updates the record with proper TTL
     */
    this.rateLimitScript = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local ttl = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])

      local data = redis.call('GET', key)
      local record

      if data then
          record = cjson.decode(data)
      else
          record = {count=0, expiresAt=now+ttl, blockExpiresAt=0}
      end

      -- Check if user is currently blocked
      if record.blockExpiresAt > now then
          return cjson.encode({blocked=true, count=record.count})
      end

      -- Reset counter if window expired
      if record.expiresAt <= now then
          record.count = 0
          record.expiresAt = now + ttl
      end

      -- Increment request count
      record.count = record.count + 1

      -- Check limit
      if record.count > limit then
          record.blockExpiresAt = now + ttl
          redis.call('SETEX', key, ttl * 2, cjson.encode(record))
          return cjson.encode({blocked=true, count=record.count})
      end

      -- Save updated record with remaining TTL
      local remainingTtl = record.expiresAt - now
      redis.call('SETEX', key, remainingTtl, cjson.encode(record))
      return cjson.encode({blocked=false, count=record.count, expiresAt=record.expiresAt})
    `;
  }

  /**
   * Checks if the request can pass through the rate limiting guard.
   * 
   * @param ctx - The execution context containing the HTTP request
   * @returns {Promise<boolean>} - True if request is allowed, otherwise throws an exception
   * @throws {HttpException} - If the request exceeds the rate limit
   */
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const routeConfig = (req as any).matchedRoute;

    // If no rate limiting configuration is found, allow request
    if (!routeConfig?.rateLimit) return true;

    // Generate Redis key depending on configuration (by user, IP, or both)
    let key: string;
    const endKey = `${req.user?.id || 'anonymous'}:${routeConfig.path}`;
    switch (routeConfig.rateLimit.keyBy) {
      case 'user':
        // Rate limit by user ID
        // @ts-ignore
        key = `rate_limit:user:` + endKey;
        break;
      case 'ip+user':
        // Rate limit by combination of IP and user ID
        // @ts-ignore
        key = `rate_limit:ipuser:` + endKey;
        break;
      default: // 'ip'
        // Rate limit by IP only
        key = `rate_limit:ip:` + endKey;
    }

    const ttl = routeConfig.rateLimit.ttl;     // Time window in seconds
    const limit = routeConfig.rateLimit.limit; // Maximum allowed requests
    const now = Math.floor(Date.now() / 1000); // Current time in seconds

    // Execute Lua script atomically in Redis
    const redis = this.redisService.getClient();
    const rawResult = await redis.eval(
      this.rateLimitScript,
      1, // number of keys
      key,
      limit,
      ttl,
      now
    ) as string;

    const result = JSON.parse(rawResult) as {
      expiresAt: number;
      count: number;
      blocked: boolean;
    };

    const { blocked, count, expiresAt } = result;
    // console.log("Rate limit check:", blocked, count, expiresAt);

    // If blocked, throw HTTP 429 (Too Many Requests)
    if (blocked) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
