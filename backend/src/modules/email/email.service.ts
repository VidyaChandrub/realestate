import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { PrismaService } from '../../database/prisma.service';
import {
  UpdateEmailConfigDto,
  SendTestEmailDto,
  ListEmailLogsDto,
} from './dto/email.dto';
import {
  getInviteEmailHtml,
  getResetPasswordEmailHtml,
  getTestEmailHtml,
  getVerificationEmailHtml,
  getOrgApprovedEmailHtml,
} from './email.templates';

export function frontendBaseUrl(): string {
  const raw =
    process.env.APP_FRONTEND_URL ||
    process.env.APP_URL ||
    'http://localhost:3000';
  return raw.replace(/\/$/, '');
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  template?: 'invite' | 'password_reset' | 'test' | 'notification' | 'system';
  metadata?: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private cachedConfig: any = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Production often never ran seed, so these tables may be missing.
   * GET /config swallows that and returns env defaults; PUT must create them.
   */
  private async ensureEmailTables() {
    await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS identity;`);
    await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS audit;`);
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS identity.email_configs (
        id TEXT PRIMARY KEY,
        host TEXT NOT NULL,
        port INTEGER NOT NULL DEFAULT 587,
        secure BOOLEAN NOT NULL DEFAULT false,
        "user" TEXT NOT NULL DEFAULT '',
        password TEXT NOT NULL DEFAULT '',
        from_email TEXT NOT NULL,
        from_name TEXT NOT NULL DEFAULT 'iPixxel Realty',
        reply_to TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        invite_subject TEXT,
        invite_body TEXT,
        reset_subject TEXT,
        reset_body TEXT,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await this.prisma.$executeRawUnsafe(
      `ALTER TABLE identity.email_configs ADD COLUMN IF NOT EXISTS invite_subject TEXT;`,
    );
    await this.prisma.$executeRawUnsafe(
      `ALTER TABLE identity.email_configs ADD COLUMN IF NOT EXISTS invite_body TEXT;`,
    );
    await this.prisma.$executeRawUnsafe(
      `ALTER TABLE identity.email_configs ADD COLUMN IF NOT EXISTS reset_subject TEXT;`,
    );
    await this.prisma.$executeRawUnsafe(
      `ALTER TABLE identity.email_configs ADD COLUMN IF NOT EXISTS reset_body TEXT;`,
    );
  }

  /**
   * Fetch active config from database, or fallback to environment variables.
   */
  async getConfig() {
    try {
      const config = await this.prisma.emailConfig.findFirst({
        orderBy: { updatedAt: 'desc' },
      });
      if (config) {
        return {
          ...config,
          // Mask password for safety on read
          password: config.password ? '••••••••' : '',
          hasPassword: Boolean(config.password),
        };
      }
    } catch (err) {
      this.logger.warn(`Could not read EmailConfig from DB: ${err.message}`);
    }

    // Default fallback from environment variables
    return {
      id: null,
      host: process.env.SMTP_HOST || '',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASSWORD ? '••••••••' : '',
      hasPassword: Boolean(process.env.SMTP_PASSWORD),
      fromEmail: process.env.SMTP_FROM_EMAIL || 'notifications@ipixxelrealty.com',
      fromName: process.env.SMTP_FROM_NAME || 'iPixxel Realty',
      replyTo: process.env.SMTP_REPLY_TO || null,
      isActive: process.env.SMTP_ACTIVE !== 'false',
      inviteSubject: null,
      inviteBody: null,
      resetSubject: null,
      resetBody: null,
    };
  }

  /**
   * Update or create the Super Admin's SMTP configuration.
   */
  async updateConfig(dto: UpdateEmailConfigDto) {
    await this.ensureEmailTables();

    let existing: any = null;
    try {
      existing = await this.prisma.emailConfig.findFirst({
        orderBy: { updatedAt: 'desc' },
      });
    } catch (e: any) {
      this.logger.warn('Failed to query emailConfig table: ' + e.message);
    }

    // If password is blank or masked ('••••••••'), preserve existing password
    let passwordToSave = dto.password;
    if (!passwordToSave || passwordToSave === '••••••••') {
      passwordToSave = existing?.password || process.env.SMTP_PASSWORD || '';
    }

    let saved;
    if (existing) {
      saved = await this.prisma.emailConfig.update({
        where: { id: existing.id },
        data: {
          host: dto.host,
          port: dto.port,
          secure: dto.secure,
          user: dto.user || '',
          password: passwordToSave,
          fromEmail: dto.fromEmail,
          fromName: dto.fromName,
          replyTo: dto.replyTo || null,
          isActive: dto.isActive ?? true,
          inviteSubject: dto.inviteSubject || null,
          inviteBody: dto.inviteBody || null,
          resetSubject: dto.resetSubject || null,
          resetBody: dto.resetBody || null,
        },
      });
    } else {
      saved = await this.prisma.emailConfig.create({
        data: {
          host: dto.host,
          port: dto.port,
          secure: dto.secure,
          user: dto.user || '',
          password: passwordToSave,
          fromEmail: dto.fromEmail,
          fromName: dto.fromName,
          replyTo: dto.replyTo || null,
          isActive: dto.isActive ?? true,
          inviteSubject: dto.inviteSubject || null,
          inviteBody: dto.inviteBody || null,
          resetSubject: dto.resetSubject || null,
          resetBody: dto.resetBody || null,
        },
      });
    }

    // Invalidate cached transporter so next send uses updated credentials
    this.transporter = null;
    this.cachedConfig = null;

    return {
      ...saved,
      password: saved.password ? '••••••••' : '',
      hasPassword: Boolean(saved.password),
    };
  }

  /**
   * Internal helper to build Nodemailer transporter
   */
  private async getTransporter(): Promise<{ transporter: Transporter; from: string }> {
    let config: any = null;
    try {
      config = await this.prisma.emailConfig.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (err: any) {
      this.logger.warn(`Could not load emailConfig: ${err.message}`);
    }

    const host = config?.host || process.env.SMTP_HOST;
    const port = config?.port || Number(process.env.SMTP_PORT) || 587;
    const secure = config ? config.secure : process.env.SMTP_SECURE === 'true';
    const user = config ? config.user : process.env.SMTP_USER;
    const pass = config ? config.password : process.env.SMTP_PASSWORD;
    const fromEmail = config?.fromEmail || process.env.SMTP_FROM_EMAIL || 'notifications@ipixxelrealty.com';
    const fromName = config?.fromName || process.env.SMTP_FROM_NAME || 'iPixxel Realty';

    if (!host) {
      throw new BadRequestException('SMTP Host is not configured in Super Admin settings.');
    }

    const auth = user ? { user, pass } : undefined;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      tls: {
        rejectUnauthorized: false, // Allows flexible self-signed/testing certs
      },
    });

    const from = `"${fromName}" <${fromEmail}>`;
    return { transporter, from };
  }

  /**
   * Core sendMail method used by all features (invites, password resets, notifications).
   * Automatically creates audit logs in EmailLog.
   */
  async sendMail(options: SendMailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, subject, html, text, template = 'system', metadata } = options;

    let errorStr: string | undefined = undefined;
    let messageId: string | undefined = undefined;

    try {
      const { transporter, from } = await this.getTransporter();

      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>?/gm, ''),
      });

      messageId = info.messageId;
      this.logger.log(`Email dispatched successfully to ${to} [${template}]: ${messageId}`);

      await this.logEmailDispatch({
        to,
        subject,
        template,
        status: 'sent',
        metadata: { ...metadata, messageId },
      });

      return { success: true, messageId };
    } catch (err: any) {
      errorStr = err.message || 'Unknown SMTP error';
      this.logger.error(`Failed to send email to ${to} [${template}]: ${errorStr}`);

      await this.logEmailDispatch({
        to,
        subject,
        template,
        status: 'failed',
        error: errorStr,
        metadata,
      });

      return { success: false, error: errorStr };
    }
  }

  /**
   * Send test email to verify SMTP configuration
   */
  async sendTestEmail(dto: SendTestEmailDto) {
    const config = await this.getConfig();
    if (!config.host) {
      throw new BadRequestException('Please configure an SMTP Host before sending a test email.');
    }

    const sentAt = new Date().toLocaleString();
    const html = getTestEmailHtml({
      host: config.host,
      senderName: config.fromName,
      sentAt,
    });

    const subject = dto.subject || `SMTP Test Verification - ${config.fromName}`;
    const result = await this.sendMail({
      to: dto.to,
      subject,
      html,
      template: 'test',
      metadata: { initiatedBy: 'Super Admin Test Trigger' },
    });

    if (!result.success) {
      throw new BadRequestException(`Failed to send test email: ${result.error}`);
    }

    return {
      success: true,
      message: `Test email successfully sent to ${dto.to}`,
      messageId: result.messageId,
    };
  }

  /**
   * Query email dispatch logs with pagination
   */
  async listLogs(query: ListEmailLogsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { to: { contains: query.search, mode: 'insensitive' } },
        { subject: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    try {
      const [logs, total] = await Promise.all([
        this.prisma.emailLog.findMany({
          where,
          orderBy: { sentAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.emailLog.count({ where }),
      ]);

      return {
        data: logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (err) {
      this.logger.warn(`Could not load email logs: ${err.message}`);
      return { data: [], total: 0, page: 1, limit, totalPages: 0 };
    }
  }

  /**
   * Get stats for Super Admin dashboard / email settings
   */
  async getStats() {
    try {
      const [totalSent, totalFailed, lastLog] = await Promise.all([
        this.prisma.emailLog.count({ where: { status: 'sent' } }),
        this.prisma.emailLog.count({ where: { status: 'failed' } }),
        this.prisma.emailLog.findFirst({ orderBy: { sentAt: 'desc' } }),
      ]);

      return {
        totalSent,
        totalFailed,
        totalDispatched: totalSent + totalFailed,
        lastDispatchedAt: lastLog?.sentAt || null,
      };
    } catch {
      return {
        totalSent: 0,
        totalFailed: 0,
        totalDispatched: 0,
        lastDispatchedAt: null,
      };
    }
  }

  /**
   * Helper to write to audit.EmailLog safely
   */
  private async logEmailDispatch(data: {
    to: string;
    subject: string;
    template: string;
    status: string;
    error?: string;
    metadata?: any;
  }) {
    try {
      await this.prisma.emailLog.create({
        data: {
          to: data.to,
          subject: data.subject,
          template: data.template,
          status: data.status,
          error: data.error || null,
          metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
        },
      });
    } catch (e) {
      this.logger.warn(`Could not record EmailLog entry: ${e.message}`);
    }
  }

  // --- Ready-to-use helpers for application triggers ---

  async sendInviteEmail(params: {
    to: string;
    recipientName?: string;
    orgName?: string;
    role: string;
    tempPassword?: string;
    loginUrl?: string;
  }) {
    const loginUrl =
      params.loginUrl || `${frontendBaseUrl()}/login`;

    const config = await this.getConfig();

    const html = getInviteEmailHtml({
      recipientName: params.recipientName,
      orgName: params.orgName,
      role: params.role,
      tempPassword: params.tempPassword,
      loginUrl,
      customBody: config.inviteBody || undefined,
    });

    let subject = config.inviteSubject || `You've been invited to join ${params.orgName || 'iPixxel Realty'}`;
    subject = subject
      .replace(/{orgName}/g, params.orgName || 'iPixxel Realty')
      .replace(/{recipientName}/g, params.recipientName || 'there')
      .replace(/{role}/g, params.role);

    return this.sendMail({
      to: params.to,
      subject,
      html,
      template: 'invite',
      metadata: { orgName: params.orgName, role: params.role },
    });
  }

  async sendPasswordResetEmail(params: {
    to: string;
    recipientName?: string;
    resetToken: string;
    resetUrl?: string;
  }) {
    const resetUrl =
      params.resetUrl ||
      `${frontendBaseUrl()}/reset-password?token=${encodeURIComponent(params.resetToken)}`;

    const config = await this.getConfig();

    const html = getResetPasswordEmailHtml({
      recipientName: params.recipientName,
      resetUrl,
      customBody: config.resetBody || undefined,
    });

    let subject = config.resetSubject || 'Reset your iPixxel Realty password';
    subject = subject.replace(/{recipientName}/g, params.recipientName || 'there');

    return this.sendMail({
      to: params.to,
      subject,
      html,
      template: 'password_reset',
      metadata: { tokenPrefix: params.resetToken.substring(0, 6) },
    });
  }

  async sendVerificationEmail(params: {
    to: string;
    recipientName?: string;
    code: string;
  }) {
    const verifyUrl = `${frontendBaseUrl()}/verify-email?email=${encodeURIComponent(params.to)}`;
    const html = getVerificationEmailHtml({
      recipientName: params.recipientName,
      code: params.code,
      verifyUrl,
    });
    return this.sendMail({
      to: params.to,
      subject: 'Verify your iPixxel Realty email',
      html,
      template: 'notification',
      metadata: { kind: 'email_verification' },
    });
  }

  async sendOrgApprovedEmail(params: {
    to: string;
    recipientName?: string;
    orgName?: string;
  }) {
    const html = getOrgApprovedEmailHtml({
      recipientName: params.recipientName,
      orgName: params.orgName,
      loginUrl: `${frontendBaseUrl()}/login`,
    });
    return this.sendMail({
      to: params.to,
      subject: `${params.orgName || 'Your organisation'} is approved — you can sign in`,
      html,
      template: 'notification',
      metadata: { kind: 'org_approved', orgName: params.orgName },
    });
  }
}
