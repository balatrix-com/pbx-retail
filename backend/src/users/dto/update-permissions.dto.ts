import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdatePermissionsDto {
    @IsOptional()
    @IsString()
    subscriptionId?: string;
    @IsBoolean()
    monitoringEnabled: boolean;

    @IsOptional()
    @IsString()
    monitoringExtension?: string;

    @IsOptional()
    @IsString()
    monitoringSecret?: string;

    @IsOptional()
    @IsString()
    name?: string;
}
