// src/ads/exceptions/campaign-not-found.exception.ts
import { NotFoundException } from '@nestjs/common';

export class CampaignNotFoundException extends NotFoundException {
    constructor(id: string) {
        super(`Campaign with ID "${id}" not found`);
    }
}
