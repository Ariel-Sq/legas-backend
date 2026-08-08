import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Thin SMTP mailer, env-gated: when SMTP_USER/SMTP_PASS are not set the
 * service logs and skips instead of failing — notifications must never
 * break a webhook or checkout. Designed for a Gmail app password
 * (smtp.gmail.com:465) but works with any SMTP provider.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '465', 10),
        secure: (process.env.SMTP_PORT || '465') === '465',
        auth: { user, pass },
      });
      this.logger.log(`Email notifications enabled (${user})`);
    } else {
      this.logger.warn(
        'SMTP_USER/SMTP_PASS not set — email notifications disabled',
      );
    }
  }

  get enabled(): boolean {
    return this.transporter !== null;
  }

  /** Fire-and-forget send; failures are logged, never thrown. */
  async send(to: string, subject: string, text: string): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.sendMail({
        from:
          process.env.SMTP_FROM || `"Legas Muebles" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Email to ${to} failed: ${error.message}`);
      return false;
    }
  }
}
