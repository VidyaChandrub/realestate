import { BadRequestException } from '@nestjs/common';

export class InvalidJobStateException extends BadRequestException {
    constructor(message: string) {
        super(message);
    }
}
