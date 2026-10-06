import { IsEmail, IsString, IsOptional } from 'class-validator';

export class InviteSupportUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsOptional()
    name?: string;
}
