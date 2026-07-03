const sendMail = jest.fn().mockResolvedValue(undefined);
const createTransport = jest.fn(() => ({ sendMail }));

jest.mock('nodemailer', () => ({ createTransport: () => createTransport() }));

import { MailerService } from '../../src/integrations/email/mailer.service';

describe('MailerService', () => {
  beforeEach(() => {
    sendMail.mockClear();
    createTransport.mockClear();
  });

  function configWith(values: Record<string, string>): any {
    return { get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback) };
  }

  it('logs and skips sending when SMTP_HOST is not configured', async () => {
    const service = new MailerService(configWith({}));

    await service.send({ to: 'staff@example.com', subject: 'Hi', text: 'Body' });

    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('sends via nodemailer when SMTP_HOST is configured', async () => {
    const service = new MailerService(
      configWith({
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '587',
        SMTP_FROM: 'no-reply@rosegarden.test',
      }),
    );

    await service.send({ to: 'staff@example.com', subject: 'New inquiry', text: 'Body text' });

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'no-reply@rosegarden.test',
        to: 'staff@example.com',
        subject: 'New inquiry',
        text: 'Body text',
      }),
    );
  });

  it('reuses the same transporter across multiple sends', async () => {
    const service = new MailerService(configWith({ SMTP_HOST: 'smtp.example.com' }));

    await service.send({ to: 'a@example.com', subject: 'One', text: 'x' });
    await service.send({ to: 'b@example.com', subject: 'Two', text: 'y' });

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });
});
