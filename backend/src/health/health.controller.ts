import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../common/errors/dto/api-error-response.dto.js';
import { HealthResponseDto } from './dto/health-response.dto.js';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check the process and database readiness' })
  @ApiOkResponse({
    description: 'Process and database are ready',
    type: HealthResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'Database health check failed',
    type: ApiErrorResponseDto,
  })
  getHealth(): Promise<HealthResponseDto> {
    return this.healthService.getHealth();
  }
}
