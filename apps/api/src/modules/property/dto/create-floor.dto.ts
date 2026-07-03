import { IsInt, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateFloorDto {
  @IsInt()
  levelNumber!: number;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  floorPlanUrl?: string;
}
