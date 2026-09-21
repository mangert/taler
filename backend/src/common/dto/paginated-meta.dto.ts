import { ApiProperty } from '@nestjs/swagger';

export class PaginatedMetaDto {
  @ApiProperty({ example: 1, minimum: 1 })
  page!: number;

  @ApiProperty({ example: 20, minimum: 1 })
  pageSize!: number;

  @ApiProperty({ example: 45, minimum: 0 })
  total!: number;

  @ApiProperty({ example: 3, minimum: 0 })
  totalPages!: number;

  constructor(values: PaginatedMetaDto) {
    Object.assign(this, values);
  }
}
