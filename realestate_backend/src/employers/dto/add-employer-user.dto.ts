import { IsString, IsNotEmpty, IsEnum, IsUUID, IsOptional, IsBoolean, IsArray, IsObject } from 'class-validator';
import { OrganizationRole, EmployerUserStatus } from '@prisma/client';

export { OrganizationRole };

export class AddEmployerUserDto {
    @IsString()
    @IsNotEmpty()
    userEmail: string; // The email of the user to add

    @IsEnum(OrganizationRole)
    @IsNotEmpty()
    role: OrganizationRole;

    @IsString()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    firstName?: string;

    @IsString()
    @IsOptional()
    lastName?: string;

    @IsEnum(EmployerUserStatus)
    @IsOptional()
    status?: EmployerUserStatus;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsUUID()
    @IsOptional()
    invitedById?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    permissions?: string[];
}
