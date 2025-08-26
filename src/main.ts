import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { HttpExceptionFilter } from './filters/http-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Removes properties not defined in the DTO
      forbidNonWhitelisted: true, // Rejects the request if non-whitelisted properties are present
      transform: true, // Transforms payloads into class instances
      transformOptions: {
        enableImplicitConversion: true, // Enables automatic type conversion
      },
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(process.env.HEIMDALL_PORT ?? 3000);
}
bootstrap();
