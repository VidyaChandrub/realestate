import { HttpException, HttpStatus } from '@nestjs/common';

export class UnauthorizedNotificationAccessException extends HttpException {
    constructor() {
        super('You do not have permission to access or modify this notification', HttpStatus.FORBIDDEN);
    }
}
