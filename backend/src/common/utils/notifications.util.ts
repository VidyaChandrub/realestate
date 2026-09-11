import type { Prisma } from '@prisma/client';

export type NotificationType =
  | 'organisation_registration'
  | 'subdomain_request'
  | 'custom_domain_request'
  | 'organisation_approved'
  | 'organisation_rejected'
  | 'support_ticket_created'
  | 'support_ticket_message'
  | 'support_ticket_status_changed';

// Creates an in-app notification row. Leave `recipientId` unset to address
// "all Super Admins" (the platform-wide inbox — organisation registrations,
// a new support ticket, an org's reply to one). Pass it to address one
// specific user instead (e.g. the org member who raised a ticket, once the
// Platform Team replies or closes it).
export function buildNotificationData(input: {
  orgId?: string | null;
  recipientId?: string;
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
    recipient: input.recipientId ? { connect: { id: input.recipientId } } : undefined,
  };
}
