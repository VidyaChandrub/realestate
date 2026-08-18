import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from '../user/user.service';

@Controller('api')
export class ApiController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const profile = await this.userService.findOrCreateProfile(req.user);

    return {
      user: {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
      },
      profile: {
        profileId: profile.id,
        userId: profile.userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phoneNumber: profile.phoneNumber,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        userType: profile.userType,
        companyName: profile.companyName,
        preferences: {
          ...(profile.preferences as object ?? {}),
          role: req.user.role,
        },
        notificationSettings: profile.notificationSettings,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        lastLoginAt: profile.lastLoginAt,
        isActive: profile.isActive,
      },
    };
  }
}
