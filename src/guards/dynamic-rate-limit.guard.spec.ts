import { ThrottlerStorageService } from '@nestjs/throttler';
import { DynamicRateLimitGuard } from './dynamic-rate-limit.guard';

describe('DynamicRateLimitGuard', () => {
  it('should be defined', () => {
    expect(new DynamicRateLimitGuard(new ThrottlerStorageService())).toBeDefined();
  });
});
