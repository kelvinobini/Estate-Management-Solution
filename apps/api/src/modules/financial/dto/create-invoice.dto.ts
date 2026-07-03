import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsIn,
  IsISO8601,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateInvoiceLineItemDto {
  @IsString()
  description!: string;

  @IsNumberString()
  quantity!: string;

  @IsNumberString()
  unitPriceKobo!: string;
}

export class CreateInvoiceDto {
  @IsOptional()
  @IsUUID()
  leaseId?: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsUUID()
  tenantId!: string;

  @IsIn(['rent', 'service_charge', 'utility', 'late_fee', 'deposit', 'other'])
  invoiceType!: string;

  @IsISO8601()
  dueDate!: string;

  @IsOptional()
  @Min(0)
  vatRatePercent?: number;

  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineItemDto)
  @ArrayMinSize(1)
  lineItems!: CreateInvoiceLineItemDto[];
}
