import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateDnsInstructions, generateVerificationToken, isValidDomain, normalizeDomain } from '../../common/utils/domain.util';
import { CreateDomainRequestDto } from './dto/create-domain-request.dto';

@Injectable()
export class OrgDomainRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, userId: string, dto: CreateDomainRequestDto) {
    const page = await this.prisma.landingPage.findFirst({ where: { id: dto.landingPageId, orgId } });
    if (!page) throw new NotFoundException('Page not found or not owned by your organisation');

    const domain = normalizeDomain(dto.domain);
    if (!isValidDomain(domain)) throw new BadRequestException('Invalid domain format. Example: example.com');
    // Prevent duplicate domain across all templates (global uniqueness)
    const existingDomain = await this.prisma.domainRequest.findFirst({ where: { domain } });
    if (existingDomain && existingDomain.landingPageId !== dto.landingPageId) {
      throw new ConflictException('Domain is already connected to another website');
    }
    // One request per page - update if pending/rejected else conflict
    const existingForPage = await this.prisma.domainRequest.findUnique({ where: { landingPageId: dto.landingPageId } });
    if (existingForPage) {
      if (['pending', 'verification_pending', 'dns_required'].includes(existingForPage.status)) {
        throw new ConflictException('A domain request is already pending for this website');
      }
      if (existingForPage.status === 'connected') {
        throw new ConflictException('This website already has a connected domain');
      }
      // allow recreate after rejected/failed - delete old
      await this.prisma.domainRequest.delete({ where: { landingPageId: dto.landingPageId } });
    }

    const token = generateVerificationToken();
    const instructions = generateDnsInstructions(domain, token);
    const expected = instructions.records;

    const created = await this.prisma.domainRequest.create({
      data: {
        orgId,
        landingPageId: dto.landingPageId,
        domain,
        status: 'pending',
        requestedBy: userId,
        verificationToken: token,
        dnsInstructions: instructions as any,
        expectedRecords: expected as any,
        dnsStatus: 'pending',
        sslStatus: 'pending',
      },
    });

    await this.prisma.auditLog.create({
      data: { orgId, actorId: userId, action: 'domain_request_created', entity: 'DomainRequest', entityId: created.id, metadata: { domain, landingPageId: dto.landingPageId } as any },
    });

    return created;
  }

  async list(orgId: string) {
    return this.prisma.domainRequest.findMany({ where: { orgId }, orderBy: { createdAt: 'desc' }, include: { landingPage: { select: { id: true, name: true, slug: true } } } });
  }

  async getByPage(orgId: string, landingPageId: string) {
    const page = await this.prisma.landingPage.findFirst({ where: { id: landingPageId, orgId } });
    if (!page) throw new NotFoundException('Page not found');
    const req = await this.prisma.domainRequest.findUnique({ where: { landingPageId }, include: { logs: { orderBy: { checkedAt: 'desc' }, take: 10 } } });
    if (!req) throw new NotFoundException('No domain request for this website');
    if (req.orgId !== orgId) throw new ForbiddenException('Access denied');
    return req;
  }

  async verify(orgId: string, landingPageId: string) {
    const req = await this.getByPage(orgId, landingPageId);
    if (!['approved', 'dns_required', 'verification_pending', 'verified', 'ssl_pending', 'connected', 'verification_failed'].includes(req.status)) {
      throw new BadRequestException(`Cannot verify in status: ${req.status}. Wait for admin approval.`);
    }
    return this.performVerification(req);
  }

  async performVerification(req: any) {
    // Simulate DNS check: in real infra we would do DNS lookup. Here we fake:
    // If domain contains 'fail' we simulate failure; otherwise if approved we auto-verify after check
    // For demo, we consider verification successful if status was approved/dns_required/verification_pending
    // Add random but deterministic? For testing we allow manual control via env FORCE_DNS_VERIFY=true
    const force = process.env.FORCE_DNS_VERIFY === 'true';
    const shouldFail = req.domain.includes('fail') && !force;
    const dnsSuccess = !shouldFail;
    const now = new Date();
    const updateData: any = {
      lastVerificationAt: now,
      detectedRecords: req.expectedRecords,
    };
    let logMessage = '';
    if (dnsSuccess) {
      updateData.dnsStatus = 'verified';
      updateData.verifiedAt = now;
      // proceed to SSL
      if (req.status === 'approved' || req.status === 'dns_required' || req.status === 'verification_pending' || req.status === 'verification_failed') {
        updateData.status = 'verified';
        // auto move to ssl_pending
        updateData.status = 'ssl_pending';
        // simulate SSL generation immediately for demo
        updateData.sslStatus = 'active';
        updateData.sslIssuedAt = now;
        updateData.sslExpiresAt = new Date(Date.now() + 90 * 24 * 3600 * 1000);
        updateData.status = 'connected';
        logMessage = 'DNS verified and SSL issued. Domain connected.';
      } else if (req.status === 'verified' || req.status === 'ssl_pending') {
        updateData.sslStatus = 'active';
        updateData.status = 'connected';
        logMessage = 'SSL active. Domain connected.';
      }
    } else {
      updateData.dnsStatus = 'failed';
      updateData.status = 'verification_failed';
      logMessage = 'DNS verification failed. Expected records not found. Detected: missing TXT verification.';
      updateData.detectedRecords = [];
    }

    const updated = await this.prisma.domainRequest.update({ where: { id: req.id }, data: updateData });

    await this.prisma.dnsVerificationLog.create({
      data: { domainRequestId: req.id, success: dnsSuccess, expected: req.expectedRecords as any, detected: updateData.detectedRecords as any, message: logMessage },
    });

    await this.prisma.auditLog.create({
      data: { orgId: req.orgId, action: dnsSuccess ? 'domain_dns_verified' : 'domain_dns_failed', entity: 'DomainRequest', entityId: req.id, metadata: { domain: req.domain, success: dnsSuccess } as any },
    });

    return { ...updated, verificationResult: { success: dnsSuccess, message: logMessage, expected: req.expectedRecords, detected: updateData.detectedRecords } };
  }

  // Background periodic check - called by cron or admin re-check
  async autoCheckAllPending() {
    const pending = await this.prisma.domainRequest.findMany({ where: { status: { in: ['approved', 'dns_required', 'verification_pending'] } } });
    for (const req of pending) {
      try {
        await this.performVerification(req);
      } catch {}
    }
    return pending.length;
  }
}
