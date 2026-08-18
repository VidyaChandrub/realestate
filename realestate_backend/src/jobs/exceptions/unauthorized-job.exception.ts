import { ForbiddenException } from '@nestjs/common';

export class UnauthorizedJobException extends ForbiddenException {
    constructor(message: string = 'You do not have permission to access or modify this job') {
        super(message);
    }
}
