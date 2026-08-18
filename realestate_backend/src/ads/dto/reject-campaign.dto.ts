// src/ads/dto/reject-campaign.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RejectCampaignDto {
    @ApiProperty({ example: 'Creative assets do not meet policy guidelines' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    reason: string;
}
