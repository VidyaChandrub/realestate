import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { DevicePlatform } from '@prisma/client';
import { ExactlyOneOf } from '../../common/validators/exactly-one-of.validator';

export class RemoveDeviceTokenDto {
  @ApiPropertyOptional({
    description:
      'Unique identifier for the device to deactivate. Provide exactly one of deviceId or token.',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    description:
      'FCM registration token to deactivate. Provide exactly one of deviceId or token.',
  })
  @IsOptional()
  @IsString()
  token?: string;

  @ExactlyOneOf(['deviceId', 'token'], {
    message: 'Exactly one of deviceId or token must be provided',
  })
  private readonly deviceIdentifierCheck?: never;
}

export class DeviceTokenResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  deviceId: string;

  @ApiProperty({ enum: DevicePlatform })
  platform: DevicePlatform;

  @ApiPropertyOptional()
  deviceName?: string | null;

  @ApiPropertyOptional()
  appVersion?: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  lastSeenAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
