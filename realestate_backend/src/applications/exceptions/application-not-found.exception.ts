import { NotFoundException } from '@nestjs/common';

export class ApplicationNotFoundException extends NotFoundException {
    constructor(id: string) {
        super(`Application with ID ${id} not found`);
    }
}
