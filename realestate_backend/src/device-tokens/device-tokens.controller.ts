import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeviceTokensService } from './services/device-tokens.service';
import { RegisterDeviceTokenDto } from './dto/register-device.dto';
import {
  DeviceTokenResponseDto,
  RemoveDeviceTokenDto,
} from './dto/device-token.dto';

@ApiTags('Device Tokens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/notifications/device-token')
export class DeviceTokensController {
  constructor(private readonly deviceTokensService: DeviceTokensService) {}

  @ApiOperation({
    summary: 'Register or refresh a push notification device token',
  })
  @ApiResponse({ status: 201, type: DeviceTokenResponseDto })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Request() req,
    @Body() dto: RegisterDeviceTokenDto,
  ): Promise<DeviceTokenResponseDto> {
    const userId = req.user.userId;
    return this.deviceTokensService.registerDevice(userId, dto);
  }

  @ApiOperation({ summary: "List the authenticated user's registered devices" })
  @ApiResponse({ status: 200, type: [DeviceTokenResponseDto] })
  @Get()
  async findAll(@Request() req): Promise<DeviceTokenResponseDto[]> {
    const userId = req.user.userId;
    return this.deviceTokensService.listDevices(userId);
  }

  @ApiOperation({
    summary: 'Deactivate a device token (soft delete, never hard-deletes)',
  })
  @ApiResponse({ status: 200, description: 'Returns success status' })
  @Delete()
  @HttpCode(HttpStatus.OK)
  async remove(
    @Request() req,
    @Body() dto: RemoveDeviceTokenDto,
  ): Promise<{ success: boolean }> {
    const userId = req.user.userId;
    return this.deviceTokensService.deactivateDevice(userId, dto);
  }
}
