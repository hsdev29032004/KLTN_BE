import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    const host = process.env.SMTP_HOST;
    const service =
      process.env.SMTP_SERVICE || (process.env.SMTP_USER ? 'gmail' : undefined); // default to gmail when SMTP_USER present
    const user = process.env.SMTP_USER || process.env.SYSTEM_EMAIL;
    const pass = process.env.SMTP_PASS || process.env.SYSTEM_PASSWORD;

    try {
      if (host) {
        this.transporter = nodemailer.createTransport({
          host,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: user
            ? {
                user,
                pass,
              }
            : undefined,
        });
        this.logger.log(`Mail transporter configured (host=${host})`);
      } else if (service && user) {
        // Use well-known service (Gmail, SendGrid, etc.)
        this.transporter = nodemailer.createTransport({
          service,
          auth: { user, pass },
          tls: {
            rejectUnauthorized:
              process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
          },
        });
        this.logger.log(`Mail transporter configured (service=${service})`);
      } else {
        this.logger.warn(
          'No SMTP configuration provided; emails will be logged',
        );
      }
    } catch (err) {
      this.logger.error('Failed to initialize mail transporter', err as any);
      this.transporter = null;
    }
  }

  async sendMail(to: string, subject: string, text: string, html?: string) {
    const from =
      process.env.EMAIL_FROM ||
      process.env.SMTP_USER ||
      process.env.SYSTEM_EMAIL;
    if (!this.transporter) {
      // Fallback: log to console in dev
      this.logger.warn(
        '[MailService] no transporter configured, fallback sendMail',
        JSON.stringify({ from, to, subject }),
      );
      this.logger.debug({ text, html });
      return { logged: true };
    }

    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });
      this.logger.log(
        `Email sent to ${to}: ${info?.messageId ?? JSON.stringify(info)}`,
      );
      return info;
    } catch (err) {
      this.logger.error('Error sending email', err as any);
      throw err;
    }
  }
}
