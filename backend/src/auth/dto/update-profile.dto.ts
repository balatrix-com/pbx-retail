import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password?: string;
}
