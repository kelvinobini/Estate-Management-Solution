import { IsIn, IsInt, IsLatitude, IsLongitude, IsNumberString, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdatePropertyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['residential', 'commercial', 'serviced_apartment', 'mixed_use'])
  propertyType?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsNumberString()
  totalLandAreaSqm?: string;

  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2200)
  yearBuilt?: number;
}
