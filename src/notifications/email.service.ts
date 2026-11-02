import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Transactional mailer with three modes, in order of preference:
 *
 *  1. Gmail API over HTTPS (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET +
 *     GOOGLE_REFRESH_TOKEN + SMTP_USER). Used when the Google account can't
 *     create an app password and/or the network drops SMTP handshakes —
 *     Google's own recommendation is the HTTPS API.
 *  2. Plain SMTP user/password (SMTP_USER + SMTP_PASS): app password or any
 *     transactional provider (Brevo, Resend…).
 *  3. Disabled: logs a warning and never fails the caller.
 *
 * Notifications must never break a webhook or a checkout, so every failure is
 * swallowed (logged) instead of thrown.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  // Gmail API (HTTPS) state.
  private readonly gmailUser = process.env.SMTP_USER;
  private readonly googleClientId = process.env.GMAIL_CLIENT_ID;
  private readonly googleClientSecret = process.env.GMAIL_CLIENT_SECRET;
  private readonly googleRefreshToken = process.env.GMAIL_REFRESH_TOKEN;
  private accessToken: { value: string; expiresAt: number } | null = null;

  private get usingGmailApi(): boolean {
    return Boolean(
      this.gmailUser &&
        this.googleClientId &&
        this.googleClientSecret &&
        this.googleRefreshToken,
    );
  }

  constructor() {
    if (this.usingGmailApi) {
      this.logger.log(
        `Email notifications enabled via Gmail API (${this.gmailUser})`,
      );
      return;
    }

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
      return;
    }

    this.logger.warn(
      'No mail credentials (Gmail API or SMTP_USER/SMTP_PASS) — email notifications disabled',
    );
  }

  get enabled(): boolean {
    return this.usingGmailApi || this.transporter !== null;
  }

  /** Fire-and-forget send; failures are logged, never thrown. */
  async send(to: string, subject: string, text: string): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      if (this.usingGmailApi) {
        await this.sendWithGmailApi(to, subject, text);
      } else {
        await this.transporter!.sendMail({
          from:
            process.env.SMTP_FROM ||
            `"Legas Muebles" <${process.env.SMTP_USER}>`,
          to,
          subject,
          text,
        });
      }
      this.logger.log(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Email to ${to} failed: ${error.message}`);
      return false;
    }
  }

  // ----- Gmail API (HTTPS) -----

  private async sendWithGmailApi(
    to: string,
    subject: string,
    text: string,
  ): Promise<void> {
    const token = await this.getAccessToken();
    const raw = Buffer.from(this.buildMime(to, subject, text), 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Gmail API ${res.status}: ${detail.slice(0, 200)}`);
    }
  }

  /** Refresh the OAuth2 access token, cached until ~1 minute before expiry. */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt > Date.now() + 60_000) {
      return this.accessToken.value;
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.googleClientId!,
        client_secret: this.googleClientSecret!,
        refresh_token: this.googleRefreshToken!,
        grant_type: 'refresh_token',
      }),
    });

    const data: { access_token?: string; expires_in?: number } =
      await res.json();
    if (!res.ok || !data.access_token) {
      throw new Error(
        `OAuth2 token refresh failed (${res.status}): ${JSON.stringify(data).slice(0, 200)}`,
      );
    }

    this.accessToken = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return data.access_token;
  }

  /** Minimal UTF-8 plain-text MIME message (base64 body, RFC 2047 subject). */
  private buildMime(to: string, subject: string, text: string): string {
    const from =
      process.env.SMTP_FROM || `"Legas Muebles" <${this.gmailUser}>`;
    const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
    const body = Buffer.from(text, 'utf8')
      .toString('base64')
      .replace(/(.{76})/g, '$1\r\n');

    return [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      body,
    ].join('\r\n');
  }
}
