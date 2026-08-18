import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventExternalClickEntity {
    @ApiProperty()
    id: string;

    @ApiProperty()
    eventId: string;

    @ApiProperty()
    userId: string;

    @ApiProperty()
    clickedAt: Date;

    @ApiPropertyOptional()
    user?: {
        fullName: string | null;
        email: string | null;
    };
}
