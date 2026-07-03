import { IsIn } from 'class-validator';

export class UpdateIncidentStatusDto {
  @IsIn(['open', 'investigating', 'resolved'])
  status!: string;
}
