import { RouteConfig } from "./routes";
import { authRouteConfig } from "./routes.config.auth";

export const PROJECT_SERVICE_HOST = 'http://project-service:3002';
export const ADMIN_SERVICE_HOST = 'http://admin-service:3003';

export const routes: RouteConfig[] = [
  ...authRouteConfig,
  
  // { 
  //   method: 'GET',  
  //   path: '/projects/:id',
  //   target: {
  //     host: PROJECT_SERVICE_HOST,
  //     path: '/projects/:id'
  //   },
  //   guards: [JwtAuthGuard, AdminGuard], 
  //   rateLimit: { limit: 120, ttl: 60, keyBy: 'user' } 
  // },
  // { 
  //   method: 'GET',  
  //   path: '/admin/stats', 
  //   target: {
  //     host: ADMIN_SERVICE_HOST,
  //     path: '/stats'
  //   },
  //   guards: [AdminGuard],
  //   rateLimit: { limit: 600, ttl: 60, keyBy: 'user' } 
  // },
];