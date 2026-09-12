import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @MaxLength(5000)
  body: string;

  // Tagged-lead card: the lead this message hands over to a teammate.
  // Verified server-side to belong to the caller's org.
  @IsOptional()
  @IsUUID()
  leadId?: string;

  // Free-text "assigned to" label copied onto the card at send time
  // ("Rohit", "NRI Desk", "this channel"…). Not a FK, deliberately — chat
  // history must survive later renames of a user.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  assignedTo?: string;
}