import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { SignupDto } from './dto/signupDto';
import { SigninDto } from './dto/signinDto';
import { AuthService } from './auth.service';
import { ResetPasswordDemandDto } from './dto/resetPasswordDemandDto';
import { ResetPasswordConfirmationDto } from './dto/resetPasswordConfirmationDto';
import { DeleteAccounDto } from './dto/deleteAccounDto';

import { MessagePattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {

    constructor(private readonly authService: AuthService) { }

    @Post('register')
    async signup(@Body() signupDto: SignupDto) {
        return this.authService.signup(signupDto);
    }

    @Post('login')
    async signin(@Body() signinDto: SigninDto) {
        return this.authService.signin(signinDto);
    }

    @Post('reset-password')
    async resetPasswordDemand(@Body() resetPasswordDemandDto: ResetPasswordDemandDto) {
        return this.authService.resetPasswordDemand(resetPasswordDemandDto);
    }

    @Post('reset-password-confirmation')
    async resetPasswordConfirmation(@Body() resetPasswordConfirmationDto: ResetPasswordConfirmationDto) {
        return this.authService.resetPasswordConfirmation(resetPasswordConfirmationDto);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete('delete-account')
    async deleteAccount(@Req() request, @Body() deleteAccounDto: DeleteAccounDto) {
        const userId = request.user['userId'];
        return this.authService.deleteAccount(userId, deleteAccounDto);
    }


    @UseGuards(AuthGuard('jwt'))
    @Get('whoami')
    async whoAmI(@Req() request) {
        return this.authService.getUserInfo(request.user['userId']);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('me')
    async me(@Req() request) {
        return this.authService.getUserInfo(request.user['userId']);
    }
}
