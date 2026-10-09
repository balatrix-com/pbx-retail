import { IsString, IsNotEmpty, IsOptional, IsEnum, Matches } from 'class-validator';

export class CreateTFNDto {
    @IsString()
    @IsNotEmpty()
    @Matches(/^\+[1-9]\d{6,14}$/, { message: 'TFN must be in E.164 format, for example +18005551234' })
    tfnNumber: string;

    @IsString()
    @IsOptional()
    @IsEnum(['extension', 'ring_group', 'ivr', 'schedule', 'forward'])
    routeType?: string;

    @IsString()
    @IsOptional()
    routeDestinationId?: string;

    @IsString()
    @IsOptional()
    forwardNumber?: string;
}
