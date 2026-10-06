import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class UpdatePhoneNumberDto {
    @IsString()
    @IsEnum(['DID', 'TFN'])
    type: 'DID' | 'TFN';

    @IsString()
    @IsOptional()
    routeType?: string;

    @IsString()
    @IsOptional()
    routeDestinationId?: string;

    @IsString()
    @IsOptional()
    forwardNumber?: string;
    
    @IsBoolean()
    @IsOptional()
    forwardEnabled?: boolean;
}
