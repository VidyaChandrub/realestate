import {
    Body,
    Controller,
    DefaultValuePipe,
    Get,
    NotFoundException,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { JobsService } from '../jobs/services/jobs.service';
import { UserService } from '../user/user.service';
import { UpdateProfileDto } from '../user/dto/update-profile.dto';

@Controller('api/v1/users')
export class UsersController {
    constructor(
        private readonly userService: UserService,
        private readonly jobsService: JobsService,
    ) { }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getProfile(@Request() req) {
        const profile = await this.userService.findOrCreateProfile(req.user);
        const formattedProfile = await this.userService.formatProfileForResponse(profile);
        const role: string = req.user.role ?? '';

        // Fetch username from the User table (not stored on Profile)
        const userRecord = await this.userService.getUserRecord(req.user.userId);

        return {
            success: true,
            data: {
                ...(formattedProfile ?? {}),
                username: userRecord?.username ?? null,
                organization: userRecord?.employer?.memberships?.[0]?.organization ?? null,
                preferences: {
                    ...((profile?.preferences as object) ?? {}),
                    role,
                },
            },
        };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get(':userId')
    async getUserById(@Request() req, @Param('userId') userId: string) {
        await this.userService.findOrCreateProfile(req.user);
        const lookup = await this.userService.getUserByIdDetails(userId);

        return {
            success: true,
            data: lookup.data,
        };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Patch(':userId/role/employer')
    async promoteToEmployer(@Param('userId') userId: string) {
        await this.userService.updateUserRole(userId, 'EMPLOYER');
        return {
            success: true,
            message: 'User role updated to employer successfully',
        };
    }

    @UseGuards(JwtAuthGuard)
    @Patch('me')
    async updateProfile(@Request() req, @Body() body: UpdateProfileDto) {
        const profile = await this.userService.updateProfile(req.user.userId, body);
        const formattedProfile = await this.userService.formatProfileForResponse(profile);
        return {
            success: true,
            data: formattedProfile,
            message: 'Profile updated successfully',
        };
    }

    @UseGuards(JwtAuthGuard)
    @Post('me/complete-onboarding')
    async completeOnboarding(@Request() req) {
        const profile = await this.userService.updateProfile(req.user.userId, {
            profileComplete: true,
        });

        if (!profile) {
            throw new NotFoundException('Profile not found');
        }

        return {
            success: true,
            data: {
                isOnboarded: profile.profileComplete,
            },
            message: 'Onboarding completed successfully',
        };
    }

    @UseGuards(JwtAuthGuard)
    @Get('me/relevant-jobs')
    async getRelevantJobs(
        @Request() req,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    ) {
        const data = await this.jobsService.getRelevantJobs(req.user, { limit, offset });
        return {
            success: true,
            data,
        };
    }
}
