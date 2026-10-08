import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiErrorResponseDto } from '../common/errors/dto/api-error-response.dto.js';
import { CsvService, type UploadedCsvFile } from './csv.service.js';
import { ImportResultDto, ImportUploadDto } from './dto/import-upload.dto.js';

@ApiTags('transaction-imports')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
@UseGuards(JwtAuthGuard)
@Controller('transaction-imports')
export class TransactionImportsController {
  constructor(private readonly csv: CsvService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Atomically import mapped UTF-8 CSV transactions' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'mapping'],
      properties: {
        file: { type: 'string', format: 'binary' },
        mapping: { type: 'string', description: 'JSON mapping of CSV headers' },
      },
    },
  })
  @ApiCreatedResponse({ type: ImportResultDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  import(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ImportUploadDto,
    @UploadedFile() file: UploadedCsvFile | undefined,
  ): Promise<ImportResultDto> {
    return this.csv.import(user.id, body.mapping, file);
  }
}
