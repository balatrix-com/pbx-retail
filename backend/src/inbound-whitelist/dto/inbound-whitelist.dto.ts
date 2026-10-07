import { Type } from 'class-transformer';
import { IsIP, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateInboundWhitelistDto {
  @IsIP(4)
  ipAddress!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(65535)
  port?: number = 5060;
  @IsString() @IsNotEmpty() @MaxLength(100)
  tag!: string;
}

export class UpdateInboundWhitelistDto {
  @IsOptional() @IsIP(4)
  ipAddress?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(65535)
  port?: number;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100)
  tag?: string;
}
