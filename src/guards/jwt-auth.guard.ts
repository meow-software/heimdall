import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) return false;

    const token = auth.slice('Bearer '.length);

    try {
      const publicKey = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n') ?? 'dev_public_key';
      const payload = jwt.verify(token, publicKey, { algorithms: ['RS256', 'HS256'] });
      // @ts-ignore
      req.user = payload; // ex: { sub, email, role }
      return true;
    } catch {
      return false;
    }
  }
}