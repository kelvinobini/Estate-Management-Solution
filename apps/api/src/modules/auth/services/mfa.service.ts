import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OTPAuth from 'otpauth';
import { decryptSecret, encryptSecret } from '../../../common/crypto.util';

const ISSUER = 'EstateCore';

/**
 * TOTP-based MFA (RFC 6238), mandatory for admin and finance roles per the
 * platform's security requirements. Secrets are held encrypted at rest
 * (AES-256-GCM) and only ever decrypted in-memory to verify a submitted code.
 */
@Injectable()
export class MfaService {
  constructor(private readonly config: ConfigService) {}

  /** Generates a new base32 TOTP secret and its encrypted-at-rest form, plus a provisioning URI for QR display. */
  generateEnrollment(email: string): { secretBase32: string; encryptedSecret: string; provisioningUri: string } {
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = this.buildTotp(secret.base32, email);
    return {
      secretBase32: secret.base32,
      encryptedSecret: encryptSecret(secret.base32, this.encryptionKey),
      provisioningUri: totp.toString(),
    };
  }

  verifyCode(encryptedSecret: string, email: string, code: string): boolean {
    const secretBase32 = decryptSecret(encryptedSecret, this.encryptionKey);
    const totp = this.buildTotp(secretBase32, email);
    // window: 1 tolerates ±30s of clock drift between server and authenticator app
    return totp.validate({ token: code, window: 1 }) !== null;
  }

  private buildTotp(secretBase32: string, email: string): OTPAuth.TOTP {
    return new OTPAuth.TOTP({
      issuer: ISSUER,
      label: email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });
  }

  private get encryptionKey(): string {
    return this.config.getOrThrow<string>('MFA_ENCRYPTION_KEY');
  }
}
