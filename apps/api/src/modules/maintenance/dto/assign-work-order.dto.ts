import { IsOptional, IsUUID } from 'class-validator';

/** Exactly one of vendorId/userId is required — enforced in WorkOrdersService.assign, not here, since class-validator's cross-field rules are awkward for "at least one of". */
export class AssignWorkOrderDto {
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
