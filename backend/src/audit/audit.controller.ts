import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiErrorResponseDto } from '../common/errors/dto/api-error-response.dto.js';
import { AuditQueryService } from './audit-query.service.js';
import { AuditLogListResponseDto } from './dto/audit-log-response.dto.js';
import { ListAuditLogQueryDto } from './dto/list-audit-log-query.dto.js';

@ApiTags('audit')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
@UseGuards(JwtAuthGuard)
@Controller('audit-log')
export class AuditController {
  constructor(private readonly audit: AuditQueryService) {}

  @Get()
  @ApiOperation({ summary: 'List current user audit entries' })
  @ApiOkResponse({ type: AuditLogListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAuditLogQueryDto,
  ): Promise<AuditLogListResponseDto> {
    return this.audit.list(user.id, query);
  }
}
