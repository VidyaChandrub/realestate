import { ForbiddenException } from '@nestjs/common';

export class UnauthorizedApplicationException extends ForbiddenException {
    constructor(message: string = 'You do not have permission to access or modify this application') {
        super(message);
    }
}
