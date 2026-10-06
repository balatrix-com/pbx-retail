import { IsString, IsNotEmpty, IsInt, Min, Max, IsEnum, IsOptional } from 'class-validator';
import { AddMemberDto } from './add-member.dto';

export enum RingStrategy {
    SIMULTANEOUS = 'simultaneous',
    SEQUENTIAL = 'sequential',
    CASCADE = 'cascade',
}

export class CreateRingGroupDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEnum(RingStrategy)
    strategy: RingStrategy;

    @IsInt()
    @Min(1)
    @Max(120)
    @IsOptional()
    ringTimeout?: number; // Default 30 seconds

    @IsString()
    @IsOptional()
    noAnswerAction?: string; // 'hangup', 'extension', 'external'

    @IsString()
    @IsOptional()
    noAnswerDestination?: string;

    @IsOptional()
    members?: AddMemberDto[];
}
