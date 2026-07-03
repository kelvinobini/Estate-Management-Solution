import { Type } from 'class-transformer';
import { ArrayMinSize, IsISO8601, IsNumberString, IsUUID, ValidateNested } from 'class-validator';

export class PaymentPlanInstallmentDto {
  @IsNumberString()
  amountDueKobo!: string;

  @IsISO8601()
  dueDate!: string;
}

export class CreatePaymentPlanDto {
  @IsUUID()
  invoiceId!: string;

  @ValidateNested({ each: true })
  @Type(() => PaymentPlanInstallmentDto)
  @ArrayMinSize(2, { message: 'A payment plan needs at least 2 installments — use a single invoice otherwise' })
  installments!: PaymentPlanInstallmentDto[];
}
