import { normalizePem } from '../../src/common/pem.util';

describe('normalizePem', () => {
  it('unescapes literal \\n sequences (the .env-file storage convention)', () => {
    const escaped = '-----BEGIN PRIVATE KEY-----\\nABC123\\n-----END PRIVATE KEY-----\\n';
    expect(normalizePem(escaped)).toBe('-----BEGIN PRIVATE KEY-----\nABC123\n-----END PRIVATE KEY-----\n');
  });

  it('leaves a PEM with real newlines untouched', () => {
    const real = '-----BEGIN PRIVATE KEY-----\nABC123\n-----END PRIVATE KEY-----\n';
    expect(normalizePem(real)).toBe(real);
  });
});
