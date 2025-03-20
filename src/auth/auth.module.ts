import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';

import { CommonModule, JwtStrategy, MailerService, SnowflakeGenerator, SnowflakeService } from '@tellme/common';
import { RedisModule, RepositoryModule } from '@tellme/shared';

@Module({ 
  imports : [JwtModule.register({}), CommonModule, RedisModule, RepositoryModule], 
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MailerService, SnowflakeService]
})
export class AuthModule {}
