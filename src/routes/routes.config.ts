import { JwtAuthGuard } from "src/auth/jwt/jwt-auth.guard";
import { RouteConfig } from "./routes";
import { AdminGuard } from "src/auth/guards/admin.guard";

const AUTH_SERVICE_HOST = 'http://auth-service:3001';
const PROJECT_SERVICE_HOST = 'http://project-service:3002';
const ADMIN_SERVICE_HOST = 'http://admin-service:3003';

export const routes: RouteConfig[] = [
  { 
    method: 'POST', 
    path: '/auth/login',  
    target: {
      host: AUTH_SERVICE_HOST,
      path: '/login'
    },
    rateLimit: { limit: 5, ttl: 60 } 
  },
  { 
    method: 'POST', 
    path: '/auth/signup', 
    target: {
      host: AUTH_SERVICE_HOST,
      path: '/signup'
    },
    rateLimit: { limit: 10, ttl: 300 } 
  },
  { 
    method: 'GET',  
    path: '/auth/me',     
    target: {
      host: AUTH_SERVICE_HOST,
      path: '/me'
    },
    guards: [JwtAuthGuard], 
    rateLimit: { limit: 60, ttl: 60, keyBy: 'user' } 
  },
  { 
    method: 'GET',  
    path: '/projects/:id',
    target: {
      host: PROJECT_SERVICE_HOST,
      path: '/projects/:id'
    },
    guards: [JwtAuthGuard, AdminGuard], 
    rateLimit: { limit: 120, ttl: 60, keyBy: 'user' } 
  },
  { 
    method: 'GET',  
    path: '/admin/stats', 
    target: {
      host: ADMIN_SERVICE_HOST,
      path: '/stats'
    },
    guards: [AdminGuard],
    rateLimit: { limit: 600, ttl: 60, keyBy: 'user' } 
  },
];