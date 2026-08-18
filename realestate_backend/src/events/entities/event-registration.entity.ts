// src/events/entities/event-registration.entity.ts
import { ApiProperty } from '@nestjs/swagger';
import { RegistrationStatus } from '@prisma/client';

export class EventRegistrationEntity {
    @ApiProperty()
    id: string;

    @ApiProperty()
    eventId: string;

    @ApiProperty()
    userId: string;

    @ApiProperty({ enum: RegistrationStatus })
    status: RegistrationStatus;

    @ApiProperty()
    registeredAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
