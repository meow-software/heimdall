import {
    Controller,
    All,
    Req,
    Res,
    Next,
    NotFoundException,
    Inject,
    CanActivate,
    Param,
    HttpStatus,
    HttpException,
} from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { routes } from '../lib/routes/routes.config';
import { match as pathMatch, compile as pathCompile } from 'path-to-regexp';
import { DynamicRateLimitGuard } from '../guards/dynamic-rate-limit.guard';
import { ModuleRef } from '@nestjs/core';
import { compileRoutes, GuardClass, RouteConfig, RouteGuardType } from 'src/lib/routes/routes';
import { Proxy } from 'src/lib/proxy';

type CompiledRoute = {
    config: RouteConfig;
    matchFn: ReturnType<typeof pathMatch>;
    compileTarget: ReturnType<typeof pathCompile>;
    routeKey: string;
};

interface MatchResult {
    params: Record<string, string>;
    path: string;
    index: number;
}

interface ExtendedProxyOptions extends Options {
    on?: {
        proxyReq?: (proxyReq: any, req: any, res: any) => void;
        proxyRes?: (proxyRes: any, req: any, res: any) => void;
        error?: (err: any, req: any, res: any) => void;
    };
}

@Controller('api')
/**
 * ProxyController acts as a dynamic API gateway.
 *
 * It intercepts incoming requests, matches them against
 * a predefined route configuration, applies guards
 * (including rate limiting), and forwards the request
 * to the appropriate target backend service using
 * `http-proxy-middleware`.
 */
export class ProxyController {
    private compiled: CompiledRoute[];

    constructor(
        private readonly moduleRef: ModuleRef,
        private readonly dynamicRlGuard: DynamicRateLimitGuard,
    ) {
        // Compile the routes from configuration for efficient matching
        this.compiled = compileRoutes(routes, !!parseInt(process.env.COMPILE_ROUTE_VERBOSE ?? '0'), !!parseInt(process.env.COMPILE_ROUTE_MUTE ?? '1'));
    }
    /**
     * Handles any incoming API request, finds a matching route,
     * applies guards and rate limiting, and proxies the request
     * to the target backend service.
     *
     * @param req - Express request object
     * @param res - Express response object
     * @param next - Express next middleware function
     * @param rest - Captured dynamic path after /api
     */
    @All('*rest')
    async proxy(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Next() next: NextFunction,
        @Param('rest') rest: string
    ) {
        const incomingPath = req.path.replace(/^\/api/, '') || '/';
        const incomingMethod = req.method.toUpperCase();
        console.log(this.compiled)

        // Find a matching route (by method + path)
        const found = this.compiled.find(
            (c) => c.config.method === incomingMethod && !!c.matchFn(incomingPath)
        );
        if (!found) throw new NotFoundException('Route not found');

        // Expose the matched route so guards (e.g. DynamicRateLimitGuard) can access it
        // @ts-ignore
        req.matchedRoute = found.config;

        // 1) Apply rate limiting if configured
        if (found.config.rateLimit) {
            try {
                await this.dynamicRlGuard.canActivate({
                    switchToHttp: () => ({ getRequest: () => req }),
                } as any);
            } catch (e) {
                throw e;
            }
        }

        // 2) Apply custom guards (if any)
        try {
            await this.applyGuards(found.config.guards ?? [], req, res);
        } catch (e) {
            throw e;
        }

        // 3) Build target URL for proxy
        const matchResult = found.matchFn(incomingPath);
        if (!matchResult) {
            throw new NotFoundException('Route not found');
        }

        const params = (matchResult as MatchResult).params;
        const absoluteTargetUrl = found.compileTarget(params);

        return await Proxy.forward(req, res, absoluteTargetUrl, { method: found.config.method }) as any;
    }
    /**
     * Applies the list of guards defined for the route.
     * If any guard denies the request, an exception is thrown.
     *
     * @param guards - List of guards to apply
     * @param req - Express request object
     * @param res - Express response object
     */
    protected async applyGuards(guards: RouteGuardType[], req: Request, res: Response) {
        for (const guard of guards) {
            const guardInstance = await this.getGuardInstance(guard);

            const canActivate = await guardInstance.canActivate({
                switchToHttp: () => ({
                    getRequest: () => req,
                    getResponse: () => res,
                    getNext: () => () => { },
                }),
            } as any);

            if (!canActivate) {
                throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
            }
        }
    }

    /**
     * Resolves a guard instance from either:
     * - An already instantiated guard
     * - A guard class resolved from the DI container
     * - A fallback manual instantiation if not available in DI
     *
     * @param guard - Guard type (instance or class)
     * @returns {Promise<CanActivate>} Guard instance
     */
    protected async getGuardInstance(guard: RouteGuardType): Promise<CanActivate> {
        // If it's already an instance, use it directly
        if (this.isCanActivateInstance(guard)) {
            return guard;
        }

        // If it's a class, try to resolve it via NestJS DI container
        try {
            return this.moduleRef.get(guard, { strict: false });
        } catch (error) {
            // Fallback: manual instantiation if not in DI container
            return new (guard as GuardClass)();
        }
    }

    /**
     * Type guard helper to check if a given guard
     * is already an instantiated CanActivate object.
     *
     * @param guard - Guard to check
     * @returns true if it is an instance, false otherwise
     */
    protected isCanActivateInstance(guard: RouteGuardType): guard is CanActivate {
        return typeof guard !== 'function' && 'canActivate' in guard;
    }
}
