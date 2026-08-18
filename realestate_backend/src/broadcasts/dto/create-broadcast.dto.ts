import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';
import { BroadcastTargetingRulesDto } from './broadcast-targeting-rules.dto';

export class CreateBroadcastDto {
  @ApiProperty({ description: 'Broadcast title shown in the notification' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Broadcast message body' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Optional "View Details" action URL shown as a button on the notification. Must be an absolute http/https URL.' })
  @IsOptional()
  // Restricted to http/https (unlike other @IsUrl() fields in this codebase) since this URL is
  // rendered as an in-app action button that can open a webview/browser - other schemes
  // (javascript:, data:, file:, etc.) must never be accepted.
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  actionUrl?: string;

  @ApiPropertyOptional({ type: BroadcastTargetingRulesDto, description: 'Optional recipient targeting filters. Omit to target all active users.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BroadcastTargetingRulesDto)
  targetingRules?: BroadcastTargetingRulesDto;
}
