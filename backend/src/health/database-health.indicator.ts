/** Проверяет готовность подключения к базе данных. */
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class DatabaseHealthIndicator implements OnModuleDestroy {
  private readonly pool: Pool;

  /** Настраивает подключение для проверки базы данных. */
  constructor(config: ConfigService) {
    this.pool = new Pool({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
      connectionTimeoutMillis: 2_000,
      max: 1,
    });
  }

  /** Проверяет доступность базы данных. */
  async check(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  /** Освобождает ресурсы при завершении модуля. */
  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
