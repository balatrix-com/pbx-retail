import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsString()
    @IsNotEmpty()
    companyName: string;

    @IsString()
    @IsOptional()
    name?: string;
}
