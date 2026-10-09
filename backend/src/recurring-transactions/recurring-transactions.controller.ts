import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiErrorResponseDto } from '../common/errors/dto/api-error-response.dto.js';
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto.js';
import { ListRecurringTransactionsQueryDto } from './dto/list-recurring-transactions-query.dto.js';
import {
  RecurringTransactionListResponseDto,
  RecurringTransactionResponseDto,
} from './dto/recurring-transaction-response.dto.js';
import { UpdateRecurringTransactionDto } from './dto/update-recurring-transaction.dto.js';
import { RecurringTransactionsService } from './recurring-transactions.service.js';

@ApiTags('recurring-transactions')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
@UseGuards(JwtAuthGuard)
@Controller('recurring-transactions')
export class RecurringTransactionsController {
  constructor(private readonly rules: RecurringTransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'List owned recurring transaction rules' })
  @ApiOkResponse({ type: RecurringTransactionListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRecurringTransactionsQueryDto,
  ): Promise<RecurringTransactionListResponseDto> {
    return this.rules.list(user.id, query);
  }

  @Post()
  @ApiOperation({
    summary: 'Create an owned monthly recurring transaction rule',
  })
  @ApiCreatedResponse({ type: RecurringTransactionResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateRecurringTransactionDto,
  ): Promise<RecurringTransactionResponseDto> {
    return this.rules.create(user.id, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an owned recurring transaction rule' })
  @ApiOkResponse({ type: RecurringTransactionResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecurringTransactionResponseDto> {
    return this.rules.get(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update or pause an owned recurring transaction rule',
  })
  @ApiOkResponse({ type: RecurringTransactionResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRecurringTransactionDto,
  ): Promise<RecurringTransactionResponseDto> {
    return this.rules.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an owned recurring transaction rule' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.rules.remove(user.id, id);
  }
}
