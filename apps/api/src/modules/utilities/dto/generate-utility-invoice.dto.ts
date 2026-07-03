import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class GenerateUtilityInvoiceDto {
  @IsISO8601()
  periodStart!: string;

  @IsISO8601()
  periodEnd!: string;

  /** Omit for a bulk/reconciliation meter — no Financial invoice is created without a tenant to bill. */
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
