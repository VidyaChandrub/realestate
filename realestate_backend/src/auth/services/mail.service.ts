import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private static readonly DEFAULT_MAIL_PROVIDER = 'smtp';
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    const smtpPort = this.config.get<number>('SMTP_PORT') ?? 587;
    const smtpSecure = this.config.get<boolean>('SMTP_SECURE');
    const secure = smtpSecure ?? smtpPort === 465;

    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: smtpPort,
      secure,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendPasswordReset(to: string, token: string, appUrl: string): Promise<void> {
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    const html = this.buildPasswordResetHtml(resetUrl);
    const provider = this.getProvider();

    this.logger.log(`Selected email provider: ${provider}`);

    try {
      await this.sendHtmlEmail(to, html);

      this.logger.log(`Password reset email sent successfully via ${provider} to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send password reset email via ${provider} to ${to}`, err);
      throw err;
    }
  }

  async sendEmailVerificationEmail(email: string, token: string, role: 'JOB_SEEKER' | 'EMPLOYER'): Promise<void> {
    // const appUrl = this.getPortalUrl(role);
    const backendUrl = this.config.get<string>('BACKEND_URL') ?? 'http://localhost:3000';
    const verificationUrl = `${backendUrl}/api/v1/auth/verify-email?token=${token}`;
    const html = this.buildEmailVerificationHtml(verificationUrl, role);
    const provider = this.getProvider();

    this.logger.log(`Sending email verification email via ${provider} to ${email}`);

    try {
      await this.sendHtmlEmail(email, html, 'Verify your RealEstate email');
      this.logger.log(`Email verification email sent successfully via ${provider} to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send email verification email via ${provider} to ${email}`, err);
      throw err;
    }
  }

  async sendEmployerApprovedEmail(emails: string[], organizationName: string, appUrl?: string): Promise<void> {
    if (!emails || emails.length === 0) {
      this.logger.warn('sendEmployerApprovedEmail called with empty email list');
      return;
    }

    const uniqueEmails = [...new Set(emails)];
    const html = this.buildEmployerApprovedHtml(organizationName, appUrl);
    const provider = (this.config.get<string>('MAIL_PROVIDER') ?? MailService.DEFAULT_MAIL_PROVIDER).toLowerCase();

    this.logger.log(`Sending agency approved emails to ${uniqueEmails.length} recipient(s) via ${provider}`);

    const results = await Promise.allSettled(
      uniqueEmails.map((email) =>
        provider === 'api' ? this.sendViaApi(email, html, 'Agency Account Approved') : this.sendViaSmtp(email, html, 'Agency Account Approved'),
      ),
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Failed to send agency approved email to ${uniqueEmails[index]} for organization "${organizationName}"`,
          result.reason,
        );
      } else {
        this.logger.log(`Agency approved email sent successfully to ${uniqueEmails[index]}`);
      }
    });
  }

  async sendEmployerSuspendedEmail(emails: string[], organizationName: string, appUrl?: string): Promise<void> {
    if (!emails || emails.length === 0) {
      this.logger.warn('sendEmployerSuspendedEmail called with empty email list');
      return;
    }

    const uniqueEmails = [...new Set(emails)];
    const html = this.buildEmployerSuspendedHtml(organizationName, appUrl);
    const provider = (this.config.get<string>('MAIL_PROVIDER') ?? MailService.DEFAULT_MAIL_PROVIDER).toLowerCase();

    this.logger.log(`Sending agency suspended emails to ${uniqueEmails.length} recipient(s) via ${provider}`);

    const results = await Promise.allSettled(
      uniqueEmails.map((email) =>
        provider === 'api' ? this.sendViaApi(email, html, 'Agency Account Suspended') : this.sendViaSmtp(email, html, 'Agency Account Suspended'),
      ),
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Failed to send agency suspended email to ${uniqueEmails[index]} for organization "${organizationName}"`,
          result.reason,
        );
      } else {
        this.logger.log(`Agency suspended email sent successfully to ${uniqueEmails[index]}`);
      }
    });
  }

  private buildPasswordResetHtml(resetUrl: string): string {
    return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fa;border-radius:12px">
        <h2 style="color:#1a2b4b;margin-bottom:8px">Reset your password</h2>
        <p style="color:#555;line-height:1.6">
          We received a request to reset the password for your account.
          Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;margin:24px 0;padding:12px 28px;background:#1a2b4b;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;font-size:15px">
          Reset Password
        </a>
        <p style="color:#888;font-size:13px">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
        <p style="color:#bbb;font-size:12px;margin-top:24px">
          Or copy this link into your browser:<br>
          <span style="word-break:break-all">${resetUrl}</span>
        </p>
      </div>
    `;
  }

  private buildEmailVerificationHtml(verificationUrl: string, role: 'JOB_SEEKER' | 'EMPLOYER'): string {
    const accountLabel = role === 'EMPLOYER' ? 'agency' : 'job seeker';
    const description = role === 'EMPLOYER'
      ? 'Please verify your email address to finish setting up your agency account.'
      : 'Please verify your email address to finish setting up your job seeker account.';

    return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fa;border-radius:12px">
        <h2 style="color:#1a2b4b;margin-bottom:8px">Verify your email</h2>
        <p style="color:#555;line-height:1.6">
          Welcome to RealEstate. ${description} This link expires in <strong>24 hours</strong>.
        </p>
        <a href="${verificationUrl}"
           style="display:inline-block;margin:24px 0;padding:12px 28px;background:#1a2b4b;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;font-size:15px">
          Verify Email
        </a>
        <p style="color:#888;font-size:13px">
          If you didn't create a RealEstate ${accountLabel} account, you can safely ignore this email.
        </p>
        <p style="color:#bbb;font-size:12px;margin-top:24px">
          Or copy this link into your browser:<br>
          <span style="word-break:break-all">${verificationUrl}</span>
        </p>
      </div>
    `;
  }

  private buildEmployerApprovedHtml(organizationName: string, appUrl?: string): string {
    const safeOrganizationName = this.sanitizeHtml(organizationName);
    const dashboardUrl = appUrl ? `${appUrl}/dashboard` : 'https://admin.realestate.in/dashboard';
    return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fa;border-radius:12px">
        <h2 style="color:#1a2b4b;margin-bottom:8px">Account Approved!</h2>
        <p style="color:#555;line-height:1.6">
          Great news! Your agency account for <strong>${safeOrganizationName}</strong> has been approved.
        </p>
        <p style="color:#555;line-height:1.6">
          You can now access all agency features and start posting property listings on RealEstate.
        </p>
        <p style="color:#888;font-size:13px">
          If you have any questions, please contact our support team.
        </p>
      </div>
    `;
  }

  private buildEmployerSuspendedHtml(organizationName: string, appUrl?: string): string {
    const safeOrganizationName = this.sanitizeHtml(organizationName);
    const supportUrl = appUrl ? `${appUrl}/support` : 'https://realestate.in/support';
    return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fa;border-radius:12px">
        <h2 style="color:#c33;margin-bottom:8px">Account Suspended</h2>
        <p style="color:#555;line-height:1.6">
          Your agency account for <strong>${safeOrganizationName}</strong> has been suspended.
        </p>
        <p style="color:#555;line-height:1.6">
          If you believe this is a mistake or would like more information about this suspension, please contact our support team.
        </p>
        <p style="color:#888;font-size:13px">
          We're here to help resolve any issues.
        </p>
      </div>
    `;
  }

  private buildConsumerActivatedHtml(fullName?: string, appUrl?: string): string {
    const dashboardUrl = appUrl ? `${appUrl}/dashboard` : 'https://realestate.in/dashboard';
    const greeting = fullName ? `Hi ${this.sanitizeHtml(fullName)},` : 'Hi,';
    return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fa;border-radius:12px">
        <h2 style="color:#1a2b4b;margin-bottom:8px">Your Account Has Been Activated</h2>
        <p style="color:#555;line-height:1.6">${greeting}</p>
        <p style="color:#555;line-height:1.6">
          Great news! Your account has been successfully activated. You can now access all features and continue applying for jobs and registering for events on RealEstate.
        </p>
        <p style="color:#888;font-size:13px">
          If you have any questions, please contact our support team.
        </p>
      </div>
    `;
  }

  private buildConsumerDeactivatedHtml(fullName?: string, appUrl?: string): string {
    const supportUrl = appUrl ? `${appUrl}/support` : 'https://realestate.in/support';
    const greeting = fullName ? `Hi ${this.sanitizeHtml(fullName)},` : 'Hi,';
    return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fa;border-radius:12px">
        <h2 style="color:#c33;margin-bottom:8px">Your Account Has Been Deactivated</h2>
        <p style="color:#555;line-height:1.6">${greeting}</p>
        <p style="color:#555;line-height:1.6">
          Your account has been deactivated. You will not be able to access your account or apply for jobs and events at this time.
        </p>
        <p style="color:#555;line-height:1.6">
          If you believe this is a mistake or would like to reactivate your account, please contact our support team.
        </p>      
        <p style="color:#888;font-size:13px">
          We're here to help resolve any issues.
        </p>
      </div>
    `;
  }

  private buildEmployerUserActivatedHtml(fullName?: string, appUrl?: string): string {
    const dashboardUrl = appUrl ? `${appUrl}/dashboard` : 'https://admin.realestate.in/dashboard';
    const greeting = fullName ? `Hi ${this.sanitizeHtml(fullName)},` : 'Hi,';
    return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fa;border-radius:12px">
        <h2 style="color:#1a2b4b;margin-bottom:8px">Your Agency Account Has Been Activated</h2>
        <p style="color:#555;line-height:1.6">${greeting}</p>
        <p style="color:#555;line-height:1.6">
          Great news! Your agency account has been successfully activated. You can now access all agency features and continue posting property listings and managing your organization on RealEstate.
        </p>
       
        <p style="color:#888;font-size:13px">
          If you have any questions, please contact our support team.
        </p>
      </div>
    `;
  }

  private buildEmployerUserDeactivatedHtml(fullName?: string, appUrl?: string): string {
    const supportUrl = appUrl ? `${appUrl}/support` : 'https://realestate.in/support';
    const greeting = fullName ? `Hi ${this.sanitizeHtml(fullName)},` : 'Hi,';
    return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fa;border-radius:12px">
        <h2 style="color:#c33;margin-bottom:8px">Your Agency Account Has Been Deactivated</h2>
        <p style="color:#555;line-height:1.6">${greeting}</p>
        <p style="color:#555;line-height:1.6">
          Your agency account has been deactivated. You will not be able to access your account or post new property listings at this time.
        </p>
        <p style="color:#555;line-height:1.6">
          If you believe this is a mistake or would like to reactivate your account, please contact our support team.
        </p>      
        <p style="color:#888;font-size:13px">
          We're here to help resolve any issues.
        </p>
      </div>
    `;
  }

  private sanitizeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private getProvider(): string {
    return (this.config.get<string>('MAIL_PROVIDER') ?? MailService.DEFAULT_MAIL_PROVIDER).toLowerCase();
  }

  private getPortalUrl(role: 'JOB_SEEKER' | 'EMPLOYER'): string {
    return role === 'EMPLOYER'
      ? (this.config.get<string>('ADMIN_URL') ?? 'https://admin.realestate.in')
      : (this.config.get<string>('APP_URL') ?? 'https://mobile.realestate.in');
  }

  private async sendHtmlEmail(to: string, html: string, subject?: string): Promise<void> {
    const provider = this.getProvider();
    if (provider === 'api') {
      await this.sendViaApi(to, html, subject);
    } else {
      await this.sendViaSmtp(to, html, subject);
    }
  }

  async sendConsumerActivatedEmail(email: string, fullName?: string, appUrl?: string): Promise<void> {
    if (!email) {
      this.logger.warn('sendConsumerActivatedEmail called with empty email');
      return;
    }

    const html = this.buildConsumerActivatedHtml(fullName, appUrl);
    const provider = (this.config.get<string>('MAIL_PROVIDER') ?? MailService.DEFAULT_MAIL_PROVIDER).toLowerCase();

    this.logger.log(`Sending consumer activated email via ${provider} to ${email}`);

    try {
      await this.sendHtmlEmail(
        email,
        html,
        'Your Account Has Been Activated',
      );

      this.logger.log(`Consumer activated email sent successfully via ${provider} to ${email}`);
    } catch (err) {
      this.logger.warn(`Failed to send consumer activated email via ${provider} to ${email}`, err);
    }
  }

  async sendConsumerDeactivatedEmail(email: string, fullName?: string, appUrl?: string): Promise<void> {
    if (!email) {
      this.logger.warn('sendConsumerDeactivatedEmail called with empty email');
      return;
    }

    const html = this.buildConsumerDeactivatedHtml(fullName, appUrl);
    const provider = (this.config.get<string>('MAIL_PROVIDER') ?? MailService.DEFAULT_MAIL_PROVIDER).toLowerCase();

    this.logger.log(`Sending consumer deactivated email via ${provider} to ${email}`);

    try {
      await this.sendHtmlEmail(
        email,
        html,
        'Your Account Has Been Deactivated',
      );

      this.logger.log(`Consumer deactivated email sent successfully via ${provider} to ${email}`);
    } catch (err) {
      this.logger.warn(`Failed to send consumer deactivated email via ${provider} to ${email}`, err);
    }
  }

  async sendEmployerUserActivatedEmail(email: string, fullName?: string, appUrl?: string): Promise<void> {
    if (!email) {
      this.logger.warn('sendEmployerUserActivatedEmail called with empty email');
      return;
    }

    const html = this.buildEmployerUserActivatedHtml(fullName, appUrl);
    const provider = (this.config.get<string>('MAIL_PROVIDER') ?? MailService.DEFAULT_MAIL_PROVIDER).toLowerCase();

    this.logger.log(`Sending employer user activated email via ${provider} to ${email}`);

    try {
      await this.sendHtmlEmail(
        email,
        html,
        'Your Agency Account Has Been Activated',
      );

      this.logger.log(`Employer user activated email sent successfully via ${provider} to ${email}`);
    } catch (err) {
      this.logger.warn(`Failed to send employer user activated email via ${provider} to ${email}`, err);
    }
  }

  async sendEmployerUserDeactivatedEmail(email: string, fullName?: string, appUrl?: string): Promise<void> {
    if (!email) {
      this.logger.warn('sendEmployerUserDeactivatedEmail called with empty email');
      return;
    }

    const html = this.buildEmployerUserDeactivatedHtml(fullName, appUrl);
    const provider = (this.config.get<string>('MAIL_PROVIDER') ?? MailService.DEFAULT_MAIL_PROVIDER).toLowerCase();

    this.logger.log(`Sending employer user deactivated email via ${provider} to ${email}`);

    try {
      await this.sendHtmlEmail(
        email,
        html,
        'Your Agency Account Has Been Deactivated',
      );

      this.logger.log(`Employer user deactivated email sent successfully via ${provider} to ${email}`);
    } catch (err) {
      this.logger.warn(`Failed to send employer user deactivated email via ${provider} to ${email}`, err);
    }
  }

  private async sendViaSmtp(to: string, html: string, subject?: string): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM') ?? '"RealEstate" <noreply@realestate.in>';

    await this.transporter.sendMail({
      from,
      to,
      subject: subject ?? 'Reset your RealEstate password',
      html,
    });
  }

  private async sendViaApi(to: string, html: string, subject?: string): Promise<void> {
    const apiUrl = this.config.get<string>('MX18_API_URL') ?? 'https://api.mx18.com/api/1/mail/send';
    const apiKey = this.config.get<string>('MX18_API_KEY');
    const fromName = this.config.get<string>('MX18_FROM_NAME') ?? 'RealEstate';
    const fromEmail = this.config.get<string>('MX18_FROM_EMAIL') ?? 'no-reply@realestate.in';

    if (!apiKey) {
      throw new Error('MX18 API key is not configured');
    }

    const payload = {
      from: {
        name: fromName,
        email: fromEmail,
      },
      to: [
        {
          email: to,
        },
      ],
      message: {
        subject: subject ?? 'Reset your RealEstate password',
        content: [
          {
            type: 'text/html',
            value: html,
          },
        ],
      },
    };

    await axios.post(apiUrl, payload, {
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });
  }
}
