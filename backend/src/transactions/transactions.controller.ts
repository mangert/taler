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
  Res,
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
import type { Response } from 'express';
import { Readable } from 'node:stream';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiErrorResponseDto } from '../common/errors/dto/api-error-response.dto.js';
import { CsvService } from '../csv/csv.service.js';
import { ExportTransactionsQueryDto } from './dto/export-transactions-query.dto.js';
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
  constructor(
    private readonly transactions: TransactionsService,
    private readonly csv: CsvService,
  ) {}

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

  @Get('export')
  @ApiOperation({
    summary: 'Export all owned transactions matching list filters as CSV',
  })
  @ApiOkResponse({
    description: 'UTF-8 CSV download',
    content: { 'text/csv': { schema: { type: 'string' } } },
  })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  export(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExportTransactionsQueryDto,
    @Res() response: Response,
  ): void {
    const rows = this.csv.exportRows(user.id, query);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="transactions.csv"',
    );
    const stream = Readable.from(rows);
    stream.on('error', (error: Error) => response.destroy(error));
    stream.pipe(response);
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
