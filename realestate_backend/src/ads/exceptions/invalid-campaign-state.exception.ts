// src/ads/exceptions/invalid-campaign-state.exception.ts
import { BadRequestException } from '@nestjs/common';

export class InvalidCampaignStateException extends BadRequestException {
    constructor(message: string) {
        super(message);
    }
}
