// src/ads/services/ads.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
    Campaign,
    CampaignStatus,
    CampaignType,
    AdEntityType,
    PricingModel,
    Creative,
    TargetingRule,
    DeliveryStats,
    Prisma,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { CampaignsRepository } from '../repositories/campaigns.repository';
import { CreativesRepository } from '../repositories/creatives.repository';
import { TargetingRulesRepository } from '../repositories/targeting-rules.repository';
import { DeliveryStatsRepository } from '../repositories/delivery-stats.repository';

import { EmployerUsersService } from '../../employers/services/employer-users.service';
import { JobsService } from '../../jobs/services/jobs.service';
import { EventsService } from '../../events/services/events.service';

import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';
import { ListCampaignsDto } from '../dto/list-campaigns.dto';
import { CreateCreativeDto } from '../dto/create-creative.dto';
import { UpdateTargetingDto } from '../dto/update-targeting.dto';

import { CampaignNotFoundException } from '../exceptions/campaign-not-found.exception';
import { UnauthorizedCampaignAccessException } from '../exceptions/unauthorized-campaign-access.exception';
import { InvalidCampaignStateException } from '../exceptions/invalid-campaign-state.exception';
import { BudgetExceededException } from '../exceptions/budget-exceeded.exception';

// ─── Valid state transitions ───────────────────────────────────────────────────
const ALLOWED_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
    [CampaignStatus.DRAFT]: [CampaignStatus.PENDING_APPROVAL],
    [CampaignStatus.PENDING_APPROVAL]: [CampaignStatus.APPROVED, CampaignStatus.REJECTED],
    [CampaignStatus.APPROVED]: [CampaignStatus.ACTIVE],
    [CampaignStatus.ACTIVE]: [CampaignStatus.PAUSED, CampaignStatus.ENDED],
    [CampaignStatus.PAUSED]: [CampaignStatus.ACTIVE, CampaignStatus.ENDED],
    [CampaignStatus.ENDED]: [], // terminal
    [CampaignStatus.REJECTED]: [], // terminal
};

// ─── Terminal states — no further transitions allowed ─────────────────────────
const TERMINAL_STATES = new Set<CampaignStatus>([CampaignStatus.ENDED, CampaignStatus.REJECTED]);

// ─── Mutable states — campaign data can be edited in these states ─────────────
const MUTABLE_STATES = new Set<CampaignStatus>([CampaignStatus.DRAFT]);

type FeedProfileTargetingInput = {
    currentCityId?: string | null;
    stateId?: string | null;
    countryId?: string | null;
    highestQualificationId?: string | null;
    experienceLevelId?: string | null;
    preferredInterestIds?: string[];
};

@Injectable()
export class AdsService {
    private readonly logger = new Logger(AdsService.name);

