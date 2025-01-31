import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";  

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
    constructor(
        configService : ConfigService, 
    ) {
        super({
            jwtFromRequest : ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey : configService.get("SECRET_KEY"),
            ignoreExpiration : false,
        })
    } 

    async validate(payload: any) {
        // Payload -> token information (example, userId, email etc.)
        // we consider that the user exists and has not been deactivated, it is not my role to verify it, the token is legitimate that's all.
        return { userId: payload.sub, email: payload.email };
      }
}