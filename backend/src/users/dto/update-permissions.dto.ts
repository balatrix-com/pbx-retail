import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdatePermissionsDto {
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
