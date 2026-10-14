/** Реализует операции с подключением к базе данных. */
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  /** Получает зависимости для работы класса. */
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
      }),
    });
  }

  /** Освобождает ресурсы при завершении модуля. */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
