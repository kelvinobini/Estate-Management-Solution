import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class CreateBookingDto {
  /**
   * Required for staff callers (who book on a tenant's behalf); omitted by
   * Tenant-role callers, who are resolved to their own tenant id instead —
   * see BookingsController.resolveTenantId.
   */
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsUUID()
  amenityId!: string;

  @IsISO8601()
  startTime!: string;

  @IsISO8601()
  endTime!: string;
}
