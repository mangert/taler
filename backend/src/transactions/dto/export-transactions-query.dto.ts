import { OmitType } from '@nestjs/swagger';
import { ListTransactionsQueryDto } from './list-transactions-query.dto.js';

export class ExportTransactionsQueryDto extends OmitType(
  ListTransactionsQueryDto,
  ['page', 'pageSize'] as const,
) {}
