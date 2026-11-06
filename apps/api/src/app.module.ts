import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthController } from './health/health.controller.js';
import { DbModule } from './db/db.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ContactsModule } from './contacts/contacts.module.js';
import { MetricsModule } from './metrics/metrics.module.js';

@Module({
  imports: [DbModule, AuthModule, ContactsModule, MetricsModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}