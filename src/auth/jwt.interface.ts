
export interface AuthPayload {
    sub: number;
    userId: number;
    email: string;
  }
  
export interface AuthDecodePayload extends AuthPayload{
    iat: number;
    exp: number;
}
  