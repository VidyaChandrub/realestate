import { IsNotEmpty, IsString } from 'class-validator';

export class RestartDraftDto {
  @IsString()
  @IsNotEmpty()
  existingUserId: string;
}