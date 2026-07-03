import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EmailMessage } from './mailer.service';
import { EMAIL_QUEUE } from './email.tokens';

/**
 * Public entry point other modules inject. Enqueues rather than sending
 * inline — callers (e.g. InquiriesService.submit, itself in the request
 * path of a public unauthenticated endpoint) shouldn't have their response
 * time or success depend on an SMTP round-trip, and BullMQ gives free
 * retry/backoff for transient delivery failures.
 */
@Injectable()
export class EmailService {
  constructor(@InjectQueue(EMAIL_QUEUE) private readonly queue: Queue<EmailMessage>) {}

  async send(message: EmailMessage): Promise<void> {
    await this.queue.add('send', message, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
    });
  }
}
