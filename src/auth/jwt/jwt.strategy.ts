import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

type JwtAlg = 'RS256' | 'HS256';

function readEnv(key: string): string {
    const v = process.env[key];
    return typeof v === 'string' ? v : '';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        const alg = (readEnv('JWT_ALG') || 'RS256') as JwtAlg;

        let secretOrKey: string;
        if (alg === 'RS256') {
            const raw = readEnv('JWT_PUBLIC_KEY');
            // Remplace les \n échappés par de vrais sauts de ligne
            const pk = raw.replace(/\\n/g, '\n');
            if (!pk) {
                throw new Error('Missing JWT_PUBLIC_KEY (required for RS256).' +
                    'Set JWT_ALG=HS256 and JWT_SECRET to use HS256 in dev.'
                );
            }
            secretOrKey = pk;
        } else {
            const secret = readEnv('JWT_SECRET');
            if (!secret) {
                throw new Error('JWT_SECRET manquant (nécessaire pour HS256).');
            }
            secretOrKey = secret;
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey,                 
            algorithms: [alg],           
            ignoreExpiration: false,
        });
    }

    async validate(payload: any) {
        // Payload validé → sera injecté dans req.user
        return payload;
    }
}
