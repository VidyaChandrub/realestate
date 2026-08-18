import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { Notification } from '@prisma/client';
import { DeviceTokensService } from '../device-tokens/services/device-tokens.service';
import { FirebaseService } from '../firebase/firebase.service';
import { PushPayloadBuilder } from './push-payload.builder';

@Injectable()
export class PushNotificationListener {
  private readonly logger = new Logger(PushNotificationListener.name);

  constructor(
    private readonly deviceTokensService: DeviceTokensService,
    private readonly firebaseService: FirebaseService,
    private readonly payloadBuilder: PushPayloadBuilder,
  ) {}

  /**
   * Fans out the existing `notification.created` event to FCM. Must never throw —
   * a push delivery failure must never affect notification creation.
   */
  @OnEvent('notification.created')
  async handleNotificationCreated(notification: Notification): Promise<void> {
    try {
      const deviceTokens =
        await this.deviceTokensService.findActiveTokensForUser(
          notification.userId,
        );

      if (deviceTokens.length === 0) {
        this.logger.debug(
          `No active device tokens for user ${notification.userId}; skipping push`,
        );
        return;
      }

      const payload = this.payloadBuilder.build(notification);
      const tokens = deviceTokens.map((deviceToken) => deviceToken.token);

      const result = await this.firebaseService.sendToDevices(tokens, payload);
      this.logger.log(
        `Push notification ${notification.id}: ${result.successCount} succeeded, ${result.failureCount} failed`,
      );

      if (result.invalidTokens.length > 0) {
        await this.deviceTokensService.deactivateTokens(result.invalidTokens);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process push notification for notification ${notification?.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
