import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ProxyController } from './controllers/proxy.controller';
import { DynamicRateLimitGuard } from './guards/dynamic-rate-limit.guard';
import { RedisService } from './redis/redis.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),  
    AuthModule,
  ],
  controllers: [AppController, ProxyController],
  providers: [
    AppService, 
    DynamicRateLimitGuard,
    RedisService,
  ],
})
export class AppModule {}
