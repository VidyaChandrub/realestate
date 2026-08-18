// src/ads/repositories/targeting-rules.repository.ts
import { Injectable } from '@nestjs/common';
import { Prisma, TargetingRule } from '@prisma/client';
import { AdsDbService } from '../prisma.service';

@Injectable()
export class TargetingRulesRepository {
    constructor(private readonly db: AdsDbService) { }

    async upsert(campaignId: string, data: Omit<Prisma.TargetingRuleCreateInput, 'campaign'>): Promise<TargetingRule> {
        return this.db.targetingRule.upsert({
            where: { campaignId },
            update: {
                countryIds: data.countryIds,
                stateIds: data.stateIds,
                cityIds: data.cityIds,
                educationLevelIds: data.educationLevelIds,
                experienceLevelIds: data.experienceLevelIds,
                interestIds: data.interestIds,
                demographicExtensions: data.demographicExtensions ?? Prisma.JsonNull,
            },
            create: {
                campaign: { connect: { id: campaignId } },
                countryIds: data.countryIds ?? [],
                stateIds: data.stateIds ?? [],
                cityIds: data.cityIds ?? [],
                educationLevelIds: data.educationLevelIds ?? [],
                experienceLevelIds: data.experienceLevelIds ?? [],
                interestIds: data.interestIds ?? [],
                demographicExtensions: data.demographicExtensions ?? Prisma.JsonNull,
            },
        });
    }

    async findByCampaign(campaignId: string): Promise<TargetingRule | null> {
        return this.db.targetingRule.findUnique({ where: { campaignId } });
    }

    async countActiveCampaignsByMasterDataId(masterDataId: string): Promise<number> {
        return this.db.campaign.count({
            where: {
                status: 'ACTIVE',
                isArchived: false,
                targetingRule: {
                    OR: [
                        { countryIds: { has: masterDataId } },
                        { stateIds: { has: masterDataId } },
                        { cityIds: { has: masterDataId } },
                        { educationLevelIds: { has: masterDataId } },
                        { experienceLevelIds: { has: masterDataId } },
                        { interestIds: { has: masterDataId } },
                    ],
                },
            },
        });
    }
}
