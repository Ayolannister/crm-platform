import type { NextFunction, Request, Response } from 'express';
import { httpRequestDuration } from './metrics.js';

// Times every request and records it once the response is fully sent,
// so the status includes errors handled by exception filters.
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/metrics') return next();
  const end = httpRequestDuration.startTimer({ method: req.method });
  res.on('finish', () => {
    // The route template (e.g. /contacts/:id), never the raw path: keeps cardinality bounded.
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : 'unmatched';
    end({ route, status: String(res.statusCode) });
  });
  next();
}