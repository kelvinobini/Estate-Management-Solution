import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateMaintenanceScheduleDto {
  @IsUUID()
  assetId!: string;

  @IsInt()
  @Min(1)
  frequencyDays!: number;

  @IsOptional()
  @IsUUID()
  assignedVendorId?: string;
}
