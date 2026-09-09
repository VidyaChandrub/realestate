import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateLeadStageDisplayDto {
  /** Display label for this stage. The stored enum value is unchanged. */
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  label: string;

  /** Badge colour as a #RRGGBB hex string. */
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'color must be a #RRGGBB hex string',
  })
  color: string;
}
