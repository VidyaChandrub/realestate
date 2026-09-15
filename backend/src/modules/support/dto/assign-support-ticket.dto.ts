import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

// `assigneeId: null` unassigns the ticket; a UUID assigns it to that
// Platform Team member. Omitting the field entirely is treated the same as
// null (see SupportService.assignTicket).
export class AssignSupportTicketDto {
  @IsOptional()
  @ValidateIf((o: AssignSupportTicketDto) => o.assigneeId !== null)
  @IsUUID()
  assigneeId?: string | null;
}
