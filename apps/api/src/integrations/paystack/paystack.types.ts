export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    amount: number; // kobo
    currency: string;
    status: 'success' | 'failed' | 'abandoned';
    paid_at: string | null;
  };
}

/** Payload shape of the `charge.success` event Paystack posts to our webhook. */
export interface PaystackWebhookEvent {
  event: string;
  data: PaystackVerifyResponse['data'];
}
