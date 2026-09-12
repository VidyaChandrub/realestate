import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { TeamChatController } from './team-chat.controller';
import { TeamChatService } from './team-chat.service';

@Module({
  imports: [AuthModule],
  controllers: [TeamChatController],
  providers: [TeamChatService, OrgApprovedGuard],
})
export class TeamChatModule {}