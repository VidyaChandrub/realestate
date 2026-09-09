import { BadRequestException, Injectable } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UpdateLeadStageDisplayDto } from './dto/update-lead-stage-display.dto';
import {
  LEAD_STAGE_ORDER,
  LeadStageDisplay,
  mergeStageDisplay,
} from './lead-stage-defaults';

@Injectable()
export class OrgLeadStageDisplayService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * All seven stages in canonical order, each merged with the org's override
   * (or its built-in default when the org hasn't customised it). Never returns
   * another org's rows.
   */
  async listMerged(orgId: string): Promise<LeadStageDisplay[]> {
    const rows = await this.prisma.orgLeadStageDisplay.findMany({
      where: { orgId },
    });
    const byStatus = new Map(rows.map((r) => [r.status, r]));
    return LEAD_STAGE_ORDER.map((status) => {
      const row = byStatus.get(status);
      return mergeStageDisplay(
        status,
        row ? { label: row.label, color: row.color } : null,
      );
    });
  }

  /**
   * Upsert the label + colour for one stage. `status` must be one of the fixed
   * LeadStatus values — stages can't be added. orgId always comes from the JWT.
   */
  async upsert(
    orgId: string,
    status: string,
    dto: UpdateLeadStageDisplayDto,
  ): Promise<LeadStageDisplay> {
    if (!LEAD_STAGE_ORDER.includes(status as LeadStatus)) {
      throw new BadRequestException(`Unknown pipeline stage "${status}"`);
    }
    const stage = status as LeadStatus;
    const label = dto.label.trim();
    if (!label) {
      throw new BadRequestException('Label cannot be empty');
    }
    const color = dto.color.toLowerCase();

    await this.prisma.orgLeadStageDisplay.upsert({
      where: { orgId_status: { orgId, status: stage } },
      create: { orgId, status: stage, label, color },
      update: { label, color },
    });

    return mergeStageDisplay(stage, { label, color });
  }
}
