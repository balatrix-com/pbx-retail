import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';

export class AddMemberDto {
    @IsString()
    @IsNotEmpty()
    extensionId: string;

    @IsInt()
    @Min(1)
    @IsOptional()
    priority?: number; // For cascade strategy (tier number)

    @IsInt()
    @Min(1)
    @IsOptional()
    position?: number; // For sequential strategy (order within tier)
}
