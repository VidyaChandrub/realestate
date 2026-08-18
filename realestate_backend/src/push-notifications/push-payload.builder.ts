import { Injectable } from '@nestjs/common';
import { Notification } from '@prisma/client';
import { PushNotificationPayload } from '../firebase/firebase.types';

@Injectable()
export class PushPayloadBuilder {
  build(notification: Notification): PushNotificationPayload {
    const metadata = (notification.metadata ?? {}) as Record<string, unknown>;

    return {
      title: notification.title,
      body: notification.message,
      image: this.asString(metadata.image),
      data: {
        notificationId: notification.id,
        type: notification.type,
        entityType: notification.entityType,
        entityId: notification.entityId ?? '',
        clickAction: this.asString(metadata.clickAction) ?? '',
        deepLink: this.asString(metadata.deepLink) ?? '',
        actionUrl: this.asString(metadata.actionUrl) ?? '',
        createdAt: notification.createdAt.toISOString(),
      },
    };
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }
}
