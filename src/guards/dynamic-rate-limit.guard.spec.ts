import { Test, TestingModule } from '@nestjs/testing';
import { DynamicRateLimitGuard } from './dynamic-rate-limit.guard';
import { RedisService } from '../redis/redis.service';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';


// Mock Redis client
const mockRedisClient = {
  eval: jest.fn(),
};

// Mock RedisService
const mockRedisService = {
  getClient: () => mockRedisClient,
};

// Mock ExecutionContext
const createMockExecutionContext = (config: any = {}) => {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: config.user !== undefined ? config.user : { id: 'user123' },
        ip: config.ip || '192.168.1.1',
        matchedRoute: config.matchedRoute || {
          path: '/test',
          rateLimit: {
            limit: 10,
            ttl: 60,
            keyBy: 'user'
          }
        }
      }),
    }),
  } as ExecutionContext;
};

describe('DynamicRateLimitGuard', () => {
  let guard: DynamicRateLimitGuard;
  let redisService: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamicRateLimitGuard,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    guard = module.get<DynamicRateLimitGuard>(DynamicRateLimitGuard);
    redisService = module.get<RedisService>(RedisService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true if no rate limit configuration', async () => {
      const context = createMockExecutionContext({
        matchedRoute: { path: '/test' } // No rateLimit config
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow request when under limit', async () => {
      const context = createMockExecutionContext();
      
      mockRedisClient.eval.mockResolvedValue(
        JSON.stringify({ blocked: false, count: 1, expiresAt: Date.now()/1000 + 60 })
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockRedisClient.eval).toHaveBeenCalled();
    });

    it('should throw HttpException when rate limit exceeded', async () => {
      const context = createMockExecutionContext();
      
      mockRedisClient.eval.mockResolvedValue(
        JSON.stringify({ blocked: true, count: 11 })
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS)
      );
    });

    it('should generate correct key for user-based rate limiting', async () => {
      const context = createMockExecutionContext({
        matchedRoute: {
          path: '/api/test',
          rateLimit: { limit: 10, ttl: 60, keyBy: 'user' }
        }
      });

      mockRedisClient.eval.mockResolvedValue(
        JSON.stringify({ blocked: false, count: 1, expiresAt: Date.now()/1000 + 60 })
      );

      await guard.canActivate(context);
      
      const callArgs = mockRedisClient.eval.mock.calls[0];
      expect(callArgs[2]).toBe('rate_limit:user:user123:/api/test');
    });

    it('should generate correct key for ip-based rate limiting', async () => {
      const context = createMockExecutionContext({
        matchedRoute: {
          path: '/api/test',
          rateLimit: { limit: 10, ttl: 60, keyBy: 'ip' }
        }
      });

      mockRedisClient.eval.mockResolvedValue(
        JSON.stringify({ blocked: false, count: 1, expiresAt: Date.now()/1000 + 60 })
      );

      await guard.canActivate(context);
      
      const callArgs = mockRedisClient.eval.mock.calls[0];
      expect(callArgs[2]).toBe('rate_limit:ip:user123:/api/test');
    });

    it('should generate correct key for ip+user rate limiting', async () => {
      const context = createMockExecutionContext({
        matchedRoute: {
          path: '/api/test',
          rateLimit: { limit: 10, ttl: 60, keyBy: 'ip+user' }
        }
      });

      mockRedisClient.eval.mockResolvedValue(
        JSON.stringify({ blocked: false, count: 1, expiresAt: Date.now()/1000 + 60 })
      );

      await guard.canActivate(context);
      
      const callArgs = mockRedisClient.eval.mock.calls[0];
      expect(callArgs[2]).toBe('rate_limit:ipuser:user123:/api/test');
    });

    it('should handle anonymous users', async () => {
      const context = createMockExecutionContext({
        user: null,
        matchedRoute: {
          path: '/api/test',
          rateLimit: { limit: 10, ttl: 60, keyBy: 'user' }
        }
      });

      mockRedisClient.eval.mockResolvedValue(
        JSON.stringify({ blocked: false, count: 1, expiresAt: Date.now()/1000 + 60 })
      );

      await guard.canActivate(context);
      
      const callArgs = mockRedisClient.eval.mock.calls[0];
      expect(callArgs[2]).toBe('rate_limit:user:anonymous:/api/test');
    });
  });

  describe('Error handling', () => {
    it('should handle Redis errors gracefully', async () => {
      const context = createMockExecutionContext();
      
      mockRedisClient.eval.mockRejectedValue(new Error('Redis error'));

      // Depending on your error handling strategy, you might want to:
      // 1. Allow the request (fail-open)
      // 2. Block the request (fail-closed)
      // 3. Throw a different exception
      
      // This test will need to be adjusted based on your error handling strategy
      await expect(guard.canActivate(context)).rejects.toThrow();
    });
  });
});