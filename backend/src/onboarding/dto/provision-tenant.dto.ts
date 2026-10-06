import { IsString, IsEmail, IsOptional, IsNumber } from 'class-validator';

export class ProvisionTenantDto {
    @IsString()
    subBillingCustomerId: string;

    @IsString()
    subBillingSubscriptionId: string;

    @IsString()
    customerName: string;

    @IsEmail()
    customerEmail: string;

    @IsOptional()
    @IsString()
    customerCompany?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsString()
    planName: string;

    @IsNumber()
    extensionCount: number;

    @IsNumber()
    freeMinutes: number;

    @IsOptional()
    @IsString()
    selectedTfnId?: string;
}
