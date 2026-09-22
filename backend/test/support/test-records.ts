import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsString, Length } from 'class-validator';
import type { TestJwtPayload } from './authenticate-request.js';

class CreateTestRecordDto {
  @IsString()
  @Length(1, 120)
  name!: string;
}

export interface TestRecord {
  id: string;
  userId: string;
  name: string;
}

interface GuardRequest {
  headers: {
    cookie?: string;
  };
  user?: TestJwtPayload;
}

interface AuthenticatedTestRequest extends GuardRequest {
  user: TestJwtPayload;
}

function getAccessToken(cookieHeader: string | undefined): string | undefined {
  const accessTokenCookie = cookieHeader
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('access_token='));

  return accessTokenCookie?.slice('access_token='.length);
}

@Injectable()
export class TestJwtCookieGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<GuardRequest>();
    const token = getAccessToken(request.headers.cookie);
    const jwtSecret = process.env.JWT_SECRET;

    if (!token || !jwtSecret) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = new JwtService({
        secret: jwtSecret,
      }).verify<TestJwtPayload>(token);

      if (
        typeof payload.sub !== 'string' ||
        typeof payload.email !== 'string'
      ) {
        throw new Error('Invalid JWT claims');
      }

      request.user = payload;

      return true;
    } catch {
      throw new UnauthorizedException('Authentication required');
    }
  }
}

@Injectable()
export class TestRecordStore {
  private readonly records: TestRecord[] = [];

  create(userId: string, name: string): TestRecord {
    const idSuffix = String(this.records.length + 1).padStart(12, '0');
    const record = {
      id: `00000000-0000-4000-8000-${idSuffix}`,
      userId,
      name,
    };

    this.records.push(record);

    return { ...record };
  }

  getAll(): TestRecord[] {
    return this.records.map((record) => ({ ...record }));
  }

  findOwned(id: string, userId: string): TestRecord | undefined {
    const record = this.records.find(
      (candidate) => candidate.id === id && candidate.userId === userId,
    );

    return record ? { ...record } : undefined;
  }
}

@Controller('test-records')
@UseGuards(TestJwtCookieGuard)
export class TestRecordsController {
  constructor(private readonly recordStore: TestRecordStore) {}

  @Post()
  create(
    @Req() request: AuthenticatedTestRequest,
    @Body() body: CreateTestRecordDto,
  ): TestRecord {
    return this.recordStore.create(request.user.sub, body.name);
  }

  @Get(':id')
  findOne(
    @Req() request: AuthenticatedTestRequest,
    @Param('id') id: string,
  ): TestRecord {
    const record = this.recordStore.findOwned(id, request.user.sub);

    if (!record) {
      throw new NotFoundException('Test record not found');
    }

    return record;
  }
}
