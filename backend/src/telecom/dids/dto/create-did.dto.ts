import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateDIDDto {
    @IsString()
    @IsNotEmpty()
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
