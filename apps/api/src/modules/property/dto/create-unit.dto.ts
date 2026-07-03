import { IsIn, IsInt, IsNumberString, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  unitCode!: string;

  @IsIn(['residential', 'commercial', 'serviced_apartment', 'mixed_use'])
  unitType!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @IsOptional()
  @IsNumberString()
  sizeSqm?: string;

  @IsOptional()
  @IsNumberString()
  baseRentKobo?: string;

  @IsOptional()
  @IsNumberString()
  serviceChargeKobo?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  virtualTourUrl?: string;
}
