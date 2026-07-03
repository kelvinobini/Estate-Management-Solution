import { createHmac } from 'crypto';
import { PaystackService } from '../../src/integrations/paystack/paystack.service';

describe('PaystackService.verifyWebhookSignature', () => {
  const secretKey = 'sk_test_123456789';
  let service: PaystackService;

  beforeEach(() => {
    const config = { getOrThrow: jest.fn(() => secretKey) } as any;
    service = new PaystackService(config);
  });

  function sign(body: string): string {
    return createHmac('sha512', secretKey).update(body).digest('hex');
  }

  it('accepts a signature computed with the correct secret', () => {
    const body = JSON.stringify({ event: 'charge.success', data: { reference: 'pay_123' } });
    expect(service.verifyWebhookSignature(body, sign(body))).toBe(true);
  });

  it('rejects a signature computed with the wrong secret', () => {
    const body = JSON.stringify({ event: 'charge.success', data: { reference: 'pay_123' } });
    const wrongSignature = createHmac('sha512', 'wrong-secret').update(body).digest('hex');
    expect(service.verifyWebhookSignature(body, wrongSignature)).toBe(false);
  });

  it('rejects a tampered body even if the original signature is reused', () => {
    const body = JSON.stringify({ event: 'charge.success', data: { reference: 'pay_123' } });
    const signature = sign(body);
    const tamperedBody = JSON.stringify({ event: 'charge.success', data: { reference: 'pay_999' } });
    expect(service.verifyWebhookSignature(tamperedBody, signature)).toBe(false);
  });

  it('rejects when no signature header is present', () => {
    expect(service.verifyWebhookSignature('{}', undefined)).toBe(false);
  });
});
