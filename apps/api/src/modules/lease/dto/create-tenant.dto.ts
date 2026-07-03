import { IsEmail, IsIn, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  fullName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsIn(['national_id', 'passport', 'drivers_license', 'voters_card'])
  idDocumentType?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  idDocumentUrl?: string;
}
