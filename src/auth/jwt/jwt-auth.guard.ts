// import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
// import { Request } from 'express';
// import * as jwt from 'jsonwebtoken';

// @Injectable()
// export class JwtAuthGuard implements CanActivate {
//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const req: Request = context.switchToHttp().getRequest();
//     const auth = req.headers['authorization'];
//     if (!auth || !auth.startsWith('Bearer ')) return false;

//     const token = auth.slice('Bearer '.length);

//     try {
//       const publicKey = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n') ?? 'dev_public_key';
//       const payload = jwt.verify(token, publicKey, { algorithms: ['RS256', 'HS256'] });
//       // @ts-ignore
//       req.user = payload; // ex: { sub, email, role }
//       return true;
//     } catch {
//       return false;
//     }
//   }
// }
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    // Exemple : Gestion personnalisée des erreurs
    handleRequest(err: any, user: any, info: any, context: any, status: any) {
        if (err || !user) {
            throw new UnauthorizedException('Token invalide ou expiré');
        }
        return user;
    }

    // Exemple : Logging
    canActivate(context: ExecutionContext) {
        console.log('JWT Guard activé');
        return super.canActivate(context);
    }
}
