import { Request, Response, NextFunction } from 'express';

/**
 * Adds a short private browser-cache window for stable reference data
 * (leave types, departments, holidays, role modules — things that change rarely).
 *
 * `private` keeps these authenticated responses out of shared CDN caches, and
 * `Vary: Authorization` (appended, not overwritten) ensures one user's cached
 * response is never reused for another. The window mirrors the frontend's
 * 5-minute stable-data cache, cutting repeat round-trips and serverless hits.
 */
export function cacheControl(maxAgeSeconds: number) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', `private, max-age=${maxAgeSeconds}`);
    res.vary('Authorization');
    next();
  };
}
