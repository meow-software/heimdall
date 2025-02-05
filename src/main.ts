import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { ValidationPipe } from '@nestjs/common';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule); 
  app.useGlobalPipes(new ValidationPipe())

  const port = process.env.HEIMDALL_SERVICE_API_GATEWAY_PORT ? parseInt(process.env.HEIMDALL_SERVICE_API_GATEWAY_PORT) : 3000;  
  const host = process.env.HOST || 'localhost'; 

  await app.listen(port);
  console.log(`Api gateway is listening on HTTP ${host}:${port}`);
}
bootstrap();
