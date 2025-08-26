import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    console.log("--Admin guard active")
    const req = context.switchToHttp().getRequest();
    return req.user?.role === 'admin';
  }
}
