import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';

import { CommonModule, JwtStrategy, MailerService } from '@tellme/common';

@Module({ 
  imports : [JwtModule.register({}), CommonModule], 
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MailerService]
})
export class AuthModule {}
