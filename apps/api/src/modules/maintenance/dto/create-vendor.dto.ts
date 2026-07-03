import { IsEmail, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  companyName!: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  slaResponseHours?: number;
}
