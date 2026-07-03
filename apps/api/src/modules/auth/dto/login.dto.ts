import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** Resolves the tenant before email lookup — the same email may exist under different organisations. */
  @IsString()
  organisationSlug!: string;

  @IsString()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
