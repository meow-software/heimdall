import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategy.service';
import { JwtModule } from '@nestjs/jwt';
import { RedisClientService } from 'src/redis/redis-client/redis-client.service';

@Module({
  imports : [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RedisClientService]
})
export class AuthModule {}
