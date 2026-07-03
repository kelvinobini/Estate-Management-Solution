import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PaystackInitializeResponse, PaystackVerifyResponse } from './paystack.types';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);

  constructor(private readonly config: ConfigService) {}

  private get secretKey(): string {
    return this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY');
  }

  /**
   * Starts a hosted-checkout transaction. `amountKobo` must already be the
   * final total (subtotal + VAT) for the invoice being paid.
   */
  async initializeTransaction(params: {
    email: string;
    amountKobo: bigint;
    reference: string;
    callbackUrl: string;
  }): Promise<PaystackInitializeResponse['data']> {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo.toString(),
        reference: params.reference,
        callback_url: params.callbackUrl,
        currency: 'NGN',
      }),
    });

    const body = (await response.json()) as PaystackInitializeResponse;
    if (!response.ok || !body.status) {
      this.logger.error(`Paystack initialize failed: ${body.message}`);
      throw new Error(`Paystack initialize failed: ${body.message}`);
    }

    return body.data;
  }

  /**
   * Server-side confirmation of a transaction's outcome. Always call this
   * before crediting a payment — never trust the webhook or client redirect alone.
   */
  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse['data']> {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });

    const body = (await response.json()) as PaystackVerifyResponse;
    if (!response.ok || !body.status) {
      throw new Error(`Paystack verify failed: ${body.message}`);
    }

    return body.data;
  }

  /**
   * Validates the `x-paystack-signature` header against an HMAC-SHA512 of the
   * raw request body using the secret key, per Paystack's webhook spec.
   * Must be called with the raw (unparsed) request body string.
   */
  verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean {
    if (!signatureHeader) {
      return false;
    }

    const expected = createHmac('sha512', this.secretKey).update(rawBody).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const receivedBuffer = Buffer.from(signatureHeader, 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, receivedBuffer);
  }
}
