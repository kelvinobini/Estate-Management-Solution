import { IsIn, IsISO8601, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreateValuationDto {
  @IsNumberString()
  valuationKobo!: string;

  @IsISO8601()
  valuationDate!: string;

  @IsOptional()
  @IsString()
  valuerName?: string;

  @IsOptional()
  @IsIn(['manual', 'market_comparison', 'automated'])
  source?: string;
}
