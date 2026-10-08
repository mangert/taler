import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parse } from 'csv-parse/sync';
import {
  AuditAction,
  AuditableEntityType,
  Prisma,
  TransactionType,
} from '../generated/prisma/client.js';
import { transactionAuditSnapshot } from '../audit/audit-snapshot.js';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  amountPattern,
  datePattern,
  ratePattern,
} from '../transactions/dto/transaction-fields.dto.js';
import { ExportTransactionsQueryDto } from '../transactions/dto/export-transactions-query.dto.js';
import {
  buildTransactionPrismaWhere,
  createDefaultTransactionOrderBy,
} from '../transactions/transaction-query.builder.js';
import { ImportResultDto } from './dto/import-upload.dto.js';

const mappingFields = [
  'date',
  'amount',
  'category',
  'type',
  'description',
  'currency',
  'rate',
] as const;
type MappingField = (typeof mappingFields)[number];
type ColumnMapping = Partial<Record<MappingField, string>> &
  Record<'date' | 'amount' | 'category' | 'type', string>;
type ImportError = {
  row: number;
  field: string;
  code: string;
  message: string;
};
type PreparedRow = {
  categoryId: string;
  type: TransactionType;
  amount: Prisma.Decimal;
  currency: string;
  exchangeRateToBase: Prisma.Decimal;
  baseAmount: Prisma.Decimal;
  transactionDate: Date;
  description: string | null;
};

export interface UploadedCsvFile {
  mimetype: string;
  size: number;
  buffer: Buffer;
}

function badRequest(
  code: string,
  message: string,
  details: ImportError[] = [],
): never {
  throw new BadRequestException({ code, message, details });
}

function parseMapping(value: string): ColumnMapping {
  let decoded: unknown;
  try {
    decoded = JSON.parse(value);
  } catch {
    return badRequest('INVALID_MAPPING', 'Mapping must be a JSON object');
  }
  if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded))
    return badRequest('INVALID_MAPPING', 'Mapping must be a JSON object');
  const entries = Object.entries(decoded);
  if (
    entries.some(
      ([key, header]) =>
        !mappingFields.includes(key as MappingField) ||
        typeof header !== 'string' ||
        header.trim() === '',
    ) ||
    ['date', 'amount', 'category', 'type'].some(
      (key) => !entries.some(([candidate]) => candidate === key),
    )
  )
    return badRequest(
      'INVALID_MAPPING',
      'Mapping has missing or invalid fields',
    );
  const mapping = Object.fromEntries(
    entries.map(([key, header]) => [key, (header as string).trim()]),
  ) as ColumnMapping;
  if (new Set(Object.values(mapping)).size !== entries.length)
    return badRequest(
      'INVALID_MAPPING',
      'Each mapped CSV column must be unique',
    );
  return mapping;
}

