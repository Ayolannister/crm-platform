import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { trace, context, isSpanContextValid } from '@opentelemetry/api';
import { performance } from 'node:perf_hooks';
import { httpRequestDuration } from './metrics.js';

const logger = new Logger('HTTP');

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.path === '/metrics') return next();

  const start = performance.now();

  const end = httpRequestDuration.startTimer({
    method: req.method,
  });

  // Capture the active trace context while handling the request.
const spanContext = trace.getSpanContext(context.active());

const traceId =
  spanContext && isSpanContextValid(spanContext)
    ? spanContext.traceId
    : undefined;

  res.on('finish', () => {
    const route = req.route?.path
      ? `${req.baseUrl}${req.route.path}`
      : 'unmatched';

    const statusCode = res.statusCode;

    const durationMs = Number(
      (performance.now() - start).toFixed(2),
    );

    // Preserve existing Prometheus metrics.
    end({
      route,
      status: String(statusCode),
    });

    // Structured HTTP request log.
    logger.log({
      message: 'HTTP request completed',
      method: req.method,
      route,
      statusCode,
      durationMs,
      ...(traceId ? { traceId } : {}),
    });
  });

  next();
}
