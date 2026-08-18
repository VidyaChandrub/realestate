// src/events/exceptions/event-not-found.exception.ts
import { NotFoundException } from '@nestjs/common';

export class EventNotFoundException extends NotFoundException {
    constructor(eventId: string) {
        super(`Event with ID "${eventId}" not found`);
    }
}
