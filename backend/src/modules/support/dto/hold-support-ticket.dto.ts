import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class HoldSupportTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'Please enter an on-hold reason.' })
  @MinLength(3, { message: 'Please enter an on-hold reason.' })
  @MaxLength(500)
  reason: string;
}
