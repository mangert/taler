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
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiErrorResponseDto } from '../common/errors/dto/api-error-response.dto.js';
import { BudgetsService } from './budgets.service.js';
import {
  BudgetListResponseDto,
  BudgetResponseDto,
} from './dto/budget-response.dto.js';
import { CreateBudgetDto } from './dto/create-budget.dto.js';
import { ListBudgetsQueryDto } from './dto/list-budgets-query.dto.js';
import { UpdateBudgetDto } from './dto/update-budget.dto.js';

@ApiTags('budgets')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  @Get()
  @ApiOperation({ summary: 'List owned budgets for a calendar month' })
  @ApiOkResponse({ type: BudgetListResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListBudgetsQueryDto,
  ): Promise<BudgetListResponseDto> {
    return this.budgets.list(user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create an owned monthly expense budget' })
  @ApiCreatedResponse({ type: BudgetResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateBudgetDto,
  ): Promise<BudgetResponseDto> {
    return this.budgets.create(user.id, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an owned budget with current progress' })
  @ApiOkResponse({ type: BudgetResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BudgetResponseDto> {
    return this.budgets.get(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an owned monthly budget' })
  @ApiOkResponse({ type: BudgetResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateBudgetDto,
  ): Promise<BudgetResponseDto> {
    return this.budgets.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an owned monthly budget' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.budgets.remove(user.id, id);
  }
}
