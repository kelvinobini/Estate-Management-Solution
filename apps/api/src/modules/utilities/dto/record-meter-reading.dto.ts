import { IsIn, IsISO8601, IsNumberString, IsOptional } from 'class-validator';

export class RecordMeterReadingDto {
  @IsNumberString()
  readingValue!: string;

  @IsOptional()
  @IsIn(['manual', 'iot_sensor'])
  readingSource?: string;

  @IsOptional()
  @IsISO8601()
  readAt?: string;
}
