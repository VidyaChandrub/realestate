import { Body, Controller, Get, NotFoundException, Patch, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from '../user/user.service';
import { UpdateCurrentUserProfileDto } from '../user/dto/update-current-user-profile.dto';

@Controller('api/v1/profile')
export class ProfileController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getCurrentUserProfile(@Request() req) {
    const user = await this.userService.getUserRecord(req.user.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.mobileNumber ?? null,
    };
  }

  @UseGuards(JwtAuthGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  )
  @Patch()
  async updateCurrentUserProfile(
    @Request() req,
    @Body() body: UpdateCurrentUserProfileDto,
  ) {
    await this.userService.updateCurrentUserProfile(req.user.userId, body);

    return {
      success: true,
      message: 'Profile updated successfully',
    };
  }
}
