import { NotFoundException } from '@nestjs/common';

export class JobNotFoundException extends NotFoundException {
    constructor(id: string) {
        super(`Job with ID ${id} not found`);
    }
}
