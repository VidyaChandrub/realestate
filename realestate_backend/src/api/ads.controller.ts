// src/api/ads.controller.ts
import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    Request,
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdsService } from '../ads/services/ads.service';
import { CreateCampaignDto } from '../ads/dto/create-campaign.dto';
import { UpdateCampaignDto } from '../ads/dto/update-campaign.dto';
import { ListCampaignsDto } from '../ads/dto/list-campaigns.dto';
import { CreateCreativeDto } from '../ads/dto/create-creative.dto';
import { UpdateTargetingDto } from '../ads/dto/update-targeting.dto';
import { RejectCampaignDto } from '../ads/dto/reject-campaign.dto';
import { CampaignResponseDto, PaginatedCampaignsResponseDto } from '../ads/dto/campaign-response.dto';

@ApiTags('Advertisements')
@Controller('api/v1/ads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdsController {
    constructor(private readonly adsService: AdsService) { }

    // ──────────────────────────────────────────────────────────────────────────
    // CREATE draft campaign
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Create a new campaign draft (employer only)' })
    @ApiResponse({ status: 201, type: CampaignResponseDto })
    @Post('campaigns')
    async create(
        @Body() dto: CreateCampaignDto,
        @Query('organizationId', ParseUUIDPipe) organizationId: string,
        @Request() req,
    ) {
        return this.adsService.createCampaign(dto, organizationId, req.user.userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // UPDATE draft campaign
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Update a DRAFT campaign (employer only)' })
    @ApiResponse({ status: 200, type: CampaignResponseDto })
    @ApiResponse({ status: 400, description: 'Campaign is not in DRAFT state' })
    @Patch('campaigns/:id')
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateCampaignDto,
        @Request() req,
    ) {
        return this.adsService.updateCampaign(id, dto, req.user.userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SUBMIT for approval — DRAFT → PENDING_APPROVAL
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Submit a campaign for admin approval (DRAFT → PENDING_APPROVAL)' })
    @ApiResponse({ status: 200, type: CampaignResponseDto })
    @Post('campaigns/:id/submit')
    @HttpCode(HttpStatus.OK)
    async submit(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        return this.adsService.submitCampaign(id, req.user.userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // APPROVE — admin only | PENDING_APPROVAL → APPROVED
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Approve a campaign (admin only)' })
    @ApiResponse({ status: 200, type: CampaignResponseDto })
    @ApiResponse({ status: 403, description: 'Admin access required' })
    @Patch('campaigns/:id/approve')
    async approve(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        const isAdmin = req.user.role === 'ADMIN';
        return this.adsService.approveCampaign(id, isAdmin);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // REJECT — admin only | PENDING_APPROVAL → REJECTED
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Reject a campaign with reason (admin only)' })
    @ApiResponse({ status: 200, type: CampaignResponseDto })
    @ApiResponse({ status: 403, description: 'Admin access required' })
    @Patch('campaigns/:id/reject')
    async reject(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RejectCampaignDto,
        @Request() req,
    ) {
        const isAdmin = req.user.role === 'ADMIN';
        return this.adsService.rejectCampaign(id, dto.reason, isAdmin);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTIVATE — employer | APPROVED → ACTIVE
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Activate an approved campaign (APPROVED → ACTIVE)' })
    @ApiResponse({ status: 200, type: CampaignResponseDto })
    @Patch('campaigns/:id/activate')
    async activate(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        return this.adsService.activateCampaign(id, req.user.userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PAUSE — employer | ACTIVE → PAUSED
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Pause an active campaign (ACTIVE → PAUSED)' })
    @ApiResponse({ status: 200, type: CampaignResponseDto })
    @Patch('campaigns/:id/pause')
    async pause(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        return this.adsService.pauseCampaign(id, req.user.userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // END — employer | ACTIVE/PAUSED → ENDED
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'End a campaign manually (ACTIVE/PAUSED → ENDED)' })
    @ApiResponse({ status: 200, type: CampaignResponseDto })
    @Patch('campaigns/:id/end')
    async end(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        return this.adsService.endCampaign(id, req.user.userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LIST — org-scoped with pagination (employer)
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'List campaigns for an organization (org-scoped, paginated)' })
    @ApiResponse({ status: 200, type: PaginatedCampaignsResponseDto })
    @Get('campaigns')
    async findAll(
        @Query('organizationId', ParseUUIDPipe) organizationId: string,
        @Query() query: ListCampaignsDto,
        @Request() req,
    ): Promise<PaginatedCampaignsResponseDto> {
        const { campaigns, total } = await this.adsService.findAllByOrg(
            organizationId,
            query,
            req.user.userId,
        );
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        return {
            campaigns: campaigns as any,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET ONE — employer
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Get campaign details (with creatives, targeting, and stats)' })
    @ApiResponse({ status: 200, type: CampaignResponseDto })
    @Get('campaigns/:id')
    async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        return this.adsService.findOne(id, req.user.userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ADD CREATIVE
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Add a creative asset to a campaign' })
    @ApiResponse({ status: 201, description: 'Creative added successfully' })
    @Post('campaigns/:id/creatives')
    async addCreative(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CreateCreativeDto,
        @Request() req,
    ) {
        return this.adsService.addCreative(id, dto, req.user.userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // UPDATE TARGETING
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Set or update targeting rules for a campaign (upsert)' })
    @ApiResponse({ status: 200, description: 'Targeting updated successfully' })
    @Patch('campaigns/:id/targeting')
    async updateTargeting(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateTargetingDto,
        @Request() req,
    ) {
        return this.adsService.upsertTargeting(id, dto, req.user.userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET STATS
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Get delivery statistics for a campaign (employer only)' })
    @ApiResponse({ status: 200, description: 'Delivery stats' })
    @Get('campaigns/:id/stats')
    async getStats(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        return this.adsService.getStats(id, req.user.userId);
    }
}
