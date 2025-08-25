import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { RedisService } from '../src/redis/redis.service';


describe('AppController (e2e)', () => {
  let app: INestApplication;
  let redisService: RedisService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    redisService = moduleFixture.get<RedisService>(RedisService);
    await app.init();
  });

  afterEach(async () => {
    // Fermer proprement l'application et Redis
    if (app) {
      await app.close();
    }
  });

  afterAll(async () => {
    // S'assurer que toutes les connexions sont fermées
    const redisClient = redisService.getClient();
    if (redisClient && redisClient.status !== 'end') {
      await redisClient.disconnect();
    }
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/ping')
      .expect(200)
      .expect('Pong!');
  });
});
