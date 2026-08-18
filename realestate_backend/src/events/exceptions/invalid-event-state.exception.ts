// src/events/exceptions/invalid-event-state.exception.ts
import { BadRequestException } from '@nestjs/common';

export class InvalidEventStateException extends BadRequestException {
    constructor(message: string) {
        super(message);
    }
}
