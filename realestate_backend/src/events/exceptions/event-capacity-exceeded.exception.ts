// src/events/exceptions/event-capacity-exceeded.exception.ts
import { ConflictException } from '@nestjs/common';

export class EventCapacityExceededException extends ConflictException {
    constructor(eventId: string) {
        super(`Event "${eventId}" has reached its maximum capacity`);
    }
}
