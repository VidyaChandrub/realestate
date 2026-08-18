import { BadRequestException } from '@nestjs/common';

export class InvalidApplicationException extends BadRequestException {
    constructor(message: string) {
        super(message);
    }
}
