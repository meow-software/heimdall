import { Module } from '@nestjs/common';
import { AppController } from './app.controller'; 
import * as dotenv from 'dotenv'; 
import { ConfigModule, ConfigService } from '@nestjs/config';  
import { AuthModule } from './auth/auth.module';
import { CommonModule } from '@tellme/common';


dotenv.config(); 
@Module({
  imports: [
    ConfigModule.forRoot({isGlobal : true}), 
    CommonModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
