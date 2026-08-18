import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsDate,
    IsEmail,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    ValidateNested,
} from 'class-validator';

export enum PreferredWorkModeDto {
    REMOTE = 'REMOTE',
    ONSITE = 'ONSITE',
    HYBRID = 'HYBRID',
}

// Older mobile/web clients send a single value for what is now a multi-select
// field (e.g. preferredEmploymentTypeId: "uuid"). Coerce a scalar into a
// single-item array so those payloads keep working unchanged.
function toArray({ value }: { value: unknown }): unknown {
    if (value === undefined || value === null) return value;
    return Array.isArray(value) ? value : [value];
}

export class UpdateEducationDto {
    @IsUUID()
    highestQualificationId: string;

    @IsString()
    degreeName: string;

    @IsString()
    @IsOptional()
    specialization?: string;

    @IsString()
    @IsOptional()
    customSpecialization?: string;

    @IsString()
    @IsOptional()
    universityName?: string;

    @IsInt()
    @IsOptional()
    yearOfPassing?: number;

    @IsString()
    @IsOptional()
    percentage?: string;
}

export class UpdateExperienceDto {
    @ApiPropertyOptional()
    @IsString()
    jobTitle: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    companyName?: string;

    @ApiPropertyOptional()
    @IsInt()
    @IsOptional()
    yearsOfExperience?: number;

    @ApiPropertyOptional()
    @IsInt()
    @IsOptional()
    monthsOfExperience?: number;

    @ApiPropertyOptional()
    @IsInt()
    @IsOptional()
    relevantYears?: number;

    @ApiPropertyOptional()
    @IsInt()
    @IsOptional()
    relevantMonths?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    employmentStatus?: string;

    @IsString()
    @IsOptional()
    noticePeriod?: string;

    @IsNumber()
    @IsOptional()
    currentSalary?: number;

    @IsNumber()
    @IsOptional()
    expectedSalary?: number;

    @IsBoolean()
    @IsOptional()
    willingnessToRelocate?: boolean;
}

export class UpdateSkillDto {
    @IsUUID()
    masterDataId: string;

    @IsString()
    @IsOptional()
    type?: string;

    @IsNumber()
    @IsOptional()
    yearsOfExperience?: number;

    @IsString()
    @IsOptional()
    certification?: string;
}

export class UpdateProfileDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    fullName?: string;

    @ApiPropertyOptional()
    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    mobileNumber?: string;

    @IsDate()
    @IsOptional()
    @Type(() => Date)
    dateOfBirth?: Date;

    @IsString()
    @IsOptional()
    gender?: string;

    @IsUUID()
    @IsOptional()
    currentCityId?: string;

    @IsUUID()
    @IsOptional()
    stateId?: string;

    @IsUUID()
    @IsOptional()
    countryId?: string;

    @IsString()
    @IsOptional()
    pincode?: string;

    @IsString()
    @IsOptional()
    nationality?: string;

    @IsUUID()
    @IsOptional()
    highestQualificationId?: string;

    @IsString()
    @IsOptional()
    currentJobTitle?: string;

    @IsString()
    @IsOptional()
    currentCompanyName?: string;

    @IsUUID()
    @IsOptional()
    experienceLevelId?: string;

    @IsBoolean()
    @IsOptional()
    profileComplete?: boolean;

    @IsInt()
    @IsOptional()
    profileCompletionPercentage?: number;

    @ApiPropertyOptional({ type: [String], format: 'uuid' })
    @Transform(toArray)
    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    preferredEmploymentTypeId?: string[];

    @ApiPropertyOptional({ enum: PreferredWorkModeDto, enumName: 'PreferredWorkMode', isArray: true })
    @Transform(toArray)
    @IsArray()
    @IsEnum(PreferredWorkModeDto, { each: true })
    @IsOptional()
    preferredWorkMode?: PreferredWorkModeDto[];

    @ApiPropertyOptional({ type: [String], format: 'uuid' })
    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    preferredLocationIds?: string[];

    @ApiPropertyOptional({ type: [String], format: 'uuid' })
    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    preferredCategoryIds?: string[];

    @ApiPropertyOptional({ type: [String], format: 'uuid' })
    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    preferredInterestIds?: string[];

    @IsDate()
    @IsOptional()
    @Type(() => Date)
    availableJoiningDate?: Date;

    @IsString()
    @IsOptional()
    shiftPreference?: string;

    @IsArray()
    @IsOptional()
    languagesKnown?: string[];

    @IsString()
    @IsOptional()
    linkedInProfileUrl?: string;

    @IsString()
    @IsOptional()
    disabilityInfo?: string;

    @IsString()
    @IsOptional()
    diversityInfo?: string;

    @IsString()
    @IsOptional()
    fatherMotherName?: string;

    @IsString()
    @IsOptional()
    permanentAddress?: string;

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => UpdateEducationDto)
    education?: UpdateEducationDto[];

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => UpdateExperienceDto)
    experience?: UpdateExperienceDto[];

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => UpdateSkillDto)
    skills?: UpdateSkillDto[];
}
