import { IsUUID } from 'class-validator';

export class CreateDmDto {
  // FK to the other org user. Verified server-side to belong to the caller's
  // org. A DM is found-or-created; re-messaging someone never duplicates a
  // thread.
  @IsUUID()
  userId: string;
}