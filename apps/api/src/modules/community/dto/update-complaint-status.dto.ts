import { IsIn } from 'class-validator';

export class UpdateComplaintStatusDto {
  @IsIn(['open', 'in_review', 'resolved', 'escalated'])
  status!: string;
}
