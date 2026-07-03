import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateComplaintDto {
  /**
   * Required for staff callers (who file on a tenant's behalf); omitted by
   * Tenant-role callers, who are resolved to their own tenant id instead —
   * see ComplaintsController.resolveTenantId.
   */
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsString()
  category!: string;

  @IsString()
  description!: string;
}
