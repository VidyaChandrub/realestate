import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoogleSheetsModule } from '../marketing/google-sheets.module';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { MetaLeadsService } from './meta-leads.service';
import {
  AdminMetaLeadsController,
  MetaOAuthCallbackController,
  MetaWebhookController,
  OrgMetaLeadsController,
} from './meta-leads.controller';

@Module({
  imports: [AuthModule, GoogleSheetsModule],
  controllers: [
    MetaWebhookController,
    MetaOAuthCallbackController,
    OrgMetaLeadsController,
    AdminMetaLeadsController,
  ],
  providers: [MetaLeadsService, OrgApprovedGuard],
  exports: [MetaLeadsService],
})
export class MetaLeadsModule {}
