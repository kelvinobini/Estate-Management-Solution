import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailerService, EmailMessage } from './mailer.service';
import { EMAIL_QUEUE } from './email.tokens';

@Injectable()
@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailer: MailerService) {
    super();
  }

  async process(job: Job<EmailMessage>): Promise<void> {
    await this.mailer.send(job.data);
    this.logger.log(`Sent email to ${job.data.to}: ${job.data.subject}`);
  }
}
