import { IsIn } from 'class-validator';

export class UpdateUnitStatusDto {
  @IsIn(['vacant', 'occupied', 'under_maintenance', 'reserved'])
  status!: string;
}
