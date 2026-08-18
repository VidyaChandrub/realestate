import { NotFoundException } from '@nestjs/common';

export class EmployerNotFoundException extends NotFoundException {
    constructor(id: string) {
        super(`Agency/Organization with ID ${id} not found`);
    }
}