    constructor(
        private readonly campaignsRepo: CampaignsRepository,
        private readonly creativesRepo: CreativesRepository,
        private readonly targetingRepo: TargetingRulesRepository,
        private readonly statsRepo: DeliveryStatsRepository,
        private readonly employerUsersService: EmployerUsersService,
        private readonly jobsService: JobsService,
        private readonly eventsService: EventsService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    // ────────────────────────────────────────────────────────────────────────────
    // CREATE — employer org member only; saves as DRAFT
    // ────────────────────────────────────────────────────────────────────────────
    async createCampaign(
        dto: CreateCampaignDto,
        organizationId: string,
        userId: string,
    ): Promise<Campaign> {
        await this.assertOrgMembership(userId, organizationId);
        await this.validateEntityOwnership(dto, organizationId);

        const campaign = await this.campaignsRepo.create({
            organization: { connect: { id: organizationId } },
            name: dto.name,
            type: dto.type,
            entityType: dto.entityType ?? null,
            entityId: dto.entityId ?? null,
            pricingModel: dto.pricingModel,
            budgetTotal: new Decimal(dto.budgetTotal),
            costPerClick: dto.costPerClick != null ? new Decimal(dto.costPerClick) : null,
            costPerThousandImpressions:
                dto.costPerThousandImpressions != null ? new Decimal(dto.costPerThousandImpressions) : null,
            flatFee: dto.flatFee != null ? new Decimal(dto.flatFee) : null,
            dailyLimit: dto.dailyLimit != null ? new Decimal(dto.dailyLimit) : null,
            startDate: dto.startDate ? new Date(dto.startDate) : null,
            endDate: dto.endDate ? new Date(dto.endDate) : null,
            status: CampaignStatus.DRAFT,
        });

        this.logger.log(`Campaign created: ${campaign.id} by ${userId}`);
        this.eventEmitter.emit('ad.created', campaign);
        return campaign;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // UPDATE — only in DRAFT state
    // ────────────────────────────────────────────────────────────────────────────
    async updateCampaign(id: string, dto: UpdateCampaignDto, userId: string): Promise<Campaign> {
        const campaign = await this.getCampaignOrThrow(id);
        await this.assertOrgMembership(userId, campaign.organizationId);
        this.assertMutableState(campaign);

        const updated = await this.campaignsRepo.update(id, {
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.type !== undefined && { type: dto.type }),
            ...(dto.entityType !== undefined && { entityType: dto.entityType }),
            ...(dto.entityId !== undefined && { entityId: dto.entityId }),
            ...(dto.pricingModel !== undefined && { pricingModel: dto.pricingModel }),
            ...(dto.budgetTotal !== undefined && { budgetTotal: new Decimal(dto.budgetTotal) }),
            ...(dto.costPerClick !== undefined && { costPerClick: new Decimal(dto.costPerClick) }),
            ...(dto.costPerThousandImpressions !== undefined && {
                costPerThousandImpressions: new Decimal(dto.costPerThousandImpressions),
            }),
            ...(dto.flatFee !== undefined && { flatFee: new Decimal(dto.flatFee) }),
            ...(dto.dailyLimit !== undefined && { dailyLimit: new Decimal(dto.dailyLimit) }),
            ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
            ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        });

        this.logger.log(`Campaign updated: ${id}`);
        return updated;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // SUBMIT — DRAFT → PENDING_APPROVAL
    // ────────────────────────────────────────────────────────────────────────────
    async submitCampaign(id: string, userId: string): Promise<Campaign> {
        const campaign = await this.getCampaignOrThrow(id);
        await this.assertOrgMembership(userId, campaign.organizationId);
        this.assertTransition(campaign, CampaignStatus.PENDING_APPROVAL);
        this.validatePublishRequirements(campaign);

        const updated = await this.campaignsRepo.transitionStatus(id, CampaignStatus.PENDING_APPROVAL);
        this.logger.log(`Campaign submitted for review: ${id}`);
        this.eventEmitter.emit('ad.submitted', updated);
        return updated;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // APPROVE — PENDING_APPROVAL → APPROVED (admin only)
    // ────────────────────────────────────────────────────────────────────────────
    async approveCampaign(id: string, isAdmin: boolean): Promise<Campaign> {
        if (!isAdmin) throw new UnauthorizedCampaignAccessException('Only administrators can approve campaigns');

        const campaign = await this.getCampaignOrThrow(id);
        this.assertTransition(campaign, CampaignStatus.APPROVED);

        const updated = await this.campaignsRepo.transitionStatus(id, CampaignStatus.APPROVED);
        this.logger.log(`Campaign approved: ${id}`);
        this.eventEmitter.emit('ad.approved', updated);
        return updated;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // REJECT — PENDING_APPROVAL → REJECTED (admin only)
    // ────────────────────────────────────────────────────────────────────────────
    async rejectCampaign(id: string, reason: string, isAdmin: boolean): Promise<Campaign> {
        if (!isAdmin) throw new UnauthorizedCampaignAccessException('Only administrators can reject campaigns');

        const campaign = await this.getCampaignOrThrow(id);
        this.assertTransition(campaign, CampaignStatus.REJECTED);

        const updated = await this.campaignsRepo.transitionStatus(id, CampaignStatus.REJECTED, { rejectionReason: reason });
        this.logger.log(`Campaign rejected: ${id} — reason: ${reason}`);
        this.eventEmitter.emit('ad.rejected', updated);
        return updated;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // ACTIVATE — APPROVED → ACTIVE (employer)
    // TIME_BASED: locks flatFee into budgetSpent immediately
    // ────────────────────────────────────────────────────────────────────────────
    async activateCampaign(id: string, userId: string): Promise<Campaign> {
        const campaign = await this.getCampaignOrThrow(id);
        await this.assertOrgMembership(userId, campaign.organizationId);
        this.assertTransition(campaign, CampaignStatus.ACTIVE);
        this.validateActivationRequirements(campaign);

        let extraUpdate: Record<string, unknown> = {};

        if (campaign.pricingModel === PricingModel.TIME_BASED) {
            if (!campaign.flatFee) {
                throw new InvalidCampaignStateException('TIME_BASED campaigns require a flatFee before activation');
            }
            // Lock flat fee into spend immediately
            extraUpdate = { budgetSpent: campaign.flatFee };
        }

        const updated = await this.campaignsRepo.transitionStatus(id, CampaignStatus.ACTIVE, extraUpdate);

        // Ensure delivery stats row exists
        await this.statsRepo.ensureExists(id);

        this.logger.log(`Campaign activated: ${id} (${campaign.pricingModel})`);
        this.eventEmitter.emit('ad.activated', updated);
        return updated;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // PAUSE — ACTIVE → PAUSED
    // ────────────────────────────────────────────────────────────────────────────
    async pauseCampaign(id: string, userId: string): Promise<Campaign> {
        const campaign = await this.getCampaignOrThrow(id);
        await this.assertOrgMembership(userId, campaign.organizationId);
        this.assertTransition(campaign, CampaignStatus.PAUSED);

        const updated = await this.campaignsRepo.transitionStatus(id, CampaignStatus.PAUSED);
        this.logger.log(`Campaign paused: ${id}`);
        this.eventEmitter.emit('ad.paused', updated);
        return updated;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // END — ACTIVE or PAUSED → ENDED
    // ────────────────────────────────────────────────────────────────────────────
    async endCampaign(id: string, userId: string): Promise<Campaign> {
        const campaign = await this.getCampaignOrThrow(id);
        await this.assertOrgMembership(userId, campaign.organizationId);
        this.assertTransition(campaign, CampaignStatus.ENDED);

        const updated = await this.campaignsRepo.transitionStatus(id, CampaignStatus.ENDED);
        this.logger.log(`Campaign ended: ${id}`);
        this.eventEmitter.emit('ad.ended', updated);
        return updated;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // READ
    // ────────────────────────────────────────────────────────────────────────────
    async findAllByOrg(organizationId: string, query: ListCampaignsDto, userId: string) {
        await this.assertOrgMembership(userId, organizationId);
        return this.campaignsRepo.findAllByOrg(organizationId, query);
    }

    async findOne(id: string, userId: string) {
        const campaign = await this.campaignsRepo.findByIdWithRelations(id);
        if (!campaign) throw new CampaignNotFoundException(id);
        await this.assertOrgMembership(userId, campaign.organizationId);
        return campaign;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // GET STATS — employer only
    // ────────────────────────────────────────────────────────────────────────────
    async getStats(id: string, userId: string): Promise<DeliveryStats | null> {
        const campaign = await this.getCampaignOrThrow(id);
        await this.assertOrgMembership(userId, campaign.organizationId);
        return this.statsRepo.findByCampaign(id);
    }

    async countByMasterDataId(masterDataId: string): Promise<number> {
        return this.targetingRepo.countActiveCampaignsByMasterDataId(masterDataId);
    }

    async getFeedEligibleAds(params: {
        profile: FeedProfileTargetingInput;
        now: Date;
        limit: number;
        excludedCampaignIds?: string[];
    }) {
        const { profile, now, limit, excludedCampaignIds = [] } = params;
        const candidates = await this.campaignsRepo.findFeedEligibleCampaigns(now, limit * 3, excludedCampaignIds);
        const locationIds = [profile.currentCityId, profile.stateId, profile.countryId].filter(Boolean) as string[];
        const preferredInterestIds = profile.preferredInterestIds ?? [];

        return candidates
            .filter((campaign) => {
                if (campaign.budgetSpent.greaterThanOrEqualTo(campaign.budgetTotal)) {
                    return false;
                }

                if (campaign.dailyLimit && campaign.budgetSpent.greaterThanOrEqualTo(campaign.dailyLimit)) {
                    return false;
                }

                const targeting = campaign.targetingRule;
                if (!targeting) {
                    return true;
                }

                // const locationPass =
                //     targeting.locationIds.length === 0 ||
                //     locationIds.some((id) => targeting.locationIds.includes(id));
                const educationPass =
                    targeting.educationLevelIds.length === 0 ||
                    (profile.highestQualificationId
                        ? targeting.educationLevelIds.includes(profile.highestQualificationId)
                        : false);
                const experiencePass =
                    targeting.experienceLevelIds.length === 0 ||
                    (profile.experienceLevelId
                        ? targeting.experienceLevelIds.includes(profile.experienceLevelId)
                        : false);
                const interestsPass =
                    targeting.interestIds.length === 0 ||
                    preferredInterestIds.some((id) => targeting.interestIds.includes(id));

                return educationPass && experiencePass && interestsPass;
            })
            .slice(0, limit);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // CREATIVES — employer only
    // ────────────────────────────────────────────────────────────────────────────
    async addCreative(id: string, dto: CreateCreativeDto, userId: string): Promise<Creative> {
        const campaign = await this.getCampaignOrThrow(id);
        await this.assertOrgMembership(userId, campaign.organizationId);

        if (TERMINAL_STATES.has(campaign.status)) {
            throw new InvalidCampaignStateException('Cannot add creatives to a terminal campaign');
        }

        return this.creativesRepo.create({
            campaign: { connect: { id } },
            mediaUrl: dto.mediaUrl,
            thumbnailUrl: dto.thumbnailUrl ?? null,
            headline: dto.headline,
            description: dto.description ?? null,
            ctaText: dto.ctaText,
            ctaUrl: dto.ctaUrl,
        });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // TARGETING — employer only (upsert)
    // ────────────────────────────────────────────────────────────────────────────
    async upsertTargeting(id: string, dto: UpdateTargetingDto, userId: string): Promise<TargetingRule> {
        const campaign = await this.getCampaignOrThrow(id);
        await this.assertOrgMembership(userId, campaign.organizationId);

        if (TERMINAL_STATES.has(campaign.status)) {
            throw new InvalidCampaignStateException('Cannot update targeting on a terminal campaign');
        }

        return this.targetingRepo.upsert(id, {
            // locationIds: dto.locationIds ?? [],
            educationLevelIds: dto.educationLevelIds ?? [],
            experienceLevelIds: dto.experienceLevelIds ?? [],
            interestIds: dto.interestIds ?? [],
            demographicExtensions: (dto.demographicExtensions as any) ?? Prisma.JsonNull,
        });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // INTERNAL — Pricing Engine: recordImpression
    // CPM: spend += costPerThousandImpressions / 1000 per impression
    // ────────────────────────────────────────────────────────────────────────────
    async recordImpression(campaignId: string): Promise<void> {
        const campaign = await this.getCampaignOrThrow(campaignId);
        if (campaign.status !== CampaignStatus.ACTIVE) return;

        await this.statsRepo.incrementImpressions(campaignId);
        this.eventEmitter.emit('ad.impression', { campaignId });

        if (campaign.pricingModel === PricingModel.CPM && campaign.costPerThousandImpressions) {
            const spend = campaign.costPerThousandImpressions.div(1000);
            const updated = await this.campaignsRepo.incrementSpend(campaignId, spend);
            await this.checkBudgetAndEnd(updated);
        }
    }

    // ────────────────────────────────────────────────────────────────────────────
    // INTERNAL — Pricing Engine: recordClick
    // CPC: spend += costPerClick per click
    // ────────────────────────────────────────────────────────────────────────────
    async recordClick(campaignId: string): Promise<void> {
        const campaign = await this.getCampaignOrThrow(campaignId);
        if (campaign.status !== CampaignStatus.ACTIVE) return;

        await this.statsRepo.incrementClicks(campaignId);
        this.eventEmitter.emit('ad.click', { campaignId });

        if (campaign.pricingModel === PricingModel.CPC && campaign.costPerClick) {
            const updated = await this.campaignsRepo.incrementSpend(campaignId, campaign.costPerClick);
            await this.checkBudgetAndEnd(updated);
        }
    }

    // ────────────────────────────────────────────────────────────────────────────
    // INTERNAL — recordVideoCompletion (metric only, no spend)
    // ────────────────────────────────────────────────────────────────────────────
    async recordVideoCompletion(campaignId: string): Promise<void> {
        const campaign = await this.getCampaignOrThrow(campaignId);
        if (campaign.status !== CampaignStatus.ACTIVE) return;
        await this.statsRepo.incrementVideoCompletions(campaignId);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ────────────────────────────────────────────────────────────────────────────

    private async getCampaignOrThrow(id: string): Promise<Campaign> {
        const campaign = await this.campaignsRepo.findById(id);
        if (!campaign) throw new CampaignNotFoundException(id);
        return campaign;
    }

    private async assertOrgMembership(userId: string, organizationId: string): Promise<void> {
        const role = await this.employerUsersService.getUserRole(userId, organizationId);
        if (!role) {
            throw new UnauthorizedCampaignAccessException(
                'You must be a member of the organization to perform this action',
            );
        }
    }

    private assertTransition(campaign: Campaign, targetStatus: CampaignStatus): void {
        const allowed = ALLOWED_TRANSITIONS[campaign.status] ?? [];
        if (!allowed.includes(targetStatus)) {
            throw new InvalidCampaignStateException(
                `Cannot transition campaign from "${campaign.status}" to "${targetStatus}". ` +
                `Allowed: [${allowed.join(', ') || 'none — terminal state'}]`,
            );
        }
    }

    private assertMutableState(campaign: Campaign): void {
        if (!MUTABLE_STATES.has(campaign.status)) {
            throw new InvalidCampaignStateException(
                `Campaign cannot be modified in status "${campaign.status}". Only DRAFT campaigns can be edited.`,
            );
        }
    }

    private validatePublishRequirements(campaign: Campaign): void {
        if (!campaign.startDate || !campaign.endDate) {
            throw new InvalidCampaignStateException('Campaign must have startDate and endDate before submitting for approval');
        }
        if (campaign.endDate <= campaign.startDate) {
            throw new InvalidCampaignStateException('endDate must be after startDate');
        }
        if (campaign.budgetTotal.lessThanOrEqualTo(0)) {
            throw new InvalidCampaignStateException('Campaign budgetTotal must be greater than 0');
        }
        // Pricing model completeness
        if (campaign.pricingModel === PricingModel.CPC && !campaign.costPerClick) {
            throw new InvalidCampaignStateException('CPC campaigns require a costPerClick');
        }
        if (campaign.pricingModel === PricingModel.CPM && !campaign.costPerThousandImpressions) {
            throw new InvalidCampaignStateException('CPM campaigns require costPerThousandImpressions');
        }
        if (campaign.pricingModel === PricingModel.TIME_BASED && !campaign.flatFee) {
            throw new InvalidCampaignStateException('TIME_BASED campaigns require a flatFee');
        }
        if (campaign.pricingModel === PricingModel.TIME_BASED && campaign.flatFee) {
            if (campaign.flatFee.greaterThan(campaign.budgetTotal)) {
                throw new InvalidCampaignStateException('flatFee cannot exceed budgetTotal');
            }
        }
    }

    private validateActivationRequirements(campaign: Campaign): void {
        if (campaign.budgetTotal.lessThanOrEqualTo(0)) {
            throw new InvalidCampaignStateException('Cannot activate a campaign with zero budget');
        }
        if (campaign.budgetSpent.greaterThanOrEqualTo(campaign.budgetTotal)) {
            throw new BudgetExceededException(campaign.id);
        }
        const now = new Date();
        if (campaign.endDate && campaign.endDate < now) {
            throw new InvalidCampaignStateException('Cannot activate a campaign whose endDate is in the past');
        }
    }

    private async checkBudgetAndEnd(campaign: Campaign): Promise<void> {
        const isExhausted = campaign.budgetSpent.greaterThanOrEqualTo(campaign.budgetTotal);
        const isExpired = campaign.endDate ? campaign.endDate < new Date() : false;

        if (isExhausted || isExpired) {
            const ended = await this.campaignsRepo.transitionStatus(campaign.id, CampaignStatus.ENDED);
            this.logger.log(
                `Campaign auto-ended: ${campaign.id} (${isExhausted ? 'budget exhausted' : 'endDate reached'})`,
            );
            this.eventEmitter.emit('ad.ended', ended);
        }
    }

    private async validateEntityOwnership(dto: CreateCampaignDto, organizationId: string): Promise<void> {
        if (dto.type === CampaignType.SPONSORED_JOB) {
            if (!dto.entityId) {
                throw new InvalidCampaignStateException('SPONSORED_JOB campaigns require an entityId (job UUID)');
            }
            // Validates entity existence via JobsService public contract
            const job = await this.jobsService.findOne(dto.entityId);
            if (!job || job.organizationId !== organizationId) {
                throw new UnauthorizedCampaignAccessException(
                    'The specified job does not belong to your organization',
                );
            }
        }

        if (dto.type === CampaignType.SPONSORED_EVENT) {
            if (!dto.entityId) {
                throw new InvalidCampaignStateException('SPONSORED_EVENT campaigns require an entityId (event UUID)');
            }
            // Validates entity existence via EventsService public contract
            const event = await this.eventsService.findOne(dto.entityId);
            if (!event || event.organizationId !== organizationId) {
                throw new UnauthorizedCampaignAccessException(
                    'The specified event does not belong to your organization',
                );
            }
        }
    }
}
