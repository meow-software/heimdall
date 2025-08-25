import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ProxyController } from './controllers/proxy.controller';
import { DynamicRateLimitGuard } from './guards/dynamic-rate-limit.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/role.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),  
  ],
  controllers: [AppController, ProxyController],
  providers: [
    AppService, 
    JwtAuthGuard,
    AdminGuard,
    DynamicRateLimitGuard
  ],
})
export class AppModule {}
