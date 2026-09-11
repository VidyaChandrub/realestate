import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

// Matches the "Category" select on the Support & Help contact form. A plain
// string column (not an enum) so adding a category later is a frontend-only
// change.
export const SUPPORT_TICKET_CATEGORIES = [
  'Billing',
  'Calling',
  'WhatsApp',
  'Leads',
  'Projects',
  'Other',
] as const;
export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number];

export const SUPPORT_TICKET_PRIORITIES = ['normal', 'high', 'urgent'] as const;
export type SupportTicketPriorityValue =
  (typeof SUPPORT_TICKET_PRIORITIES)[number];

export class CreateSupportTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  subject: string;

  @IsIn(SUPPORT_TICKET_CATEGORIES)
  category: SupportTicketCategory;

  @IsOptional()
  @IsIn(SUPPORT_TICKET_PRIORITIES)
  priority?: SupportTicketPriorityValue;

  // Becomes the ticket's first message, so the chat thread always opens with
  // the original ask.
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ require_protocol: true }, { each: true })
  @MaxLength(2048, { each: true })
  attachmentUrls?: string[];
}
