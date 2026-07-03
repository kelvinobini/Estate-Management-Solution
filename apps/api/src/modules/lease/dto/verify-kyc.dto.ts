import { IsIn } from 'class-validator';

/**
 * Records the outcome of an out-of-band KYC check. There is no live provider
 * integration yet (SmileIdentity/Youverify — see docs/01-architecture.md
 * section 11, Integrations); this endpoint lets staff record a manually
 * confirmed result until that integration exists.
 */
export class VerifyKycDto {
  @IsIn(['verified', 'rejected'])
  outcome!: 'verified' | 'rejected';

  @IsIn(['SmileIdentity', 'Youverify', 'manual'])
  provider!: string;
}
