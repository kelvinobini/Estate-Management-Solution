import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Thin nodemailer wrapper — generic SMTP rather than a specific ESP's SDK, so
 * swapping providers (SES, SendGrid, Mailgun, a local dev mailcatcher) is
 * just an env var change, not a code change. If SMTP_HOST isn't configured
 * (e.g. this sandbox, or a fresh local checkout), sends are logged and
 * skipped rather than throwing — email delivery is a nice-to-have on top of
 * the inquiries feature, not something that should break it.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;
  private warnedNotConfigured = false;

  constructor(private readonly config: ConfigService) {}

  private getTransporter(): Transporter | null {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      if (!this.warnedNotConfigured) {
        this.logger.warn('SMTP_HOST is not configured — emails will be logged, not sent.');
        this.warnedNotConfigured = true;
      }
      return null;
    }

    if (!this.transporter) {
      this.transporter = createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<string>('SMTP_SECURE', 'false') === 'true',
        auth: this.config.get<string>('SMTP_USER')
          ? { user: this.config.get<string>('SMTP_USER'), pass: this.config.get<string>('SMTP_PASSWORD') }
          : undefined,
      });
    }
    return this.transporter;
  }

  async send(message: EmailMessage): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.log(`[email skipped, SMTP not configured] to=${message.to} subject="${message.subject}"`);
      return;
    }

    const from = this.config.get<string>('SMTP_FROM', 'no-reply@estatecore.app');
    await transporter.sendMail({ from, to: message.to, subject: message.subject, text: message.text, html: message.html });
  }
}
