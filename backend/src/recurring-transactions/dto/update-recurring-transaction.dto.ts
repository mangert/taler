import { PartialType } from '@nestjs/swagger';
import { CreateRecurringTransactionDto } from './create-recurring-transaction.dto.js';

export class UpdateRecurringTransactionDto extends PartialType(
  CreateRecurringTransactionDto,
  { skipNullProperties: false },
) {}
