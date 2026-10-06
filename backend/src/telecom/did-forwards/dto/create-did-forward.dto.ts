import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDIDForwardDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    destinationNumber: string;
}
