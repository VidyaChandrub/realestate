// src/ads/tests/ads.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
    CampaignStatus,
    CampaignType,
    PricingModel,
    EntityType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AdsService } from '../services/ads.service';
import { CampaignsRepository } from '../repositories/campaigns.repository';
import { CreativesRepository } from '../repositories/creatives.repository';
import { TargetingRulesRepository } from '../repositories/targeting-rules.repository';
import { DeliveryStatsRepository } from '../repositories/delivery-stats.repository';
import { EmployerUsersService } from '../../employers/services/employer-users.service';
import { JobsService } from '../../jobs/services/jobs.service';
import { EventsService } from '../../events/services/events.service';
import { OrganizationRole } from '@prisma/client';
import { CampaignNotFoundException } from '../exceptions/campaign-not-found.exception';
import { UnauthorizedCampaignAccessException } from '../exceptions/unauthorized-campaign-access.exception';
import { InvalidCampaignStateException } from '../exceptions/invalid-campaign-state.exception';
import { BudgetExceededException } from '../exceptions/budget-exceeded.exception';

// ─── Shared Factory Helpers ───────────────────────────────────────────────────
const makeCampaign = (overrides: Partial<any> = {}): any => ({
    id: 'campaign-uuid-1',
    organizationId: 'org-uuid-1',
    name: 'Test Campaign',
    type: CampaignType.IMAGE,
    entityType: null,
    entityId: null,
    pricingModel: PricingModel.CPC,
    status: CampaignStatus.DRAFT,
    budgetTotal: new Decimal('5000'),
    budgetSpent: new Decimal('0'),
    costPerClick: new Decimal('10'),
    costPerThousandImpressions: null,
    flatFee: null,
    dailyLimit: null,
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-09-30'),
    boostScore: 0,
    isArchived: false,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe('AdsService', () => {
    let service: AdsService;

    const mockCampaignsRepo = {
        create: jest.fn(),
        findById: jest.fn(),
        findByIdWithRelations: jest.fn(),
        findAllByOrg: jest.fn(),
        update: jest.fn(),
        incrementSpend: jest.fn(),
        transitionStatus: jest.fn(),
    };

    const mockCreativesRepo = {
        create: jest.fn(),
        findAllByCampaign: jest.fn(),
        update: jest.fn(),
    };

    const mockTargetingRepo = { upsert: jest.fn(), findByCampaign: jest.fn() };
    const mockStatsRepo = {
        findByCampaign: jest.fn(),
        ensureExists: jest.fn(),
        incrementImpressions: jest.fn(),
        incrementClicks: jest.fn(),
        incrementVideoCompletions: jest.fn(),
    };
    const mockEmployerUsersService = { getUserRole: jest.fn() };
    const mockJobsService = { findOne: jest.fn() };
    const mockEventsService = { findOne: jest.fn() };
    const mockEventEmitter = { emit: jest.fn() };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdsService,
                { provide: CampaignsRepository, useValue: mockCampaignsRepo },
                { provide: CreativesRepository, useValue: mockCreativesRepo },
                { provide: TargetingRulesRepository, useValue: mockTargetingRepo },
                { provide: DeliveryStatsRepository, useValue: mockStatsRepo },
                { provide: EmployerUsersService, useValue: mockEmployerUsersService },
                { provide: JobsService, useValue: mockJobsService },
                { provide: EventsService, useValue: mockEventsService },
                { provide: EventEmitter2, useValue: mockEventEmitter },
            ],
        }).compile();

        service = module.get<AdsService>(AdsService);
    });

    // ─── createCampaign ───────────────────────────────────────────────────────
    describe('createCampaign', () => {
        const dto = {
            name: 'Test',
            type: CampaignType.IMAGE,
            pricingModel: PricingModel.CPC,
            budgetTotal: 5000,
            costPerClick: 10,
        } as any;

        it('should create a DRAFT campaign and emit ad.created', async () => {
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);
            mockCampaignsRepo.create.mockResolvedValue(makeCampaign());

            const result = await service.createCampaign(dto, 'org-uuid-1', 'user-1');

            expect(result.status).toBe(CampaignStatus.DRAFT);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ad.created', expect.anything());
        });

        it('should throw UnauthorizedCampaignAccessException if not an org member', async () => {
            mockEmployerUsersService.getUserRole.mockResolvedValue(null);
            await expect(service.createCampaign(dto, 'org-uuid-1', 'bad-user')).rejects.toThrow(
                UnauthorizedCampaignAccessException,
            );
        });

        it('should validate SPONSORED_JOB entity ownership', async () => {
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);
            const sponsoredDto = { ...dto, type: CampaignType.SPONSORED_JOB, entityId: 'job-1' };
            // Entity belongs to a different org
            mockJobsService.findOne.mockResolvedValue({ id: 'job-1', organizationId: 'other-org' });

            await expect(service.createCampaign(sponsoredDto, 'org-uuid-1', 'user-1')).rejects.toThrow(
                UnauthorizedCampaignAccessException,
            );
        });

        it('should throw if SPONSORED_JOB without entityId', async () => {
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);
            const sponsoredDto = { ...dto, type: CampaignType.SPONSORED_JOB };

            await expect(service.createCampaign(sponsoredDto, 'org-uuid-1', 'user-1')).rejects.toThrow(
                InvalidCampaignStateException,
            );
        });
    });

    // ─── updateCampaign ──────────────────────────────────────────────────────
    describe('updateCampaign', () => {
        it('should update a DRAFT campaign', async () => {
            mockCampaignsRepo.findById.mockResolvedValue(makeCampaign());
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.HR);
            mockCampaignsRepo.update.mockResolvedValue(makeCampaign({ name: 'Updated' }));

            const result = await service.updateCampaign('campaign-uuid-1', { name: 'Updated' } as any, 'user-1');
            expect(result.name).toBe('Updated');
        });

        it('should throw if campaign is ACTIVE', async () => {
            mockCampaignsRepo.findById.mockResolvedValue(makeCampaign({ status: CampaignStatus.ACTIVE }));
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);

            await expect(service.updateCampaign('c1', {} as any, 'user-1')).rejects.toThrow(
                InvalidCampaignStateException,
            );
        });
    });

    // ─── Lifecycle State Machine ──────────────────────────────────────────────
    describe('lifecycle state machine', () => {
        it('[DRAFT → PENDING_APPROVAL] submitCampaign succeeds', async () => {
            const campaign = makeCampaign();
            mockCampaignsRepo.findById.mockResolvedValue(campaign);
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);
            mockCampaignsRepo.transitionStatus.mockResolvedValue(
                makeCampaign({ status: CampaignStatus.PENDING_APPROVAL }),
            );

            const result = await service.submitCampaign('campaign-uuid-1', 'user-1');
            expect(result.status).toBe(CampaignStatus.PENDING_APPROVAL);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ad.submitted', expect.anything());
        });

        it('[PENDING_APPROVAL → APPROVED] approveCampaign admin succeeds', async () => {
            mockCampaignsRepo.findById.mockResolvedValue(
                makeCampaign({ status: CampaignStatus.PENDING_APPROVAL }),
            );
            mockCampaignsRepo.transitionStatus.mockResolvedValue(makeCampaign({ status: CampaignStatus.APPROVED }));

            const result = await service.approveCampaign('campaign-uuid-1', true);
            expect(result.status).toBe(CampaignStatus.APPROVED);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ad.approved', expect.anything());
        });

        it('[PENDING_APPROVAL → APPROVED] throws if not admin', async () => {
            await expect(service.approveCampaign('campaign-uuid-1', false)).rejects.toThrow(
                UnauthorizedCampaignAccessException,
            );
        });

        it('[PENDING_APPROVAL → REJECTED] rejectCampaign admin succeeds', async () => {
            mockCampaignsRepo.findById.mockResolvedValue(
                makeCampaign({ status: CampaignStatus.PENDING_APPROVAL }),
            );
            mockCampaignsRepo.transitionStatus.mockResolvedValue(
                makeCampaign({ status: CampaignStatus.REJECTED, rejectionReason: 'Policy violation' }),
            );

            const result = await service.rejectCampaign('campaign-uuid-1', 'Policy violation', true);
            expect(result.status).toBe(CampaignStatus.REJECTED);
        });

        it('[APPROVED → ACTIVE] activateCampaign succeeds', async () => {
            const campaign = makeCampaign({ status: CampaignStatus.APPROVED });
            mockCampaignsRepo.findById.mockResolvedValue(campaign);
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);
            mockCampaignsRepo.transitionStatus.mockResolvedValue(makeCampaign({ status: CampaignStatus.ACTIVE }));
            mockStatsRepo.ensureExists.mockResolvedValue({});

            const result = await service.activateCampaign('campaign-uuid-1', 'user-1');
            expect(result.status).toBe(CampaignStatus.ACTIVE);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ad.activated', expect.anything());
        });

        it('[ACTIVE → PAUSED] pauseCampaign succeeds', async () => {
            mockCampaignsRepo.findById.mockResolvedValue(makeCampaign({ status: CampaignStatus.ACTIVE }));
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);
            mockCampaignsRepo.transitionStatus.mockResolvedValue(makeCampaign({ status: CampaignStatus.PAUSED }));

            const result = await service.pauseCampaign('campaign-uuid-1', 'user-1');
            expect(result.status).toBe(CampaignStatus.PAUSED);
        });

        it('[ENDED] cannot be reactivated (terminal)', async () => {
            mockCampaignsRepo.findById.mockResolvedValue(makeCampaign({ status: CampaignStatus.ENDED }));
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);

            await expect(service.activateCampaign('campaign-uuid-1', 'user-1')).rejects.toThrow(
                InvalidCampaignStateException,
            );
        });

        it('[REJECTED] cannot be approved (terminal)', async () => {
            mockCampaignsRepo.findById.mockResolvedValue(makeCampaign({ status: CampaignStatus.REJECTED }));

            await expect(service.approveCampaign('campaign-uuid-1', true)).rejects.toThrow(
                InvalidCampaignStateException,
            );
        });
    });

    // ─── Pricing Engine ───────────────────────────────────────────────────────
    describe('pricing engine', () => {
        describe('CPC — recordClick', () => {
            it('should increment spend by costPerClick and emit ad.click', async () => {
                const campaign = makeCampaign({
                    status: CampaignStatus.ACTIVE,
                    pricingModel: PricingModel.CPC,
                    costPerClick: new Decimal('10'),
                    budgetTotal: new Decimal('5000'),
                    budgetSpent: new Decimal('0'),
                });
                mockCampaignsRepo.findById.mockResolvedValue(campaign);
                const afterSpend = { ...campaign, budgetSpent: new Decimal('10') };
                mockStatsRepo.incrementClicks.mockResolvedValue({});
                mockCampaignsRepo.incrementSpend.mockResolvedValue(afterSpend);

                await service.recordClick('campaign-uuid-1');

                expect(mockCampaignsRepo.incrementSpend).toHaveBeenCalledWith(
                    'campaign-uuid-1',
                    campaign.costPerClick,
                );
                expect(mockEventEmitter.emit).toHaveBeenCalledWith('ad.click', { campaignId: 'campaign-uuid-1' });
            });

            it('should auto-end when budget is exhausted after click', async () => {
                const campaign = makeCampaign({
                    status: CampaignStatus.ACTIVE,
                    pricingModel: PricingModel.CPC,
                    costPerClick: new Decimal('10'),
                    budgetTotal: new Decimal('10'),
                    budgetSpent: new Decimal('0'),
                });
                mockCampaignsRepo.findById.mockResolvedValue(campaign);
                // After spend, budgetSpent = budgetTotal
                const exhausted = { ...campaign, budgetSpent: new Decimal('10') };
                mockStatsRepo.incrementClicks.mockResolvedValue({});
                mockCampaignsRepo.incrementSpend.mockResolvedValue(exhausted);
                mockCampaignsRepo.transitionStatus.mockResolvedValue({ ...exhausted, status: CampaignStatus.ENDED });

                await service.recordClick('campaign-uuid-1');

                expect(mockCampaignsRepo.transitionStatus).toHaveBeenCalledWith(
                    'campaign-uuid-1',
                    CampaignStatus.ENDED,
                );
                expect(mockEventEmitter.emit).toHaveBeenCalledWith('ad.ended', expect.anything());
            });
        });

        describe('CPM — recordImpression', () => {
            it('should increment spend by costPerThousandImpressions / 1000 per impression', async () => {
                const cpm = new Decimal('150');
                const campaign = makeCampaign({
                    status: CampaignStatus.ACTIVE,
                    pricingModel: PricingModel.CPM,
                    costPerClick: null,
                    costPerThousandImpressions: cpm,
                    budgetTotal: new Decimal('5000'),
                    budgetSpent: new Decimal('0'),
                });
                mockCampaignsRepo.findById.mockResolvedValue(campaign);
                mockStatsRepo.incrementImpressions.mockResolvedValue({});
                mockCampaignsRepo.incrementSpend.mockResolvedValue({
                    ...campaign,
                    budgetSpent: cpm.div(1000),
                });

                await service.recordImpression('campaign-uuid-1');

                expect(mockCampaignsRepo.incrementSpend).toHaveBeenCalledWith(
                    'campaign-uuid-1',
                    cpm.div(1000),
                );
            });
        });

        describe('TIME_BASED — activateCampaign', () => {
            it('should lock flatFee into budgetSpent on activation', async () => {
                const flatFee = new Decimal('9999');
                const campaign = makeCampaign({
                    status: CampaignStatus.APPROVED,
                    pricingModel: PricingModel.TIME_BASED,
                    flatFee,
                    budgetTotal: new Decimal('10000'),
                    costPerClick: null,
                });
                mockCampaignsRepo.findById.mockResolvedValue(campaign);
                mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);
                mockCampaignsRepo.transitionStatus.mockResolvedValue({
                    ...campaign,
                    status: CampaignStatus.ACTIVE,
                    budgetSpent: flatFee,
                });
                mockStatsRepo.ensureExists.mockResolvedValue({});

                const result = await service.activateCampaign('campaign-uuid-1', 'user-1');

                expect(mockCampaignsRepo.transitionStatus).toHaveBeenCalledWith(
                    'campaign-uuid-1',
                    CampaignStatus.ACTIVE,
                    { budgetSpent: flatFee },
                );
                expect(result.status).toBe(CampaignStatus.ACTIVE);
            });
        });
    });

    // ─── Budget enforcement ───────────────────────────────────────────────────
    describe('budget enforcement', () => {
        it('should throw BudgetExceededException when activating exhausted campaign', async () => {
            const campaign = makeCampaign({
                status: CampaignStatus.APPROVED,
                budgetTotal: new Decimal('100'),
                budgetSpent: new Decimal('100'),
            });
            mockCampaignsRepo.findById.mockResolvedValue(campaign);
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);

            await expect(service.activateCampaign('campaign-uuid-1', 'user-1')).rejects.toThrow(
                BudgetExceededException,
            );
        });

        it('should not record spend if campaign is not ACTIVE', async () => {
            mockCampaignsRepo.findById.mockResolvedValue(makeCampaign({ status: CampaignStatus.PAUSED }));

            await service.recordClick('campaign-uuid-1');

            expect(mockCampaignsRepo.incrementSpend).not.toHaveBeenCalled();
        });
    });

    // ─── findOne ─────────────────────────────────────────────────────────────
    describe('findOne', () => {
        it('should return campaign with relations', async () => {
            const campaign = { ...makeCampaign(), creatives: [], targetingRule: null, deliveryStats: null };
            mockCampaignsRepo.findByIdWithRelations.mockResolvedValue(campaign);
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);

            const result = await service.findOne('campaign-uuid-1', 'user-1');
            expect(result).toEqual(campaign);
        });

        it('should throw CampaignNotFoundException if not found', async () => {
            mockCampaignsRepo.findByIdWithRelations.mockResolvedValue(null);
            // findOne calls findByIdWithRelations; if null → exception
            await expect(service.findOne('bad-id', 'user-1')).rejects.toThrow(CampaignNotFoundException);
        });
    });
});
