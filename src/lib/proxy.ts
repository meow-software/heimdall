import { Request, Response } from 'express';
import axios, { Method } from 'axios';
import { HttpException, HttpStatus } from '@nestjs/common';

export class Proxy {
    /**
     * Forward an incoming request to the target service.
     *
     * @param req  The original Express request from NestJS
     * @param res  The original Express response to write back to client
     * @param targetUrl Absolute target URL of the destination microservice
     */
    static async forward(req: Request, res: Response, targetUrl: string, options: { method?: Method } = {}) {
        try {
            // 1) Preserve original HTTP method (GET, POST, PUT, DELETE, etc.)
            const method = req.method as Method;

            // 2) Copy headers. Remove "host" to avoid mismatch with target service.
            const headers = { ...req.headers };
            delete headers['host'];

            // 3) Handle query string (already present in targetUrl if you built it)
            // -> Nothing special to do here

            // 4) Prepare request body
            let data: any = undefined;

            if (method !== 'GET' && method !== 'HEAD') {
                // For all non-GET requests, use the parsed body
                data = req.body;
            }

            // 5) Forward the request using axios
            const response = await axios.request({
                url: targetUrl,
                method,
                headers,
                data,
                timeout: 30000
            });
            // 6) Return the response to the client
            return response.data

        } catch (err: any) {
            console.error('Proxy forward error:', err.message);
            const status =
                err instanceof HttpException
                    ? err.getStatus()
                    : err.response?.status || HttpStatus.BAD_GATEWAY;

            const errorDetails =
                err.response?.data || err.message || 'Unknown proxy error';

            throw new HttpException(
                {
                    error: errorDetails,
                    details: err.message,
                },
                status,
            );
        }
    }
}