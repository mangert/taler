import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsJSON } from 'class-validator';

export class ImportUploadDto {
  @ApiProperty({
    description:
      'JSON object mapping date, amount, category and type to CSV headers; description, currency and rate are optional',
    example:
      '{"date":"Date","amount":"Amount","category":"Category","type":"Type"}',
  })
  @IsDefined()
  @IsJSON()
  mapping!: string;
}

export class ImportResultDto {
  @ApiProperty({ example: 2 })
  importedCount!: number;
}
