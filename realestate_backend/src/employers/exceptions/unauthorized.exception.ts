import { UnauthorizedException } from '@nestjs/common';

export class EmployerUnauthorizedException extends UnauthorizedException {
    constructor(message: string = 'You are not authorized to perform this action on this organization') {
        super(message);
    }
}