function parseCalendarDate(value: string): Date | null {
  if (!datePattern.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

function csvCell(value: string): string {
  const safe = /^\s*[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

@Injectable()
export class CsvService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async import(
    userId: string,
    mappingJson: string,
    file: UploadedCsvFile | undefined,
  ): Promise<ImportResultDto> {
    if (!file) badRequest('CSV_FILE_REQUIRED', 'CSV file is required');
    if (
      !['text/csv', 'application/csv', 'application/vnd.ms-excel'].includes(
        file.mimetype.toLowerCase(),
      )
    )
      badRequest('INVALID_CSV_MIME', 'Unsupported CSV MIME type');
    if (
      file.size === 0 ||
      file.size > this.config.getOrThrow<number>('CSV_MAX_FILE_SIZE_BYTES')
    )
      badRequest('INVALID_CSV_SIZE', 'CSV file is empty or too large');
    const mapping = parseMapping(mappingJson);
    let contents: string;
    try {
      contents = new TextDecoder('utf-8', { fatal: true }).decode(file.buffer);
    } catch {
      return badRequest('INVALID_CSV_ENCODING', 'CSV file must be UTF-8');
    }
    if (contents.includes('\0'))
      badRequest('INVALID_CSV_ENCODING', 'CSV file contains a null byte');
    let parsed: { record: string[]; info: { lines: number } }[];
    try {
      parsed = parse(contents, {
        bom: true,
        info: true,
        skip_empty_lines: true,
        relax_column_count: true,
      }) as unknown as { record: string[]; info: { lines: number } }[];
    } catch (error: unknown) {
      const row =
        typeof error === 'object' &&
        error !== null &&
        'lines' in error &&
        typeof error.lines === 'number'
          ? error.lines
          : 1;
      return badRequest('INVALID_CSV', 'CSV parsing failed', [
        {
          row,
          field: 'file',
          code: 'CSV_PARSE_ERROR',
          message: 'Malformed CSV',
        },
      ]);
    }
    if (parsed.length < 2)
      badRequest(
        'EMPTY_CSV',
        'CSV must contain a header and at least one data row',
      );
    const headers = parsed[0].record.map((header) => header.trim());
    if (
      headers.some((header) => header === '') ||
      new Set(headers).size !== headers.length
    )
      badRequest(
        'INVALID_CSV_HEADERS',
        'CSV headers must be non-empty and unique',
      );
    if (Object.values(mapping).some((header) => !headers.includes(header)))
      badRequest('INVALID_MAPPING', 'Mapped CSV header was not found');
    if (parsed.length - 1 > this.config.getOrThrow<number>('CSV_MAX_ROWS'))
      badRequest('CSV_ROW_LIMIT', 'CSV row limit exceeded');
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { baseCurrency: true },
    });
    if (!user) badRequest('INVALID_SESSION', 'User was not found');
    const categories = await this.prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, type: true },
    });
    const errors: ImportError[] = [];
    const prepared: PreparedRow[] = [];
    for (const entry of parsed.slice(1)) {
      const row =
        entry.info.lines -
        entry.record.reduce(
          (count, cell) => count + (cell.match(/\r\n|\r|\n/g)?.length ?? 0),
          0,
        );
      if (entry.record.length !== headers.length) {
        errors.push({
          row,
          field: 'file',
          code: 'CSV_COLUMN_COUNT',
          message: 'Column count differs from header',
        });
        continue;
      }
      const value = (field: MappingField): string => {
        const header = mapping[field];
        return header ? entry.record[headers.indexOf(header)].trim() : '';
      };
      const firstError = errors.length;
      const addError = (
        field: MappingField,
        code: string,
        message: string,
      ): void => {
        errors.push({ row, field, code, message });
      };
      const transactionDate = parseCalendarDate(value('date'));
      if (!transactionDate)
        addError(
          'date',
          'INVALID_DATE',
          'Date must be a valid YYYY-MM-DD value',
        );
      const type = value('type').toUpperCase();
      if (type !== TransactionType.INCOME && type !== TransactionType.EXPENSE)
        addError('type', 'INVALID_TYPE', 'Type must be INCOME or EXPENSE');
      const categoryValue = value('category');
      const category = categories.find(
        (item) => item.id === categoryValue || item.name === categoryValue,
      );
      if (!category)
        addError('category', 'CATEGORY_NOT_FOUND', 'Category was not found');
      else if (category.type !== type)
        addError(
          'category',
          'CATEGORY_TYPE_MISMATCH',
          'Category type must match transaction type',
        );
      const amountValue = value('amount');
      const amount = amountPattern.test(amountValue)
        ? new Prisma.Decimal(amountValue)
        : null;
      if (!amount || !amount.isFinite() || amount.lte(0))
        addError(
          'amount',
          'INVALID_AMOUNT',
          'Amount must be a positive decimal with at most four places',
        );
      const currency = (value('currency') || user.baseCurrency).toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency))
        addError(
          'currency',
          'INVALID_CURRENCY',
          'Currency must be a three-letter code',
        );
      const rateValue = currency === user.baseCurrency ? '1' : value('rate');
      const rate = ratePattern.test(rateValue)
        ? new Prisma.Decimal(rateValue)
        : null;
      if (!rate || !rate.isFinite() || rate.lte(0))
        addError(
          'rate',
          'INVALID_RATE',
          'A positive exchange rate is required for non-base currency',
        );
      const description = value('description') || null;
      if (description && description.length > 500)
        addError(
          'description',
          'INVALID_DESCRIPTION',
          'Description must not exceed 500 characters',
        );
      if (
        errors.length !== firstError ||
        !transactionDate ||
        !category ||
        !amount ||
        !rate
      )
        continue;
      const baseAmount = amount.mul(rate).toDecimalPlaces(4);
      if (baseAmount.gte('1000000000000000')) {
        addError(
          'amount',
          'BASE_AMOUNT_OVERFLOW',
          'Calculated base amount exceeds supported precision',
        );
        continue;
      }
      prepared.push({
        categoryId: category.id,
        type: type as TransactionType,
        amount,
        currency,
        exchangeRateToBase: rate,
        baseAmount,
        transactionDate,
        description,
      });
    }
    if (errors.length > 0)
      badRequest('CSV_ROW_ERRORS', 'CSV contains invalid rows', errors);
    await this.prisma.$transaction(
      async (transaction) => {
        for (const row of prepared) {
          const record = await transaction.transaction.create({
            data: { userId, ...row },
          });
          await this.audit.record(transaction, {
            userId,
            entityType: AuditableEntityType.TRANSACTION,
            entityId: record.id,
            action: AuditAction.CREATE,
            after: transactionAuditSnapshot(record),
          });
        }
      },
      { timeout: 120_000 },
    );
    return { importedCount: prepared.length };
  }

  exportRows(
    userId: string,
    query: ExportTransactionsQueryDto,
  ): AsyncIterable<string> {
    const where = buildTransactionPrismaWhere(userId, query);
    const header = [
      'transactionDate',
      'type',
      'amount',
      'currency',
      'exchangeRateToBase',
      'baseAmount',
      'category',
      'description',
    ];
    const prisma = this.prisma;
    return (async function* () {
      yield `\uFEFF${header.map(csvCell).join(',')}\r\n`;
      let cursor: string | undefined;
      while (true) {
        const records = await prisma.transaction.findMany({
          where,
          orderBy: createDefaultTransactionOrderBy(),
          include: { category: { select: { name: true } } },
          take: 500,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        for (const record of records) {
          yield [
            record.transactionDate.toISOString().slice(0, 10),
            record.type,
            record.amount.toFixed(4),
            record.currency,
            record.exchangeRateToBase.toFixed(8),
            record.baseAmount.toFixed(4),
            record.category.name,
            record.description ?? '',
          ]
            .map(csvCell)
            .join(',') + '\r\n';
        }
        if (records.length < 500) return;
        cursor = records[records.length - 1].id;
      }
    })();
  }
}
