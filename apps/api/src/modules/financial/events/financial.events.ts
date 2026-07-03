/**
 * Domain events for the Financial module, emitted on the in-process event
 * bus (@nestjs/event-emitter today; swappable for NATS/Kafka later per
 * docs/01-architecture.md section 3). Other modules subscribe to these
 * instead of being called directly, keeping bounded contexts decoupled.
 */

export const FinancialEvent = {
  InvoiceCreated: 'invoice.created',
  InvoiceIssued: 'invoice.issued',
  InvoicePaid: 'invoice.paid',
  InvoiceOverdue: 'invoice.overdue',
  PaymentSucceeded: 'payment.succeeded',
  PaymentFailed: 'payment.failed',
  ArrearsEscalated: 'arrears.escalated',
} as const;

export class InvoiceCreatedEvent {
  constructor(
    public readonly organisationId: string,
    public readonly invoiceId: string,
    public readonly tenantId: string | null,
  ) {}
}

export class InvoicePaidEvent {
  constructor(
    public readonly organisationId: string,
    public readonly invoiceId: string,
    public readonly tenantId: string | null,
  ) {}
}

export class InvoiceOverdueEvent {
  constructor(
    public readonly organisationId: string,
    public readonly invoiceId: string,
    public readonly tenantId: string | null,
    public readonly daysOverdue: number,
  ) {}
}

export class PaymentSucceededEvent {
  constructor(
    public readonly organisationId: string,
    public readonly paymentId: string,
    public readonly invoiceId: string | null,
    public readonly amountKobo: bigint,
  ) {}
}

export class ArrearsEscalatedEvent {
  constructor(
    public readonly organisationId: string,
    public readonly tenantId: string,
    public readonly invoiceId: string,
    public readonly stage: string,
  ) {}
}
