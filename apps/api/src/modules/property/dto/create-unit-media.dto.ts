import { IsIn, IsInt, IsOptional, IsUrl } from 'class-validator';

export class CreateUnitMediaDto {
  @IsIn(['image', 'video', 'floor_plan', '3d_tour'])
  mediaType!: string;

  @IsUrl({ require_tld: false })
  url!: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
