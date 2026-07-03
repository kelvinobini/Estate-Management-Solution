import { IsIn, IsNumberString, IsOptional, IsUrl, IsUUID } from 'class-validator';

export class RecordManualPaymentDto {
  @IsUUID()
  invoiceId!: string;

  @IsNumberString()
  amountKobo!: string;

  @IsIn(['bank_transfer', 'cash', 'ussd', 'wallet', 'card', 'direct_debit'])
  paymentMethod!: string;

  @IsOptional()
  reference?: string;
}

export class InitiatePaystackPaymentDto {
  @IsUUID()
  invoiceId!: string;

  // Format-validated only (http/https) — Paystack redirects the browser here post-checkout,
  // so an unvalidated value would be an open redirect. Not restricted to our own origin since
  // there's no configured public app URL to allowlist against yet.
  @IsOptional()
  @IsUrl({ require_tld: false })
  callbackUrl?: string;
}
