import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { UserStatus, Role } from '@prisma/client';

export class PaginationQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 100;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;

    @IsOptional()
    @IsEnum(Role)
    role?: Role;

    @IsOptional()
    @IsString()
    tenantId?: string;
}
