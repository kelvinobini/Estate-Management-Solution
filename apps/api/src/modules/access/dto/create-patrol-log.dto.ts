import { IsOptional, IsString } from 'class-validator';

export class CreatePatrolLogDto {
  @IsString()
  checkpointName!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
