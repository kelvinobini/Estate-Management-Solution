import { IsIn, IsISO8601, IsOptional } from 'class-validator';

export class CreateExpiryAlertDto {
  @IsISO8601()
  alertDate!: string;

  @IsOptional()
  @IsIn(['email', 'sms', 'push', 'in_app'])
  channel?: string;
}
