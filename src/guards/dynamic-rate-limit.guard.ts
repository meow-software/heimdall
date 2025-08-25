import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class DynamicRateLimitGuard implements CanActivate {
  constructor() {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    return true;
  }
}