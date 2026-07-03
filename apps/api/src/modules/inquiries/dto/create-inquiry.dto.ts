import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Submitted from the public landing page — unauthenticated, so every field is attacker-controlled input. */
export class CreateInquiryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  organisationSlug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
