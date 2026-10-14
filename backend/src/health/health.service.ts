/** Реализует операции с проверкой работоспособности. */
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { DatabaseHealthIndicator } from './database-health.indicator.js';
import { HealthResponseDto } from './dto/health-response.dto.js';

@Injectable()
export class HealthService {
  /** Получает зависимости для работы класса. */
  constructor(
    private readonly databaseHealthIndicator: DatabaseHealthIndicator,
  ) {}

  /** Возвращает состояние приложения. */
  async getHealth(): Promise<HealthResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      await this.databaseHealthIndicator.check();

      return {
        status: 'ok',
        checks: {
          process: 'up',
          database: 'up',
        },
        timestamp,
      };
    } catch {
      throw new ServiceUnavailableException({
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database health check failed',
        details: [],
      });
    }
  }
}
