// Mirrors the Prisma SupportTicketStatus enum as a plain string union so DTOs
// can validate against it without importing the generated client type.
export const SUPPORT_TICKET_STATUS_VALUES = ['open', 'ongoing', 'resolved'] as const;
export type SupportTicketStatusValue = (typeof SUPPORT_TICKET_STATUS_VALUES)[number];
