import { HttpException, HttpStatus } from '@nestjs/common';

export class NotificationNotFoundException extends HttpException {
    constructor(id: string) {
        super(`Notification with ID "${id}" not found`, HttpStatus.NOT_FOUND);
    }
}
