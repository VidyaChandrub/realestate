import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLeadNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text!: string;
}
