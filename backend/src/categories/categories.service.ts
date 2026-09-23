import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Category } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CategoryListResponseDto,
  CategoryResponseDto,
} from './dto/category-response.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

function toResponse(category: Category): CategoryResponseDto {
  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    color: category.color,
    type: category.type,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    query: ListCategoriesQueryDto,
  ): Promise<CategoryListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.CategoryWhereInput = {
      userId,
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      items: categories.map(toResponse),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async get(userId: string, id: string): Promise<CategoryResponseDto> {
    return toResponse(await this.getOwned(userId, id));
  }

  async create(
    userId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    await this.assertUniqueName(userId, dto.name);
    try {
      const category = await this.prisma.category.create({
        data: {
          userId,
          name: dto.name,
          icon: dto.icon,
          color: dto.color,
          type: dto.type,
        },
      });
      return toResponse(category);
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2002')) this.nameConflict();
      throw error;
    }
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    await this.getOwned(userId, id);
    if (
      [dto.name, dto.icon, dto.color, dto.type].every(
        (value) => value === undefined,
      )
    ) {
      throw new BadRequestException({
        code: 'EMPTY_UPDATE',
        message: 'At least one category field is required',
      });
    }
    if (dto.name !== undefined)
      await this.assertUniqueName(userId, dto.name, id);

    try {
      const category = await this.prisma.category.update({
        where: { id, userId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
          ...(dto.color !== undefined ? { color: dto.color } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
        },
      });
      return toResponse(category);
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2002')) this.nameConflict();
      if (hasPrismaCode(error, 'P2025')) this.notFound();
      throw error;
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwned(userId, id);
    const where = { userId, categoryId: id };
    const [transactions, budgets, recurringRules] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.budget.count({ where }),
      this.prisma.recurringTransaction.count({ where }),
    ]);
    if (transactions + budgets + recurringRules > 0) this.inUse();
    try {
      await this.prisma.category.delete({ where: { id, userId } });
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2003')) this.inUse();
      if (hasPrismaCode(error, 'P2025')) this.notFound();
      throw error;
    }
  }

  private async getOwned(userId: string, id: string): Promise<Category> {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });
    if (!category) this.notFound();
    return category;
  }

  private async assertUniqueName(
    userId: string,
    name: string,
    excludedId?: string,
  ): Promise<void> {
    const existing = await this.prisma.category.findFirst({
      where: {
        userId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludedId ? { NOT: { id: excludedId } } : {}),
      },
    });
    if (existing) this.nameConflict();
  }

  private nameConflict(): never {
    throw new ConflictException({
      code: 'CATEGORY_NAME_EXISTS',
      message: 'A category with this name already exists',
    });
  }

  private inUse(): never {
    throw new ConflictException({
      code: 'CATEGORY_IN_USE',
      message: 'Category is used by transactions, budgets or recurring rules',
    });
  }

  private notFound(): never {
    throw new NotFoundException({
      code: 'CATEGORY_NOT_FOUND',
      message: 'Category not found',
    });
  }
}
