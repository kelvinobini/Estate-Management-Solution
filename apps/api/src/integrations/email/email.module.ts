import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailService } from './email.service';
import { EmailProcessor } from './email.processor';
import { MailerService } from './mailer.service';
import { EMAIL_QUEUE } from './email.tokens';

export { EMAIL_QUEUE };

@Module({
  imports: [BullModule.registerQueue({ name: EMAIL_QUEUE })],
  providers: [EmailService, EmailProcessor, MailerService],
  exports: [EmailService],
})
export class EmailModule {}
