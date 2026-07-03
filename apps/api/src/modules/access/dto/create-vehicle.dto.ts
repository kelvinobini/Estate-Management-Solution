import { IsIn, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateVehicleDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsString()
  plateNumber!: string;

  @IsOptional()
  @IsString()
  makeModel?: string;

  @IsOptional()
  @IsIn(['resident', 'visitor'])
  permitType?: string;

  @IsOptional()
  @IsISO8601()
  validUntil?: string;
}
