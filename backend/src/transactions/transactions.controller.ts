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
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto.js';
import {
  TransactionListResponseDto,
  TransactionResponseDto,
} from './dto/transaction-response.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { TransactionsService } from './transactions.service.js';

@ApiTags('transactions')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'List owned transactions with combinable filters' })
  @ApiOkResponse({ type: TransactionListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTransactionsQueryDto,
  ): Promise<TransactionListResponseDto> {
    return this.transactions.list(user.id, query);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a transaction and calculate its base amount',
  })
  @ApiCreatedResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'Category missing or owned by another user',
    type: ApiErrorResponseDto,
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    return this.transactions.create(user.id, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an owned transaction' })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransactionResponseDto> {
    return this.transactions.get(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an owned transaction and recalculate its base amount',
  })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTransactionDto,
  ): Promise<TransactionResponseDto> {
    return this.transactions.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an owned transaction' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.transactions.remove(user.id, id);
  }
}
