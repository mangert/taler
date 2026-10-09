import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RecurringTransactionsController } from './recurring-transactions.controller.js';
import { RecurringSchedulerService } from './recurring-scheduler.service.js';
import { RecurringTransactionsService } from './recurring-transactions.service.js';

@Module({
  imports: [AuthModule, PrismaModule, AuditModule, ScheduleModule.forRoot()],
  controllers: [RecurringTransactionsController],
  providers: [RecurringTransactionsService, RecurringSchedulerService],
})
export class RecurringTransactionsModule {}
