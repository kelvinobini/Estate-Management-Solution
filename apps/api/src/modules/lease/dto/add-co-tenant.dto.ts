import { IsNumberString, IsOptional, IsUUID } from 'class-validator';

export class AddCoTenantDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsNumberString()
  liabilitySharePercent?: string;
}
