import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CsvService } from './csv.service.js';
import { TransactionImportsController } from './transaction-imports.controller.js';

@Module({
  imports: [
    AuditModule,
    AuthModule,
    PrismaModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        limits: {
          fileSize: config.getOrThrow<number>('CSV_MAX_FILE_SIZE_BYTES'),
        },
      }),
    }),
  ],
  controllers: [TransactionImportsController],
  providers: [CsvService],
  exports: [CsvService],
})
export class CsvModule {}
