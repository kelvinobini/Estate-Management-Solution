import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class CreateDisputeDto {
  @IsOptional()
  @IsUUID()
  complaintId?: string;

  @IsOptional()
  @IsUUID()
  leaseId?: string;

  @IsIn(['deposit_deduction', 'rent_dispute', 'maintenance_liability', 'noise', 'other'])
  disputeType!: string;
}
