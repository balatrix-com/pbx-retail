import { IsString, IsOptional, MinLength } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateExtensionDto } from './create-extension.dto';

export class UpdateExtensionDto extends PartialType(CreateExtensionDto) {
    // All fields from CreateExtensionDto are optional for updates
    // Extension number cannot be changed after creation
    @IsString()
    @IsOptional()
    @MinLength(6)
    sipPassword?: string;
}
