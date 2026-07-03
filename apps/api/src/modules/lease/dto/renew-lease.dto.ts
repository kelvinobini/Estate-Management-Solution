import { IsISO8601 } from 'class-validator';

export class RenewLeaseDto {
  @IsISO8601()
  newEndDate!: string;
}
