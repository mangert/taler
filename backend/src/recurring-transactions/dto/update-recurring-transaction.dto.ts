/** Описывает поля обновления повторяющейся операции для API. */
import { PartialType } from '@nestjs/swagger';
import { CreateRecurringTransactionDto } from './create-recurring-transaction.dto.js';

export class UpdateRecurringTransactionDto extends PartialType(
  CreateRecurringTransactionDto,
  { skipNullProperties: false },
) {}
