import { IsBoolean, IsIn, IsISO8601, IsInt, IsNumberString, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateLeaseDto {
  @IsUUID()
  unitId!: string;

  @IsUUID()
  primaryTenantId!: string;

  @IsISO8601()
  startDate!: string;

  @IsISO8601()
  endDate!: string;

  @IsNumberString()
  rentAmountKobo!: string;

  @IsIn(['monthly', 'quarterly', 'biannual', 'annual'])
  rentFrequency!: string;

  @IsOptional()
  @IsNumberString()
  depositAmountKobo?: string;

  @IsOptional()
  @Min(0)
  escalationPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  escalationFrequencyMonths?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  breakClauseNoticeDays?: number;

  @IsOptional()
  @IsBoolean()
  sublettingAllowed?: boolean;
}
