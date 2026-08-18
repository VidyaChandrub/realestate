// src/ads/exceptions/budget-exceeded.exception.ts
import { ConflictException } from '@nestjs/common';

export class BudgetExceededException extends ConflictException {
    constructor(campaignId: string) {
        super(`Campaign "${campaignId}" has exhausted its budget`);
    }
}
