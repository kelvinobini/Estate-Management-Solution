import { IsIn, IsInt, IsLatitude, IsLongitude, IsNumberString, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  name!: string;

  @IsIn(['residential', 'commercial', 'serviced_apartment', 'mixed_use'])
  propertyType!: string;

  @IsString()
  addressLine1!: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

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
