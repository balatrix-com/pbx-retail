import { IsString, IsEmail, IsOptional, IsNumber } from 'class-validator';

export class CreateTenantDto {
    @IsString()
    companyName: string;

    @IsEmail()
    adminEmail: string;

    @IsString()
    adminName: string;

    @IsString()
    adminPassword: string;

    @IsOptional()
    @IsString()
    planId?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsOptional()
    @IsString()
    country?: string;

    @IsOptional()
    @IsNumber()
    creditLimit?: number;
}


