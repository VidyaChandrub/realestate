import { Prisma } from '@prisma/client';
import { MetaLeadsService, resolveMetaChannel } from './meta-leads.service';
import type { PrismaService } from '../../database/prisma.service';

describe('resolveMetaChannel', () => {
  it.each(['ig', 'IG', 'instagram', 'Instagram ', 'instagram_feed'])(
    'maps %p to instagram',
    (value) => {
      expect(resolveMetaChannel(value)).toBe('instagram');
    },
  );

  it.each(['fb', 'facebook', '', undefined, null, 'something_else'])(
    'maps %p to facebook',
    (value) => {
      expect(resolveMetaChannel(value)).toBe('facebook');
    },
  );
});

describe('MetaLeadsService.ingestLeadgen', () => {
  let service: MetaLeadsService;
  let prisma: {
    lead: { findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
    metaPageConnection: { findFirst: jest.Mock };
    marketingConnection: { findFirst: jest.Mock };
    projectSalesAgent: { findMany: jest.Mock };
    activityEvent: { create: jest.Mock };
  };
  let fetchMock: jest.Mock;
  const originalFetch = global.fetch;

  /** Graph lead as returned for `GET /{leadgen-id}`. */
  function mockGraphLead(lead: Record<string, unknown>) {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'lg-1',
          form_id: 'form-1',
          field_data: [
            { name: 'full_name', values: ['Asha Rao'] },
            { name: 'phone_number', values: ['+919800000000'] },
          ],
          ...lead,
        }),
    });
  }

  function createdData(): Record<string, any> {
    return prisma.lead.create.mock.calls[0][0].data;
  }

  beforeEach(() => {
    prisma = {
      lead: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'lead-1', ...data }),
          ),
      },
      metaPageConnection: {
        findFirst: jest.fn().mockResolvedValue({
          orgId: 'org-1',
          projectId: null,
          accessToken: 'page-token',
        }),
      },
      marketingConnection: { findFirst: jest.fn().mockResolvedValue(null) },
      projectSalesAgent: { findMany: jest.fn().mockResolvedValue([]) },
      activityEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new MetaLeadsService(prisma as unknown as PrismaService);
    jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('requests platform and is_organic from Graph, and no page_id', async () => {
    mockGraphLead({});
    await service.ingestLeadgen({ leadgenId: 'lg-1', pageId: 'page-1' });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    const fields = (url.searchParams.get('fields') ?? '').split(',');
    expect(fields).toEqual(expect.arrayContaining(['platform', 'is_organic']));
    expect(fields).not.toContain('page_id');
  });

  it('labels a paid Instagram lead as Instagram', async () => {
    mockGraphLead({ platform: 'ig', is_organic: false });
    await service.ingestLeadgen({ leadgenId: 'lg-1', pageId: 'page-1' });

    const data = createdData();
    expect(data).toMatchObject({
      source: 'Instagram',
      platform: 'instagram',
      medium: 'Paid Social',
      utmSource: 'Instagram',
      metaLeadgenId: 'lg-1',
      metaPageId: 'page-1',
    });
    expect(data.data).toMatchObject({
      metaPlatform: 'ig',
      metaIsOrganic: false,
    });
    expect(prisma.activityEvent.create.mock.calls[0][0].data.text).toBe(
      'Lead captured from Instagram Lead Ads',
    );
  });

  it('keeps Facebook for a Testing Tool lead (no platform, organic)', async () => {
    mockGraphLead({ is_organic: true });
    await service.ingestLeadgen({ leadgenId: 'lg-1', pageId: 'page-1' });

    const data = createdData();
    expect(data).toMatchObject({
      source: 'Facebook',
      platform: 'meta',
      medium: 'Organic Social',
      utmSource: 'Facebook',
    });
    expect(data.data).not.toHaveProperty('metaPlatform');
    expect(prisma.activityEvent.create.mock.calls[0][0].data.text).toBe(
      'Lead captured from Facebook Lead Ads',
    );
  });

  it('defaults to Paid Social when is_organic is missing', async () => {
    mockGraphLead({ platform: 'fb' });
    await service.ingestLeadgen({ leadgenId: 'lg-1', pageId: 'page-1' });

    expect(createdData()).toMatchObject({
      source: 'Facebook',
      platform: 'meta',
      medium: 'Paid Social',
    });
  });

  it('does not log contact details', async () => {
    mockGraphLead({ platform: 'ig', is_organic: false });
    await service.ingestLeadgen({ leadgenId: 'lg-1', pageId: 'page-1' });

    const logged = (service['logger'].log as jest.Mock).mock.calls
      .map((call) => String(call[0]))
      .join('\n');
    expect(logged).toContain('lg-1');
    expect(logged).toContain('"ig"');
    expect(logged).not.toContain('Asha');
    expect(logged).not.toContain('9800000000');
  });

  it('creates a single lead when the same leadgen id arrives twice', async () => {
    mockGraphLead({ platform: 'ig', is_organic: false });
    await service.ingestLeadgen({ leadgenId: 'lg-1', pageId: 'page-1' });

    prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
    const second = await service.ingestLeadgen({
      leadgenId: 'lg-1',
      pageId: 'page-1',
    });

    expect(second).toEqual({ id: 'lead-1' });
    expect(prisma.lead.create).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns the existing lead when a concurrent insert wins the race', async () => {
    mockGraphLead({ platform: 'ig', is_organic: false });
    prisma.lead.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'lead-1' });
    prisma.lead.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const result = await service.ingestLeadgen({
      leadgenId: 'lg-1',
      pageId: 'page-1',
    });

    expect(result).toEqual({ id: 'lead-1' });
    expect(prisma.activityEvent.create).not.toHaveBeenCalled();
  });
});
