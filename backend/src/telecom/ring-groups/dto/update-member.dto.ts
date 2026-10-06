import { IsInt, Min, IsOptional } from 'class-validator';

export class UpdateMemberDto {
    @IsInt()
    @Min(1)
    @IsOptional()
    priority?: number;

    @IsInt()
    @Min(1)
    @IsOptional()
    position?: number;
}
