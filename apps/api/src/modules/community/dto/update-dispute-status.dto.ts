import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateDisputeStatusDto {
  @IsIn(['open', 'mediation', 'legal', 'resolved'])
  status!: string;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
