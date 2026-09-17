import { Controller } from '@nestjs/common';
// import { Body, Get, Patch, Post, UseGuards } from '@nestjs/common';
// import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
// import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
// import { CurrentUser } from '../../common/decorators/current-user.decorator';
// import type { JwtPayload } from '../../common/types/jwt-payload.interface';
// import { OnboardingService } from './onboarding.service';
// import { BusinessDetailsDto } from './dto/business-details.dto';
// import { LogoUploadUrlDto } from './dto/logo-upload-url.dto';
// import { SubscriptionStepDto } from './dto/subscription-step.dto';
// import { TemplatesStepDto } from './dto/templates-step.dto';
// import { ModulesStepDto } from './dto/modules-step.dto';
// import { InviteStepDto } from './dto/invite-step.dto';

// Signup wizard Steps 3-8 (Business Details, Subscription, Templates,
// Modules, Invite, Connect) were removed by the onboarding simplification —
// the wizard is now just Account + Organisation, and Organisation
// (AuthService.createOrganisationStep) finalizes onboarding directly
// (assigns the seeded Basic plan, activates the org, marks completed).
//
// Commented out rather than deleted, per this project's reversibility
// convention — every route below still has a working service method behind
// it (OnboardingService), just no longer reachable. City moved to
// OnboardingOrganisationDto; Terms of Service moved there too. Business
// Details' other fields (RERA, GSTIN, logo, brand colour) are still
// editable post-signup from Org Settings → General (buildOrganisationUpdateData
// already covers them) — logoUploadUrl below is likewise superseded by
// org-settings' own asset-upload-url endpoint. Templates has its own page
// (org-templates). Invite has Users/Team. Connect was already an
// unimplemented placeholder (see the old OnboardingService.complete()
// comment) with nothing to preserve.
@Controller('onboarding')
export class OnboardingController {
  // constructor(private readonly onboardingService: OnboardingService) {}
  //
  // @UseGuards(JwtAuthGuard, OrgAdminGuard)
  // @Patch('business-details')
  // businessDetails(@CurrentUser() actor: JwtPayload, @Body() dto: BusinessDetailsDto) {
  //   return this.onboardingService.saveBusinessDetails(actor, dto);
  // }
  //
  // @UseGuards(JwtAuthGuard, OrgAdminGuard)
  // @Post('logo-upload-url')
  // logoUploadUrl(@CurrentUser() actor: JwtPayload, @Body() dto: LogoUploadUrlDto) {
  //   return this.onboardingService.createLogoUploadUrl(actor, dto);
  // }
  //
  // @UseGuards(JwtAuthGuard, OrgAdminGuard)
  // @Post('subscription')
  // subscription(@CurrentUser() actor: JwtPayload, @Body() dto: SubscriptionStepDto) {
  //   return this.onboardingService.saveSubscription(actor, dto);
  // }
  //
  // @UseGuards(JwtAuthGuard, OrgAdminGuard)
  // @Post('templates')
  // templates(@CurrentUser() actor: JwtPayload, @Body() dto: TemplatesStepDto) {
  //   return this.onboardingService.saveTemplates(actor, dto);
  // }
  //
  // @UseGuards(JwtAuthGuard, OrgAdminGuard)
  // @Post('modules')
  // modules(@CurrentUser() actor: JwtPayload, @Body() dto: ModulesStepDto) {
  //   return this.onboardingService.saveModules(actor, dto);
  // }
  //
  // @UseGuards(JwtAuthGuard, OrgAdminGuard)
  // @Post('invite')
  // invite(@CurrentUser() actor: JwtPayload, @Body() dto: InviteStepDto) {
  //   return this.onboardingService.sendInvites(actor, dto);
  // }
  //
  // @UseGuards(JwtAuthGuard, OrgAdminGuard)
  // @Get('roles')
  // roles(@CurrentUser() actor: JwtPayload) {
  //   return this.onboardingService.listAvailableRoles(actor);
  // }
  //
  // @UseGuards(JwtAuthGuard, OrgAdminGuard)
  // @Get('seats')
  // seats(@CurrentUser() actor: JwtPayload) {
  //   return this.onboardingService.getSeatUsage(actor);
  // }
  //
  // @UseGuards(JwtAuthGuard, OrgAdminGuard)
  // @Post('complete')
  // complete(@CurrentUser() actor: JwtPayload) {
  //   return this.onboardingService.complete(actor);
  // }
}
