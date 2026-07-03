import { randomBytes } from 'crypto';
import * as OTPAuth from 'otpauth';
import { MfaService } from '../../src/modules/auth/services/mfa.service';
import { decryptSecret } from '../../src/common/crypto.util';

describe('MfaService', () => {
  const encryptionKey = randomBytes(32).toString('hex');
  let service: MfaService;

  beforeEach(() => {
    const config = { getOrThrow: jest.fn(() => encryptionKey) } as any;
    service = new MfaService(config);
  });

  it('generates an enrollment whose encrypted secret decrypts back to the provisioning secret', () => {
    const enrollment = service.generateEnrollment('user-123');
    expect(decryptSecret(enrollment.encryptedSecret, encryptionKey)).toBe(enrollment.secretBase32);
    expect(enrollment.provisioningUri).toContain('otpauth://totp/');
  });

  it('accepts a code generated from the same secret', () => {
    const enrollment = service.generateEnrollment('user-123');
    const totp = new OTPAuth.TOTP({
      issuer: 'EstateCore',
      label: 'user-123',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(enrollment.secretBase32),
    });
    const validCode = totp.generate();

    expect(service.verifyCode(enrollment.encryptedSecret, 'user-123', validCode)).toBe(true);
  });

  it('rejects an incorrect code', () => {
    const enrollment = service.generateEnrollment('user-123');
    expect(service.verifyCode(enrollment.encryptedSecret, 'user-123', '000000')).toBe(false);
  });
});
