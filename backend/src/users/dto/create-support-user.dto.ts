import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateSupportUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsString()
    @IsOptional()
    name?: string;
}
