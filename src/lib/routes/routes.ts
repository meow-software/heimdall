import { CanActivate } from '@nestjs/common';
import { match as pathMatch, compile as pathCompile } from 'path-to-regexp';
import { Method } from 'axios';

export type GuardClass = new (...args: any[]) => CanActivate;
export type RouteGuardType = GuardClass | CanActivate

export interface RouteConfig {
    method: Method;
    path: string;                 // exposé par gateway (sans /api prefix)
    target: { // url interne avec mêmes params
        host: string;
        path: string;
    }
    guards?: RouteGuardType[];
    rateLimit?: { limit: number; ttl: number; keyBy?: 'ip' | 'user' | 'ip+user' };
}
export const checkPath = (path: string, type: string, verbose: boolean = true) => {
  if(verbose) console.log(`Checking ${type} path: ${path}`);
  
  if (path.includes(':')) {
    const params = path.match(/:\w+/g);
    if(verbose) console.log(`  ${type} parameters: ${params ? params.join(', ') : 'None'}`);

    // Vérifier les paramètres mal formés
    const malformed = path.match(/:[^a-zA-Z_]/g);
    if (malformed) {
      console.error(`  ❌ MALFORMED ${type} PARAMETERS: ${malformed.join(', ')}`);
      throw new Error(`Invalid parameter in ${type} path: ${path}`);
    }
  }
};

export const compileRoutes = (routes: RouteConfig[], verbose : boolean = true, mute=false) => {

  return routes.map((r) => {
    if (!mute) console.log(`\n🔍 Compiling route: ${r.method} ${r.path}`);
    if (!mute) console.log(`Target: ${r.target.host}${r.target.path}`);
    
    // Vérifier le chemin source
    checkPath(r.path, 'source', verbose && !mute);
    
    // Vérifier le chemin target (seulement la partie path)
    checkPath(r.target.path, 'target', verbose && !mute);

    try {
      // Compiler le matching du chemin source
      const matchFn = pathMatch(r.path, { decode: decodeURIComponent });
      if(verbose && !mute) console.log(`\t✓ Source path compiled successfully`);
      
      // Compiler seulement la partie path de la target
      const compileTargetPath = pathCompile(r.target.path, { encode: encodeURIComponent });
      if(verbose && !mute) console.log(`\t✓ Target path compiled successfully`);

      const compileTarget = (params: Record<string, string> = {}) => {
        const compiledPath = compileTargetPath(params);
        const fullUrl = `${r.target.host}${compiledPath}`;
        if(verbose && !mute) console.log(`\tGenerated target: ${fullUrl}`);
        return fullUrl;
      };
      if (!verbose && !mute) console.log("\tCompiled successfully");
      return {
        config: r,
        matchFn,
        compileTarget,
        routeKey: `${r.method} ${r.path}`,
      };
    } catch (error) {
      console.error(`❌ Error compiling route: ${r.method} ${r.path}`);
      console.error(`\tTarget path: ${r.target.path}`);
      console.error(`\tError: ${error.message}`);
      throw error;
    }
  });
};