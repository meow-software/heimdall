import { Test, TestingModule } from '@nestjs/testing';
import { ProxyController } from './proxy.controller';
import { ModuleRef } from '@nestjs/core';
import { DynamicRateLimitGuard } from '../guards/dynamic-rate-limit.guard';
import { NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

class MockGuard { }
// Mock the routes configuration
jest.mock('../routes/routes.config', () => ({
  routes: [
    {
      method: 'GET',
      path: '/users/:id',
      target: { host: 'http://user-service', path: '/users/:id' },
      guards: [],
      rateLimit: { limit: 10, ttl: 60 },
    },
    {
      method: 'POST',
      path: '/products',
      target: { host: 'http://product-service', path: '/items' },
      guards: [() => MockGuard],
    },
  ],
}));

describe('ProxyController', () => {
  let controller: ProxyController;
  let moduleRef: ModuleRef;
  let rateLimitGuard: DynamicRateLimitGuard;

  const mockRequest = (method: string, path: string, params = {}) =>
  ({
    method,
    path,
    params,
    headers: {},
    get: (name: string) => {
      if (name === 'host') return 'localhost';
      return undefined;
    },
  } as unknown as Request);

  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    res.writeHead = jest.fn();
    return res as Response;
  };

  const mockNext = () => jest.fn() as NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyController],
      providers: [
        {
          provide: ModuleRef,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: DynamicRateLimitGuard,
          useValue: {
            canActivate: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<ProxyController>(ProxyController);
    moduleRef = module.get<ModuleRef>(ModuleRef);
    rateLimitGuard = module.get<DynamicRateLimitGuard>(DynamicRateLimitGuard);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('proxy', () => {
    it('should throw NotFoundException for an unknown route', async () => {
      const req = mockRequest('GET', '/api/unknown');
      const res = mockResponse();
      const next = mockNext();

      await expect(controller.proxy(req, res, next, 'unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw an error if rate limit guard fails', async () => {
      jest
        .spyOn(rateLimitGuard, 'canActivate')
        .mockRejectedValue(new HttpException('Too Many Requests', 429));
      const req = mockRequest('GET', '/api/users/123');
      const res = mockResponse();
      const next = mockNext();

      await expect(
        controller.proxy(req, res, next, 'users/123'),
      ).rejects.toThrow(new HttpException('Too Many Requests', 429));
    });

    it('should throw an error if a custom guard fails', async () => {
      const mockGuard = { canActivate: jest.fn().mockResolvedValue(false) };
      (moduleRef.get as jest.Mock).mockReturnValue(mockGuard);

      const req = mockRequest('POST', '/api/products');
      const res = mockResponse();
      const next = mockNext();

      await expect(
        controller.proxy(req, res, next, 'products'),
      ).rejects.toThrow(new HttpException('Forbidden', HttpStatus.FORBIDDEN));
    });
  });

  describe('getGuardInstance', () => {
    it('should return the instance if it is already an instance', async () => {
      const guardInstance = { canActivate: () => true };
      const result = await controller['getGuardInstance'](guardInstance);
      expect(result).toBe(guardInstance);
    });

    it('should get the guard from moduleRef if it is a class', async () => {
      class MyGuard { }
      const guardInstance = { canActivate: () => true };
      (moduleRef.get as jest.Mock).mockReturnValue(guardInstance);
      // @ts-ignore
      const result = await controller['getGuardInstance'](MyGuard);
      expect(result).toBe(guardInstance);
      expect(moduleRef.get).toHaveBeenCalledWith(MyGuard, { strict: false });
    });
  });
});