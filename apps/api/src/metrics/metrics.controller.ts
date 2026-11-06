import { Controller, Get, Header } from '@nestjs/common';
import { registry } from './metrics.js';

@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', registry.contentType)
  metrics(): Promise<string> {
    return registry.metrics();
  }
}