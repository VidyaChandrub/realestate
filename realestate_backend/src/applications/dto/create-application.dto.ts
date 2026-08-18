import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateApplicationDto {
    @IsUUID()
    @IsNotEmpty()
    jobId: string;

    @IsString()
    @IsOptional()
    @MaxLength(2000)
    coverNote?: string;
}
