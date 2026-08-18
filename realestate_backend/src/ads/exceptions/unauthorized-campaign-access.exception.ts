// src/ads/exceptions/unauthorized-campaign-access.exception.ts
import { ForbiddenException } from '@nestjs/common';

export class UnauthorizedCampaignAccessException extends ForbiddenException {
    constructor(message = 'You do not have permission to perform this action on the campaign') {
        super(message);
    }
}
