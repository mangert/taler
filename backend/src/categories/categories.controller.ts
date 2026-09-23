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
import { CategoriesService } from './categories.service.js';
import {
  CategoryListResponseDto,
  CategoryResponseDto,
} from './dto/category-response.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@ApiTags('categories')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({
  description: 'Authentication is required',
  type: ApiErrorResponseDto,
})
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'List current user categories with optional name search',
  })
  @ApiOkResponse({ type: CategoryListResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid search or pagination',
    type: ApiErrorResponseDto,
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCategoriesQueryDto,
  ): Promise<CategoryListResponseDto> {
    return this.categories.list(user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a category for the current user' })
  @ApiCreatedResponse({ type: CategoryResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid category fields',
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'CATEGORY_NAME_EXISTS: name already exists for this user',
    type: ApiErrorResponseDto,
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categories.create(user.id, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an owned category' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiNotFoundResponse({
    description: 'Category missing or owned by another user',
    type: ApiErrorResponseDto,
  })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto> {
    return this.categories.get(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an owned category' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid or empty update',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Category missing or owned by another user',
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'CATEGORY_NAME_EXISTS: name already exists for this user',
    type: ApiErrorResponseDto,
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categories.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an unused owned category' })
  @ApiNoContentResponse({ description: 'Category deleted' })
  @ApiNotFoundResponse({
    description: 'Category missing or owned by another user',
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    description:
      'CATEGORY_IN_USE: category is referenced by transactions, budgets or recurring rules',
    type: ApiErrorResponseDto,
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.categories.remove(user.id, id);
  }
}
