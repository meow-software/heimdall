import { RouteConfig } from "./routes";

export const AUTH_SERVICE_HOST = process.env.AUTH_SERVICE_HOST ?? 'http://localhost:3001';

export const authRouteConfig: RouteConfig[] = [
  { 
    method: 'POST', 
    path: '/auth/login',  
    target: {
      host: AUTH_SERVICE_HOST,
      path: '/auth/login'
    },
    rateLimit: { limit: 5, ttl: 60 } 
  },
  { 
    method: 'POST', 
    path: '/auth/register', 
    target: {
      host: AUTH_SERVICE_HOST,
      path: '/auth/register'
    },
    rateLimit: { limit: 5, ttl: 60 } 
  },
];