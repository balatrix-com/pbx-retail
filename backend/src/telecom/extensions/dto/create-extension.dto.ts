import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsInt, Min, Max, Matches, MinLength } from 'class-validator';

export class CreateExtensionDto {
    @IsString()
    @IsOptional()
    @Matches(/^[a-zA-Z0-9]{3,10}$/, { message: 'Extension number must be 3-10 alphanumeric characters' })
    extensionNumber?: string;

    @IsString()
    @IsNotEmpty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    // Forward All
    @IsBoolean()
    @IsOptional()
    forwardAllEnabled?: boolean;

    @IsString()
    @IsOptional()
    forwardAllType?: string; // 'extension' | 'external'

    @IsString()
    @IsOptional()
    forwardAllDestination?: string;

    // Forward Busy
    @IsBoolean()
    @IsOptional()
    forwardBusyEnabled?: boolean;

    @IsString()
    @IsOptional()
    forwardBusyType?: string;

    @IsString()
    @IsOptional()
    forwardBusyDestination?: string;

    // Forward No Answer
    @IsBoolean()
    @IsOptional()
    forwardNoAnswerEnabled?: boolean;

    @IsString()
    @IsOptional()
    forwardNoAnswerType?: string;

    @IsString()
    @IsOptional()
    forwardNoAnswerDestination?: string;

    @IsInt()
    @IsOptional()
    @Min(10)
    @Max(120)
    forwardNoAnswerTimeout?: number;

    // Outbound Caller ID
    @IsString()
    @IsOptional()
    outboundCallerIdNumber?: string;
}
