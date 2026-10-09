import { IsString, IsNotEmpty, IsOptional, IsIn, Matches } from 'class-validator';

export class CreateDIDDto {
    @IsOptional()
    @IsString()
    subscriptionId?: string;
    @IsString()
    @IsNotEmpty()
    @Matches(/^\+[1-9]\d{6,14}$/, { message: 'DID must be in E.164 format, for example +15551234567' })
    didNumber: string;

    @IsString()
    @IsOptional()
    @IsIn(['extension', 'ring_group', 'ivr', 'forward', 'did_forward'])
    routeType?: 'extension' | 'ring_group' | 'ivr' | 'forward' | 'did_forward';

    @IsString()
    @IsOptional()
    routeDestinationId?: string; // ID of extension/ring group/IVR

    @IsString()
    @IsOptional()
    forwardNumber?: string; // External number for 'forward' type

    @IsString()
    @IsOptional()
    description?: string;
}
