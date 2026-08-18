import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DeviceToken } from '@prisma/client';
import { DeviceTokensRepository } from '../repositories/device-tokens.repository';
import { RegisterDeviceTokenDto } from '../dto/register-device.dto';
import { RemoveDeviceTokenDto } from '../dto/device-token.dto';
import { DeviceTokenEntity } from '../entities/device-token.entity';

@Injectable()
export class DeviceTokensService {
  private readonly logger = new Logger(DeviceTokensService.name);

  constructor(
    private readonly deviceTokensRepository: DeviceTokensRepository,
  ) {}

  async registerDevice(
    userId: string,
    dto: RegisterDeviceTokenDto,
  ): Promise<DeviceTokenEntity> {
    const deviceToken = await this.deviceTokensRepository.upsertByToken({
      userId,
      deviceId: dto.deviceId,
      token: dto.token,
      platform: dto.platform,
      deviceName: dto.deviceName,
      appVersion: dto.appVersion,
    });

    this.logger.log(
      `Registered device token for user ${userId} (device ${dto.deviceId})`,
    );
    return new DeviceTokenEntity(deviceToken);
  }

  async listDevices(userId: string): Promise<DeviceTokenEntity[]> {
    const deviceTokens =
      await this.deviceTokensRepository.findAllByUserId(userId);
    return deviceTokens.map(
      (deviceToken) => new DeviceTokenEntity(deviceToken),
    );
  }

  async deactivateDevice(
    userId: string,
    dto: RemoveDeviceTokenDto,
  ): Promise<{ success: boolean }> {
    if (!dto.deviceId && !dto.token) {
      throw new BadRequestException(
        'Either deviceId or token must be provided',
      );
    }

    const result = await this.deviceTokensRepository.deactivateByUserAndMatch(
      userId,
      {
        deviceId: dto.deviceId,
        token: dto.token,
      },
    );

    this.logger.log(
      `Deactivated ${result.count} device token(s) for user ${userId}`,
    );
    return { success: true };
  }

  /**
   * Internal method used by the push notification listener; never exposed via the API.
   */
  async findActiveTokensForUser(userId: string): Promise<DeviceToken[]> {
    return this.deviceTokensRepository.findActiveByUserId(userId);
  }

  /**
   * Internal cleanup used by the push notification listener when FCM reports invalid tokens.
   */
  async deactivateTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) {
      return;
    }

    await this.deviceTokensRepository.deactivateByTokens(tokens);
    this.logger.log(`Deactivated ${tokens.length} invalid device token(s)`);
  }

  /**
   * Internal method used by BroadcastsService to compute push-eligibility stats;
   * never exposed via the API.
   */
  async findUserIdsWithActiveTokens(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) {
      return [];
    }

    return this.deviceTokensRepository.findDistinctUserIdsWithActiveTokens(userIds);
  }
}
