import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * JWT Strategy for authentication in the API Gateway.
 * 
 * This strategy validates JWT tokens using RS256 algorithm with a public key.
 * It extracts the token from the Authorization header and verifies its signature
 * and expiration. The validated payload is attached to the request object as `req.user`.
 * 
 * @example
 * // Usage in controller:
 * @UseGuards(AuthGuard('jwt'))
 * @Get('protected-route')
 * getProtectedData() { ... }
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Initializes the JWT strategy with configuration from environment variables.
   * 
   * @throws {Error} If JWT_PUBLIC_KEY is not defined in environment variables
   * 
   * @remarks
   * - Requires JWT_PUBLIC_KEY environment variable containing the RSA public key
   * - Automatically converts escaped newlines (\n) to actual newlines for proper key formatting
   * - Uses RS256 algorithm for asymmetric encryption verification
   * - Tokens are extracted from the Authorization header as Bearer tokens
   * - Token expiration is validated (not ignored)
   */
  constructor() {
    // Retrieve and format the public key from environment variables
    const publicKey = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
    
    if (!publicKey) {
      throw new Error(
        'Missing JWT_PUBLIC_KEY for RS256 verification in Gateway. ' +
        'This key is required to validate JWT token signatures. ' +
        'Ensure the public key is properly configured in your environment variables.'
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: publicKey,
      algorithms: ['RS256'],
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    return payload; // will be attached to req.user
  }
}