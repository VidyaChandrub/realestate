import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JobExternalClickEntity {
    @ApiProperty()
    id: string;

    @ApiProperty()
    jobId: string;

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
