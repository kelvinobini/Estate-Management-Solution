import { IsInt, IsNumberString, IsOptional, IsUrl, Min } from 'class-validator';

export class UpdateUnitDto {
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
