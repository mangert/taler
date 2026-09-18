import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BudgetsModule } from './budgets/budgets.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { validateEnvironment } from './common/config/environment.js';
import { CommonModule } from './common/common.module.js';
import { CsvModule } from './csv/csv.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RecurringTransactionsModule } from './recurring-transactions/recurring-transactions.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: ['.env', '../.env'],
      isGlobal: true,
      validate: validateEnvironment,
    }),
    AuthModule,
    UsersModule,
    CategoriesModule,
    TransactionsModule,
    BudgetsModule,
    RecurringTransactionsModule,
    DashboardModule,
    CsvModule,
    AuditModule,
    HealthModule,
    CommonModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
