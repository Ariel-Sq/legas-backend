import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Thin SMTP mailer, env-gated: when no credentials are set the service logs
 * and skips instead of failing — notifications must never break a webhook or
 * checkout.
 *
 * Two auth modes, in order of preference:
 *  1. Gmail OAuth2 (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET +
 *     GOOGLE_REFRESH_TOKEN + SMTP_USER). Needed when the Google account can't
 *     create an app password; nodemailer refreshes the access token itself.
 *  2. Plain SMTP user/password (SMTP_USER + SMTP_PASS), e.g. an app password
 *     or any transactional provider (Brevo, Resend…).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (user && clientId && clientSecret && refreshToken) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          type: 'OAuth2',
          user,
          clientId,
          clientSecret,
          refreshToken,
        },
      });
      this.logger.log(`Email notifications enabled via Gmail OAuth2 (${user})`);
      return;
    }

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '465', 10),
        secure: (process.env.SMTP_PORT || '465') === '465',
        auth: { user, pass },
      });
      this.logger.log(`Email notifications enabled (${user})`);
      return;
    }

    this.logger.warn(
      'No mail credentials (OAuth2 or SMTP_USER/SMTP_PASS) — email notifications disabled',
    );
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
