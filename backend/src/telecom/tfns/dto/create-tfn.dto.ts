import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateTFNDto {
    @IsString()
    @IsNotEmpty()
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
