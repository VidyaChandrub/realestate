import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { AttributionLabelsService } from './attribution-labels.service';

@UseGuards(JwtAuthGuard, OrgApprovedGuard)
@Controller('org/attribution-labels')
export class OrgAttributionLabelsController {
  constructor(private readonly service: AttributionLabelsService) {}

  /** Enabled Organisation Labels for Lead Center / edit forms. */
  @Get()
  listEnabled() {
    return this.service.listEnabled();
  }
}
