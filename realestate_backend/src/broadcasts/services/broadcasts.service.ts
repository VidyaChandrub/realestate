import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BroadcastStatus, EntityType, NotificationType, Prisma } from '@prisma/client';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { DeviceTokensService } from '../../device-tokens/services/device-tokens.service';
import { CreateBroadcastDto } from '../dto/create-broadcast.dto';
import { BroadcastsRepository } from '../repositories/broadcasts.repository';
import { BroadcastRecipientsService } from './broadcast-recipients.service';

// Recipients are fanned out in fixed-size batches so a broadcast to a large audience never
// opens thousands of concurrent DB writes at once; within a batch, all sends run concurrently.
const RECIPIENT_BATCH_SIZE = 100;

@Injectable()
export class BroadcastsService {
  private readonly logger = new Logger(BroadcastsService.name);

  constructor(
    private readonly broadcastsRepository: BroadcastsRepository,
    private readonly recipientsService: BroadcastRecipientsService,
    private readonly notificationsService: NotificationsService,
    private readonly deviceTokensService: DeviceTokensService,
  ) {}

  async createAndSend(dto: CreateBroadcastDto, createdBy: string) {
    const targetingRules = dto.targetingRules ?? {};
    const targetingSummary = await this.recipientsService.resolveTargetingSummary(targetingRules);

    // 1. Save broadcast history so the attempt is recorded even if sending fails partway through.
    let broadcast = await this.broadcastsRepository.create({
      title: dto.title,
      message: dto.message,
      status: BroadcastStatus.PENDING,
      targetingRules: targetingRules as Prisma.InputJsonValue,
      targetingSummary: targetingSummary as Prisma.InputJsonValue,
      actionUrl: dto.actionUrl,
      createdBy,
    });

    try {
      // 2. Resolve recipients.
      const recipientUserIds = await this.recipientsService.resolveRecipientUserIds(targetingRules);

      // Nothing matched the targeting criteria - record the outcome without entering the
      // batching loop or touching NotificationsService, since there is nothing to send.
      if (recipientUserIds.length === 0) {
        return await this.broadcastsRepository.update(broadcast.id, {
          status: BroadcastStatus.NO_RECIPIENTS,
          recipientCount: 0,
          successCount: 0,
          failureCount: 0,
          sentAt: new Date(),
        });
      }

      broadcast = await this.broadcastsRepository.update(broadcast.id, {
        status: BroadcastStatus.SENDING,
        recipientCount: recipientUserIds.length,
      });

      // Delivery statistics reflect push-eligibility (an active device token), not the
      // notification-row creation outcome below - a recipient without any active device
      // token still gets full notification history, but is counted as a stats failure
      // since there is no device for a push to reach.
      const pushEligibleUserIds = await this.deviceTokensService.findUserIdsWithActiveTokens(recipientUserIds);
      const successCount = pushEligibleUserIds.length;
      const failureCount = recipientUserIds.length - successCount;

      let notificationCreationSuccessCount = 0;

      // Optional actionUrl is only added to metadata when present, so existing broadcasts
      // without one keep the exact same metadata shape as before this feature.
      const metadata: Record<string, unknown> = { broadcastId: broadcast.id };
      if (dto.actionUrl) {
        metadata.actionUrl = dto.actionUrl;
      }

      // 3. Fan out via the existing NotificationsService only, in fixed-size concurrent batches.
      // createNotification() writes the notification row and emits 'notification.created', which
      // the existing PushNotificationListener already consumes to push to the recipient's active
      // device tokens. Sending a second, explicit push here would double-notify every device.
      const batches = this.chunkArray(recipientUserIds, RECIPIENT_BATCH_SIZE);
      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map((userId) =>
            this.notificationsService.createNotification({
              userId,
              type: NotificationType.INFO,
              title: dto.title,
              message: dto.message,
              entityType: EntityType.SYSTEM,
              entityId: broadcast.id,
              metadata,
            }),
          ),
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            notificationCreationSuccessCount += 1;
          } else {
            const userId = batch[index];
            this.logger.error(
              `Failed to create broadcast notification for user ${userId} (broadcast ${broadcast.id}): ${(result.reason as Error)?.message}`,
            );
          }
        });
        // A failed batch does not stop the loop - remaining batches are still processed.
      }

      // 4 & 5. Update delivery counts and final status. successCount/failureCount are
      // device-token-based stats computed above; status still reflects whether notification
      // history was actually written for at least one recipient.
      broadcast = await this.broadcastsRepository.update(broadcast.id, {
        successCount,
        failureCount,
        status: notificationCreationSuccessCount === 0 ? BroadcastStatus.FAILED : BroadcastStatus.COMPLETED,
        sentAt: new Date(),
      });

      return broadcast;
    } catch (error) {
      await this.broadcastsRepository.update(broadcast.id, {
        status: BroadcastStatus.FAILED,
        sentAt: new Date(),
      });
      throw error;
    }
  }

  private chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }

  async findById(id: string) {
    const broadcast = await this.broadcastsRepository.findById(id);
    if (!broadcast) {
      throw new NotFoundException(`Broadcast not found: ${id}`);
    }
    return broadcast;
  }

  async findAll(page: number, limit: number, search?: string) {
    const { data, total } = await this.broadcastsRepository.findMany(page, limit, search);
    return { data, total, page, limit };
  }
}
