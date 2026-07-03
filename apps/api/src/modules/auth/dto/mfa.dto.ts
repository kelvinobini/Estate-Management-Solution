import { IsString, Length } from 'class-validator';

export class VerifyMfaLoginDto {
  @IsString()
  mfaChallengeToken!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}

export class ConfirmMfaEnrollmentDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}
