import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateScheduleDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    timezone?: string; // e.g., "America/New_York"

    // Business days (1=Monday, 7=Sunday)
    @IsInt()
    @Min(1)
    @Max(7)
    businessDaysStart: number; // Default: 1 (Monday)

    @IsInt()
    @Min(1)
    @Max(7)
    businessDaysEnd: number; // Default: 5 (Friday)

    // Business hours (24-hour format)
    @IsString()
    @IsNotEmpty()
    businessHoursStart: string; // e.g., "09:00"

    @IsString()
    @IsNotEmpty()
    businessHoursEnd: string; // e.g., "17:00"

    // Primary route (business hours)
    @IsString()
    @IsNotEmpty()
    primaryRouteType: string; // 'extension' | 'ring_group' | 'ivr'

    @IsString()
    @IsOptional()
    primaryRouteTargetId?: string;

    // After-hours route (business days outside hours)
    @IsString()
    @IsOptional()
    afterHoursRouteType?: string;

    @IsString()
    @IsOptional()
    afterHoursRouteTargetId?: string;

    // Weekend route
    @IsString()
    @IsOptional()
    weekendRouteType?: string;

    @IsString()
    @IsOptional()
    weekendRouteTargetId?: string;
}
