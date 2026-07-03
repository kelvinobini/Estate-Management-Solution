import { IsISO8601 } from 'class-validator';

export class CreateGuardShiftDto {
  @IsISO8601()
  shiftStart!: string;

  @IsISO8601()
  shiftEnd!: string;
}
