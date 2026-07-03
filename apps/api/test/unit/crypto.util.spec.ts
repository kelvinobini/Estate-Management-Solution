import { randomBytes } from 'crypto';
import { decryptSecret, encryptSecret } from '../../src/common/crypto.util';

describe('crypto.util (AES-256-GCM)', () => {
  const key = randomBytes(32).toString('hex');

  it('round-trips plaintext through encrypt/decrypt', () => {
    const ciphertext = encryptSecret('my-totp-secret', key);
    expect(decryptSecret(ciphertext, key)).toBe('my-totp-secret');
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const a = encryptSecret('same-plaintext', key);
    const b = encryptSecret('same-plaintext', key);
    expect(a).not.toBe(b);
  });

  it('fails to decrypt with the wrong key', () => {
    const ciphertext = encryptSecret('my-totp-secret', key);
    const wrongKey = randomBytes(32).toString('hex');
    expect(() => decryptSecret(ciphertext, wrongKey)).toThrow();
  });

  it('fails to decrypt a tampered ciphertext (auth tag mismatch)', () => {
    const ciphertext = encryptSecret('my-totp-secret', key);
    const [iv, authTag, data] = ciphertext.split(':');
    const tamperedData = data.slice(0, -2) + (data.slice(-2) === '00' ? '01' : '00');
    expect(() => decryptSecret([iv, authTag, tamperedData].join(':'), key)).toThrow();
  });
});
