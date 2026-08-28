import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateDnsInstructions, getInfraInfo } from '../../common/utils/domain.util';

@Injectable()
export class AdminDomainRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: { status?: string; search?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [{ domain: { contains: query.search, mode: 'insensitive' } }];
    }
    const [rows, total] = await Promise.all([
      this.prisma.domainRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          organisation: { select: { id: true, name: true, slug: true } },
          landingPage: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.domainRequest.count({ where }),
    ]);
    return { data: rows, total, page, limit };
  }

  async getById(id: string) {
    const req = await this.prisma.domainRequest.findUnique({
      where: { id },
      include: {
        organisation: { select: { id: true, name: true, slug: true } },
        landingPage: { select: { id: true, name: true, slug: true } },
        logs: { orderBy: { checkedAt: 'desc' }, take: 20 },
      },
    });
    if (!req) throw new NotFoundException('Domain request not found');
    return req;
  }

  async approve(id: string, adminId: string) {
    const req = await this.prisma.domainRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Domain request not found');
    if (req.status !== 'pending') throw new BadRequestException(`Cannot approve from status ${req.status}`);
    const instructions = generateDnsInstructions(req.domain, req.verificationToken);
    const updated = await this.prisma.domainRequest.update({
      where: { id },
      data: {
        status: 'dns_required',
        dnsStatus: 'pending',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        dnsInstructions: instructions as any,
        expectedRecords: instructions.records as any,
      },
    });
    await this.prisma.auditLog.create({ data: { action: 'domain_request_approved', entity: 'DomainRequest', entityId: id, metadata: { domain: req.domain } as any } });
    return updated;
  }

  async reject(id: string, adminId: string, reason?: string) {
    const req = await this.prisma.domainRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Domain request not found');
    if (req.status !== 'pending') throw new BadRequestException(`Cannot reject from status ${req.status}`);
    if (!reason) throw new BadRequestException('Rejection reason is required');
    const updated = await this.prisma.domainRequest.update({
      where: { id },
      data: { status: 'rejected', reviewedAt: new Date(), reviewedBy: adminId, rejectionReason: reason },
    });
    await this.prisma.auditLog.create({ data: { action: 'domain_request_rejected', entity: 'DomainRequest', entityId: id, metadata: { domain: req.domain, reason } as any } });
    return updated;
  }

  async recheckDns(id: string) {
    const req = await this.prisma.domainRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Domain request not found');
    // reuse verification logic - simulate DNS check
    const shouldFail = req.domain.includes('fail');
    const success = !shouldFail;
    const now = new Date();
    let update: any = { lastVerificationAt: now };
    let msg = '';
    if (success) {
      update.dnsStatus = 'verified';
      update.verifiedAt = now;
      update.status = 'ssl_pending';
      // auto SSL
      update.sslStatus = 'active';
      update.sslIssuedAt = now;
      update.sslExpiresAt = new Date(Date.now() + 90 * 24 * 3600 * 1000);
      update.status = 'connected';
      msg = 'DNS verified and SSL activated. Domain connected.';
    } else {
      update.dnsStatus = 'failed';
      update.status = 'verification_failed';
      update.detectedRecords = [];
      msg = 'DNS verification failed.';
    }
    const updated = await this.prisma.domainRequest.update({ where: { id }, data: update });
    await this.prisma.dnsVerificationLog.create({ data: { domainRequestId: id, success, expected: req.expectedRecords as any, detected: update.detectedRecords ?? req.expectedRecords as any, message: msg } });
    await this.prisma.auditLog.create({ data: { action: success ? 'domain_dns_verified' : 'domain_dns_failed', entity: 'DomainRequest', entityId: id, metadata: { success } as any } });
    return { ...updated, result: { success, message: msg } };
  }

  async getInfra() {
    return getInfraInfo();
  }
}
