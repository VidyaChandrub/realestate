import { DevicePlatform, DeviceToken } from '@prisma/client';

export class DeviceTokenEntity {
  id: string;
  deviceId: string;
  platform: DevicePlatform;
  deviceName?: string | null;
  appVersion?: string | null;
  isActive: boolean;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(deviceToken: DeviceToken) {
    this.id = deviceToken.id;
    this.deviceId = deviceToken.deviceId;
    this.platform = deviceToken.platform;
    this.deviceName = deviceToken.deviceName;
    this.appVersion = deviceToken.appVersion;
    this.isActive = deviceToken.isActive;
    this.lastSeenAt = deviceToken.lastSeenAt;
    this.createdAt = deviceToken.createdAt;
    this.updatedAt = deviceToken.updatedAt;
  }
}
