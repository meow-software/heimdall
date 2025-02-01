import { Module } from '@nestjs/common';
import { AppController } from './app.controller'; 
import * as dotenv from 'dotenv'; 
import { ConfigModule } from '@nestjs/config';  
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { MailerModule } from './mailer/mailer.module';

import { RedisClientService } from './redis/redis-client/redis-client.service'; 
dotenv.config(); 
@Module({
  imports: [
    ConfigModule.forRoot({isGlobal : true}), 
    AuthModule,
    PrismaModule, 
    MailerModule,
  ],
  controllers: [AppController],
  providers: [RedisClientService],
})
export class AppModule {}
