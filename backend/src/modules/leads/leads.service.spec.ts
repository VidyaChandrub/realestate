import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { PrismaService } from '../../database/prisma.service';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';

function actor(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return { sub: 'user-1', orgId: 'org-1', roles: ['admin'], ...overrides };
}

describe('LeadsService', () => {
  let service: LeadsService;
  let prisma: {
    lead: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    landingPage: { findUnique: jest.Mock };
    user: { findFirst: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      lead: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      landingPage: { findUnique: jest.fn() },
      user: { findFirst: jest.fn(), findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [LeadsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
  });

  describe('list', () => {
    it('admin sees every lead in the org', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      prisma.lead.count.mockResolvedValue(0);

      await service.list('org-1', actor());

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: 'org-1' },
        }),
      );
    });

    it('sales user only sees leads assigned to them', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      prisma.lead.count.mockResolvedValue(0);

      await service.list('org-1', actor({ roles: ['sales'], sub: 'sales-9' }));

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: 'org-1', assignedToId: 'sales-9' },
        }),
      );
    });

    it('manager user only sees leads assigned to them', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      prisma.lead.count.mockResolvedValue(0);

      await service.list('org-1', actor({ roles: ['manager'], sub: 'mgr-2' }));

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: 'org-1', assignedToId: 'mgr-2' },
        }),
      );
    });
  });

  describe('createFromPublic', () => {
    it('throws when landingPageId is missing', async () => {
      await expect(service.createFromPublic({ data: {} })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when the landing page does not exist', async () => {
      prisma.landingPage.findUnique.mockResolvedValue(null);
      await expect(
        service.createFromPublic({ landingPageId: 'lp-x', data: {} }),
      ).rejects.toThrow(NotFoundException);
    });

    it('resolves org from the landing page and creates the lead', async () => {
      prisma.landingPage.findUnique.mockResolvedValue({ orgId: 'org-42' });
      prisma.lead.create.mockResolvedValue({ id: 'lead-1' });

      const result = await service.createFromPublic({
        landingPageId: 'lp-x',
        formName: 'enquiry',
        source: 'website',
        data: { name: 'Aarav' },
      });

      expect(prisma.lead.create).toHaveBeenCalledWith({
        data: {
          orgId: 'org-42',
          landingPageId: 'lp-x',
          formName: 'enquiry',
          source: 'website',
          data: { name: 'Aarav' },
        },
      });
      expect(result.id).toBe('lead-1');
    });
  });

  describe('assign', () => {
    const foundLead = {
      id: 'lead-1',
      orgId: 'org-1',
      status: 'new',
      assignedToId: null,
    };

    it('throws when the lead is not in the org', async () => {
      prisma.lead.findFirst.mockResolvedValue(null);
      await expect(
        service.assign('org-1', 'lead-1', { assignedToId: null }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when the assignee is not in the same org (isolation)', async () => {
      prisma.lead.findFirst.mockResolvedValue(foundLead);
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.assign('org-1', 'lead-1', { assignedToId: 'other-org-user' }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'other-org-user', orgId: 'org-1' },
        select: { id: true },
      });
    });

    it('assigns a lead to an in-org user and sets status', async () => {
      prisma.lead.findFirst.mockResolvedValue(foundLead);
      prisma.user.findFirst.mockResolvedValue({ id: 'sales-9' });
      prisma.lead.update.mockResolvedValue({
        id: 'lead-1',
        status: 'follow_up',
        assignedTo: {
          id: 'sales-9',
          firstName: 'Rohit',
          lastName: 'Menon',
          email: 'r@x.com',
        },
      });

      const result = await service.assign('org-1', 'lead-1', {
        assignedToId: 'sales-9',
        status: 'follow_up',
      });

      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { assignedToId: 'sales-9', status: 'follow_up' },
        include: expect.anything() as never,
      });
      expect(result.assignedTo?.name).toBe('Rohit Menon');
    });

    it('unassigns a lead when assignedToId is null', async () => {
      prisma.lead.findFirst.mockResolvedValue({
        ...foundLead,
        assignedToId: 'sales-9',
      });
      prisma.lead.update.mockResolvedValue({
        id: 'lead-1',
        status: 'new',
        assignedTo: null,
      });

      const result = await service.assign('org-1', 'lead-1', {
        assignedToId: null,
      });

      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { assignedToId: null },
        include: expect.anything() as never,
      });
      expect(result.assignedTo).toBeNull();
    });
  });

  describe('listAssignableUsers', () => {
    it('only returns active manager/sales users in the org', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'sales-9',
          firstName: 'Rohit',
          lastName: 'Menon',
          email: 'r@x.com',
          userRoles: [{ role: { key: 'sales', name: 'Sales' } }],
        },
      ]);

      const { data } = await service.listAssignableUsers('org-1');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            orgId: 'org-1',
            status: 'active',
            userRoles: {
              some: { role: { key: { in: ['manager', 'sales'] } } },
            },
          },
        }),
      );
      expect(data[0].name).toBe('Rohit Menon');
    });
  });
});
