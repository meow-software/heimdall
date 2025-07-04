import { Injectable } from '@nestjs/common';
import { ConflictException, NotFoundException, UnauthorizedException } from "@nestjs/common/exceptions";
import * as speakeasy from "speakeasy";
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthDecodePayload, AuthPayload, MailerService , SnowflakeService} from '@tellme/common';
import { AuthCacheService, DeleteAccounDto, ResetPasswordConfirmationDto, ResetPasswordDemandDto, SigninDto, SignupDto, UserEntity, UserRepository} from '@tellme/shared';


@Injectable()
export class AuthService {
    private readonly TTL: number;
    private readonly JWT_SECRET_KEY;

    constructor(
        private readonly mailerService: MailerService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly authCacheService: AuthCacheService,
        private readonly UserRepository: UserRepository,
        private readonly snowflakeService: SnowflakeService

    ) {
        this.TTL = parseInt(this.configService.get("JWT_EXPIRES_IN", "3600"));
        this.JWT_SECRET_KEY  = this.configService.get("SECRET_KEY");
    }

    /**
     * Registers a new user
     * @param signupDto - User signup data
     * @returns Confirmation message
     */
    async signup(signupDto: SignupDto) {
        const { email, password, username } = signupDto;
        // Check if user is already registered
        let user = await this.UserRepository.findUnique({ where: { email } });
        if (user) return new ConflictException("User already exists");
        // Register user
        user = await UserEntity.new(this.snowflakeService, username, email, password);
        await this.UserRepository.create(user);
        // Send a confirmation email
        await this.mailerService.sendSignupConfirmation(email);
        return { data: `User successfully created` };
    }

    /**
     * Authenticates a user
     * @param signinDto - User credentials
     * @returns JWT token and user info
     */
    async signin(signinDto: SigninDto) {
        const { email, password } = signinDto;
        // Check if user is already registered
        const user = await this.UserRepository.findUnique({ where: { email } });
        if (!user) return new NotFoundException("User not found");
        // Compare password
        const match = user.checkPassword(password);
        if (!match) return new UnauthorizedException("Password does not match");
        // Returns a jwt token
        const payload: AuthPayload = {
            sub: user.id,
            userId: user.id,
            email: user.email
        }
        const token = this.jwtService.sign(payload, {
            expiresIn: this.TTL,
            secret: this.JWT_SECRET_KEY,
        });
        // Add token in redis cache
        this.authCacheService.storeToken(user.id, token);

        return {
            token, user: {
                username: user.username,
                email: user.email,
            }
        };
    }

    /**
     * Refreshes an expired JWT token
     * @param oldToken - Expired JWT token
     * @returns New JWT token
     */
    async refreshToken(oldToken: string) {
        
        // Verify jwt
        let decodePayload: AuthDecodePayload;
        try {
            decodePayload = this.jwtService.verify(oldToken, {
                ignoreExpiration: true, 
                secret: this.JWT_SECRET_KEY
            }) as AuthDecodePayload; 
            if (!decodePayload) throw new UnauthorizedException("Invalid token");
        } catch (error) {
            return new UnauthorizedException("Invalid token");
        }
        // No need to check if the JWT token is stored in Redis — it most likely expired.
        // We already verify that it was properly signed by us, which makes it legitimate.

        // Check expiration5 minutes
        const currentTime = Math.floor(Date.now() / 1000); 
        if (decodePayload.exp < currentTime - 300) { // 300s = 5 minutes
            return new UnauthorizedException("The token has expired too long ago, login please.");
        }

        // We don't check if the user still exists, requests won't go through anyway

        // Returns a jwt token
        const payload: AuthPayload = {
            sub: decodePayload.userId,
            userId: decodePayload.userId,
            email: decodePayload.email
        }

        // Generate new token jwt
        const newToken = this.jwtService.sign(payload, {
            expiresIn: this.TTL,
            secret: this.JWT_SECRET_KEY,
        });

        // Update redis cash token
        
        this.authCacheService.updateToken(decodePayload.userId, oldToken, newToken);

        return { refreshToken : newToken };
    }


    /**
     * Initiates a password reset process
     * @param resetPasswordDemandDto - User email for password reset
     * @returns Confirmation message
     */
    async resetPasswordDemand(resetPasswordDemandDto: ResetPasswordDemandDto) {
        const { email } = resetPasswordDemandDto;
        const user = await this.UserRepository.findUnique({ where: { email } });
        if (!user) return new NotFoundException("User not found");
        const code = speakeasy.totp({
            secret: this.configService.get("OTP_SECRET_CODE"),
            digits: 5,
            step: this.configService.get("OTP_STEP_TIME"), // Time step in seconds
            encoding: "base32",
        });
        const url = `${this.configService.get("HOST")}:${this.configService.get("HEIMDALL_SERVICE_API_GATEWAY_PORT")}/auth/reset-password-confirmation`;
        await this.mailerService.sendResetPassword(email, url, code);
        return { data: "Reset password mail has been sent" };
    }

    /**
     * Confirms a password reset
     * @param resetPasswordConfirmationDto - Password reset data
     * @returns Confirmation message
     */
    async resetPasswordConfirmation(resetPasswordConfirmationDto: ResetPasswordConfirmationDto) {
        const { code, email, password } = resetPasswordConfirmationDto;
        const user = await this.UserRepository.findUnique({ where: { email } });
        if (!user) return new NotFoundException("User not found");
        const match = speakeasy.totp.verify({
            secret: this.configService.get("OTP_SECRET_CODE"),
            token: code,
            digits: 5,
            step: this.configService.get("OTP_STEP_TIME"), // Time step in seconds
            encoding: "base32",
        });
        if (!match) return new UnauthorizedException("Invalid/expired token");
        user.editPassword(password);
        await this.UserRepository.update(user.id, {password : user.password});
        return { data: "Password updated" };
    }

    async deleteAccount(userId: string, deleteAccounDto: DeleteAccounDto) {
        const { password } = deleteAccounDto;
        const user = await this.UserRepository.findUnique({ where: { id: userId } });
        if (!user) return new NotFoundException("User not found");
        const match = await user.checkPassword(password);
        if (!match) return new UnauthorizedException("Password does not match");
        
        await this.UserRepository.delete(user.id);
        this.authCacheService.removeAllToken(user.id);

        // Emit event user deleted
        // Todo
        return { data: "User successfully deleted" };
    }

    async validateUser(email: string) {
        return await this.UserRepository.findUnique({ where: { email: email } });
    }

    async getUserInfo(userId: string) {
        console.log("getUserInfo", userId);
        const user = await this.UserRepository.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
            }
        });

        if (!user) throw new NotFoundException('User not found');
        return user;
    }
} 