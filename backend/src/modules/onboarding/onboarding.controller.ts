import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OnboardingService } from './onboarding.service';
import { BusinessDetailsDto } from './dto/business-details.dto';
import { LogoUploadUrlDto } from './dto/logo-upload-url.dto';
import { SubscriptionStepDto } from './dto/subscription-step.dto';
import { TemplatesStepDto } from './dto/templates-step.dto';
import { ModulesStepDto } from './dto/modules-step.dto';
import { InviteStepDto } from './dto/invite-step.dto';

// Signup wizard, Steps 3-8 — every route here needs a real organisation to
// already exist (created at Step 2 via /auth/signup/organisation), so
// OrgAdminGuard is the right guard: same as any other org-scoped route.
@UseGuards(JwtAuthGuard, OrgAdminGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Patch('business-details')
  businessDetails(@CurrentUser() actor: JwtPayload, @Body() dto: BusinessDetailsDto) {
    return this.onboardingService.saveBusinessDetails(actor, dto);
  }

  @Post('logo-upload-url')
  logoUploadUrl(@CurrentUser() actor: JwtPayload, @Body() dto: LogoUploadUrlDto) {
    return this.onboardingService.createLogoUploadUrl(actor, dto);
  }

  @Post('subscription')
  subscription(@CurrentUser() actor: JwtPayload, @Body() dto: SubscriptionStepDto) {
    return this.onboardingService.saveSubscription(actor, dto);
  }

  @Post('templates')
  templates(@CurrentUser() actor: JwtPayload, @Body() dto: TemplatesStepDto) {
    return this.onboardingService.saveTemplates(actor, dto);
  }

  @Post('modules')
  modules(@CurrentUser() actor: JwtPayload, @Body() dto: ModulesStepDto) {
    return this.onboardingService.saveModules(actor, dto);
  }

  @Post('invite')
  invite(@CurrentUser() actor: JwtPayload, @Body() dto: InviteStepDto) {
    return this.onboardingService.sendInvites(actor, dto);
  }

  @Get('roles')
  roles(@CurrentUser() actor: JwtPayload) {
    return this.onboardingService.listAvailableRoles(actor);
  }

  @Post('complete')
  complete(@CurrentUser() actor: JwtPayload) {
    return this.onboardingService.complete(actor);
  }
}
