import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  // Optional — link the channel to a Team so its current members auto-join.
  // Verified server-side to belong to the caller's org.
  @IsOptional()
  @IsUUID()
  teamId?: string;
}