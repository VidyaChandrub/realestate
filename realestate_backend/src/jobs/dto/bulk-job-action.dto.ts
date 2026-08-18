import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class BulkJobActionDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsUUID('4', { each: true })
    jobIds: string[];
}

export class BulkRejectJobDto extends BulkJobActionDto {
    @IsString()
    @IsNotEmpty()
    reason: string;
}
