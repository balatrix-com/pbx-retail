import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReassignMonitoringDto {
    @IsString() @IsNotEmpty()
    fromUserId: string;

    @IsString() @IsNotEmpty()
    toUserId: string;

    @IsString() @IsNotEmpty()
    monitoringExtension: string;

    @IsOptional() @IsString()
    monitoringSecret?: string;

    @IsOptional() @IsString()
    name?: string;
}
