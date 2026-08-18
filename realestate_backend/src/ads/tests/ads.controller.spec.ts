// src/ads/tests/ads.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { AdsController } from '../../api/ads.controller';
import { AdsService } from '../services/ads.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CampaignStatus, CampaignType, PricingModel } from '@prisma/client';

// ─── Mock request user ───────────────────────────────────────────────────────
const mockUser = { userId: 'user-1', role: 'EMPLOYER' };
const mockAdminUser = { userId: 'admin-1', role: 'ADMIN' };

const makeCampaignResponse = (overrides: Partial<any> = {}): any => ({
    id: 'campaign-1',
    organizationId: 'org-1',
    name: 'Test Campaign',
    type: CampaignType.IMAGE,
    entityType: null,
    entityId: null,
    pricingModel: PricingModel.CPC,
    status: CampaignStatus.DRAFT,
    budgetTotal: '5000',
    budgetSpent: '0',
    costPerClick: '10',
    cosPerThousandImpressions: null,
    flatFee: null,
    dailyLimit: null,
    startDate: null,
    endDate: null,
    boostScore: 0,
    isArchived: false,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe('AdsController', () => {
    let controller: AdsController;

    const mockAdsService = {
        createCampaign: jest.fn(),
        updateCampaign: jest.fn(),
        submitCampaign: jest.fn(),
        approveCampaign: jest.fn(),
        rejectCampaign: jest.fn(),
        activateCampaign: jest.fn(),
        pauseCampaign: jest.fn(),
        endCampaign: jest.fn(),
        findAllByOrg: jest.fn(),
        findOne: jest.fn(),
        addCreative: jest.fn(),
        upsertTargeting: jest.fn(),
        getStats: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AdsController],
            providers: [{ provide: AdsService, useValue: mockAdsService }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (ctx: ExecutionContext) => {
                    const req = ctx.switchToHttp().getRequest();
                    req.user = mockUser;
                    return true;
                },
            })
            .compile();

        controller = module.get<AdsController>(AdsController);
    });

    describe('POST /campaigns (create)', () => {
        it('should call adsService.createCampaign and return the result', async () => {
            const dto = { name: 'Test', type: CampaignType.IMAGE, pricingModel: PricingModel.CPC, budgetTotal: 5000, costPerClick: 10 } as any;
            const campaign = makeCampaignResponse();
            mockAdsService.createCampaign.mockResolvedValue(campaign);

            const result = await controller.create(dto, 'org-1', { user: mockUser });

            expect(mockAdsService.createCampaign).toHaveBeenCalledWith(dto, 'org-1', mockUser.userId);
            expect(result).toEqual(campaign);
        });
    });

    describe('PATCH /campaigns/:id (update)', () => {
        it('should call adsService.updateCampaign', async () => {
            const dto = { name: 'Updated Name' } as any;
            const campaign = makeCampaignResponse({ name: 'Updated Name' });
            mockAdsService.updateCampaign.mockResolvedValue(campaign);

            const result = await controller.update('campaign-1', dto, { user: mockUser });

            expect(mockAdsService.updateCampaign).toHaveBeenCalledWith('campaign-1', dto, mockUser.userId);
            expect(result.name).toBe('Updated Name');
        });
    });

    describe('POST /campaigns/:id/submit', () => {
        it('should call adsService.submitCampaign', async () => {
            const campaign = makeCampaignResponse({ status: CampaignStatus.PENDING_APPROVAL });
            mockAdsService.submitCampaign.mockResolvedValue(campaign);

            const result = await controller.submit('campaign-1', { user: mockUser });

            expect(mockAdsService.submitCampaign).toHaveBeenCalledWith('campaign-1', mockUser.userId);
            expect(result.status).toBe(CampaignStatus.PENDING_APPROVAL);
        });
    });

    describe('PATCH /campaigns/:id/approve', () => {
        it('should call adsService.approveCampaign with isAdmin=true when role=ADMIN', async () => {
            const campaign = makeCampaignResponse({ status: CampaignStatus.APPROVED });
            mockAdsService.approveCampaign.mockResolvedValue(campaign);

            const result = await controller.approve('campaign-1', { user: mockAdminUser });

            expect(mockAdsService.approveCampaign).toHaveBeenCalledWith('campaign-1', true);
            expect(result.status).toBe(CampaignStatus.APPROVED);
        });

        it('should pass isAdmin=false for non-admin user', async () => {
            mockAdsService.approveCampaign.mockResolvedValue(makeCampaignResponse());

            await controller.approve('campaign-1', { user: mockUser });

            expect(mockAdsService.approveCampaign).toHaveBeenCalledWith('campaign-1', false);
        });
    });

    describe('PATCH /campaigns/:id/reject', () => {
        it('should call adsService.rejectCampaign with reason', async () => {
            const campaign = makeCampaignResponse({ status: CampaignStatus.REJECTED });
            mockAdsService.rejectCampaign.mockResolvedValue(campaign);

            const result = await controller.reject('campaign-1', { reason: 'Policy violation' }, { user: mockAdminUser });

            expect(mockAdsService.rejectCampaign).toHaveBeenCalledWith('campaign-1', 'Policy violation', true);
            expect(result.status).toBe(CampaignStatus.REJECTED);
        });
    });

    describe('PATCH /campaigns/:id/activate', () => {
        it('should call adsService.activateCampaign', async () => {
            const campaign = makeCampaignResponse({ status: CampaignStatus.ACTIVE });
            mockAdsService.activateCampaign.mockResolvedValue(campaign);

            const result = await controller.activate('campaign-1', { user: mockUser });

            expect(mockAdsService.activateCampaign).toHaveBeenCalledWith('campaign-1', mockUser.userId);
            expect(result.status).toBe(CampaignStatus.ACTIVE);
        });
    });

    describe('PATCH /campaigns/:id/pause', () => {
        it('should call adsService.pauseCampaign', async () => {
            const campaign = makeCampaignResponse({ status: CampaignStatus.PAUSED });
            mockAdsService.pauseCampaign.mockResolvedValue(campaign);

            const result = await controller.pause('campaign-1', { user: mockUser });

            expect(mockAdsService.pauseCampaign).toHaveBeenCalledWith('campaign-1', mockUser.userId);
            expect(result.status).toBe(CampaignStatus.PAUSED);
        });
    });

    describe('PATCH /campaigns/:id/end', () => {
        it('should call adsService.endCampaign', async () => {
            const campaign = makeCampaignResponse({ status: CampaignStatus.ENDED });
            mockAdsService.endCampaign.mockResolvedValue(campaign);

            const result = await controller.end('campaign-1', { user: mockUser });

            expect(mockAdsService.endCampaign).toHaveBeenCalledWith('campaign-1', mockUser.userId);
            expect(result.status).toBe(CampaignStatus.ENDED);
        });
    });

    describe('GET /campaigns (list)', () => {
        it('should return paginated campaign list', async () => {
            mockAdsService.findAllByOrg.mockResolvedValue({ campaigns: [makeCampaignResponse()], total: 1 });

            const query = { page: 1, limit: 20 } as any;
            const result = await controller.findAll('org-1', query, { user: mockUser });

            expect(mockAdsService.findAllByOrg).toHaveBeenCalledWith('org-1', query, mockUser.userId);
            expect(result.total).toBe(1);
            expect(result.totalPages).toBe(1);
            expect(result.campaigns).toHaveLength(1);
        });
    });

    describe('GET /campaigns/:id', () => {
        it('should return campaign with relations', async () => {
            const campaign = { ...makeCampaignResponse(), creatives: [], targetingRule: null };
            mockAdsService.findOne.mockResolvedValue(campaign);

            const result = await controller.findOne('campaign-1', { user: mockUser });

            expect(mockAdsService.findOne).toHaveBeenCalledWith('campaign-1', mockUser.userId);
            expect(result).toEqual(campaign);
        });
    });

    describe('POST /campaigns/:id/creatives', () => {
        it('should call adsService.addCreative', async () => {
            const dto = {
                mediaUrl: 'https://cdn.example.com/img.jpg',
                headline: 'Apply Now',
                ctaText: 'View Job',
                ctaUrl: 'https://example.com',
            } as any;
            const creative = { id: 'creative-1', campaignId: 'campaign-1', ...dto };
            mockAdsService.addCreative.mockResolvedValue(creative);

            const result = await controller.addCreative('campaign-1', dto, { user: mockUser });

            expect(mockAdsService.addCreative).toHaveBeenCalledWith('campaign-1', dto, mockUser.userId);
            expect(result.id).toBe('creative-1');
        });
    });

    describe('PATCH /campaigns/:id/targeting', () => {
        it('should call adsService.upsertTargeting', async () => {
            const dto = {
                countryIds: ['11111111-1111-1111-1111-111111111111'],
                interestIds: ['22222222-2222-2222-2222-222222222222'],
            } as any;
            const rule = { campaignId: 'campaign-1', ...dto };
            mockAdsService.upsertTargeting.mockResolvedValue(rule);

            const result = await controller.updateTargeting('campaign-1', dto, { user: mockUser });

            expect(mockAdsService.upsertTargeting).toHaveBeenCalledWith('campaign-1', dto, mockUser.userId);
            expect(result.campaignId).toBe('campaign-1');
        });
    });

    describe('GET /campaigns/:id/stats', () => {
        it('should return delivery stats', async () => {
            const stats = { campaignId: 'campaign-1', impressions: 1000n, clicks: 50n, videoCompletions: 0n };
            mockAdsService.getStats.mockResolvedValue(stats);

            const result = await controller.getStats('campaign-1', { user: mockUser });

            expect(mockAdsService.getStats).toHaveBeenCalledWith('campaign-1', mockUser.userId);
            expect(result.impressions).toBe(1000n);
        });
    });
});
