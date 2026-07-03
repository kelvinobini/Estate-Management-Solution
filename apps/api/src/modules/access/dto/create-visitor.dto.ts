import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateVisitorDto {
  @IsOptional()
  @IsUUID()
  hostTenantId?: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}
