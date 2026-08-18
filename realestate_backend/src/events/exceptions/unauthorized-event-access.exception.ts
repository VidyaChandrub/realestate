// src/events/exceptions/unauthorized-event-access.exception.ts
import { ForbiddenException } from '@nestjs/common';

export class UnauthorizedEventAccessException extends ForbiddenException {
    constructor(message = 'You do not have permission to perform this action on the event') {
        super(message);
    }
}
