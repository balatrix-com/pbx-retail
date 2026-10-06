import { IsString, IsEmail, IsOptional, IsNumber, IsIn } from 'class-validator';

export class UpdateTenantDetailsDto {
    @IsOptional()
    @IsIn(['company', 'individual'])
    customerType?: 'company' | 'individual';

    @IsOptional()
    @IsString()
    companyName?: string;

    @IsOptional()
    @IsString()
    companyTaxId?: string;

    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsEmail()
    adminEmail?: string;

    @IsOptional()
    @IsString()
    adminPassword?: string;

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
