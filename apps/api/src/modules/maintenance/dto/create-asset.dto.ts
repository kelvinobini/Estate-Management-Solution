import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAssetDto {
  @IsUUID()
  propertyId!: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsString()
  name!: string;

  @IsString()
  assetType!: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsISO8601()
  installedAt?: string;

  @IsOptional()
  @IsISO8601()
  warrantyExpiry?: string;
}
