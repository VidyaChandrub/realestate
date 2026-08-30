import type { Prisma } from '@prisma/client';

export type NotificationType =
  | 'organisation_registration'
  | 'subdomain_request'
  | 'custom_domain_request'
  | 'organisation_approved'
  | 'organisation_rejected';

// Creates an in-app notification row delivered to every Super Admin user.
// recipientId is left null so the UI's "unread" count / list for super admins
// can include rows addressed to "all super admins" (the platform-wide inbox).
export function buildNotificationData(input: {
  orgId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  entity?: string;
  entityId?: string;
}): Prisma.NotificationCreateInput {
  return {
    type: input.type as any,
    title: input.title,
    body: input.body,
    entity: input.entity,
    entityId: input.entityId,
    organisation: input.orgId ? { connect: { id: input.orgId } } : undefined,
  };
}
