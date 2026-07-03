import { IsIn } from 'class-validator';

export class UpdateWorkOrderStatusDto {
  @IsIn(['open', 'assigned', 'in_progress', 'on_hold', 'closed', 'cancelled'])
  status!: string;
}
