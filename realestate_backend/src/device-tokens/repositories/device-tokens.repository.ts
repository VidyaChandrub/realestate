import { Injectable } from '@nestjs/common';
import { DeviceToken, DevicePlatform, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface UpsertDeviceTokenData {
  userId: string;
  deviceId: string;
  token: string;
  platform: DevicePlatform;
  deviceName?: string;
  appVersion?: string;
}

export interface DeactivateMatch {
  deviceId?: string;
  token?: string;
}

@Injectable()
export class DeviceTokensRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertByToken(data: UpsertDeviceTokenData): Promise<DeviceToken> {
    const lastSeenAt = new Date();

    return this.prisma.deviceToken.upsert({
      where: { token: data.token },
      create: {
        userId: data.userId,
        deviceId: data.deviceId,
        token: data.token,
        platform: data.platform,
        deviceName: data.deviceName,
        appVersion: data.appVersion,
        isActive: true,
        lastSeenAt,
      },
      update: {
        userId: data.userId,
        deviceId: data.deviceId,
        platform: data.platform,
        deviceName: data.deviceName,
        appVersion: data.appVersion,
        isActive: true,
        lastSeenAt,
      },
    });
  }

  async findAllByUserId(userId: string): Promise<DeviceToken[]> {
    return this.prisma.deviceToken.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async findActiveByUserId(userId: string): Promise<DeviceToken[]> {
    return this.prisma.deviceToken.findMany({
      where: { userId, isActive: true },
    });
  }

  async deactivateByUserAndMatch(
    userId: string,
    match: DeactivateMatch,
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.deviceToken.updateMany({
      where: {
        userId,
        isActive: true,
        ...(match.token
          ? { token: match.token }
          : { deviceId: match.deviceId }),
      },
      data: { isActive: false },
    });
  }

  async deactivateByTokens(tokens: string[]): Promise<Prisma.BatchPayload> {
    return this.prisma.deviceToken.updateMany({
      where: { token: { in: tokens } },
      data: { isActive: false },
    });
  }

  async findDistinctUserIdsWithActiveTokens(userIds: string[]): Promise<string[]> {
    const rows = await this.prisma.deviceToken.findMany({
      where: { userId: { in: userIds }, isActive: true },
      select: { userId: true },
      distinct: ['userId'],
    });
    return rows.map((row) => row.userId);
  }
}
