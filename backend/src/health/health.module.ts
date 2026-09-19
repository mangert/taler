import { Module } from '@nestjs/common';

import { DatabaseHealthIndicator } from './database-health.indicator.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

@Module({
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator, HealthService],
})
export class HealthModule {}
