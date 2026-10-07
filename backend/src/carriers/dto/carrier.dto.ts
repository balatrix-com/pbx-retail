import { Type } from 'class-transformer';
import {
  IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString,
  Matches, Max, MaxLength, Min,
} from 'class-validator';

const SIP_HOST = /^(?=.{1,253}$)(?:\d{1,3}(?:\.\d{1,3}){3}|(?:(?!-)[a-zA-Z0-9-]{1,63}(?<!-)\.)+(?!-)[a-zA-Z0-9-]{1,63}(?<!-))$/;

export class CreateCarrierDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name!: string;
}

export class UpdateCarrierDto extends CreateCarrierDto {}

export class EndpointDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name!: string;
  @IsString() @Matches(SIP_HOST, { message: 'sipHost must be an IPv4 address or hostname' })
  sipHost!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(65535)
  sipPort: number = 5060;
  @IsIn(['udp', 'tcp', 'tls'])
  transport: string = 'udp';
  @IsOptional() @IsString() @MaxLength(32)
  prefix?: string = '';
  @IsOptional() @IsBoolean()
  stripPlus?: boolean = false;
  @IsIn(['extension', 'override'])
  callerIdMode: string = 'extension';
  @IsOptional() @IsString() @MaxLength(32)
  callerIdNumber?: string | null;
  @IsOptional() @IsBoolean()
  isActive?: boolean = true;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000)
  priority?: number = 100;
}

export class UpdateEndpointDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100)
  name?: string;
  @IsOptional() @IsString() @Matches(SIP_HOST, { message: 'sipHost must be an IPv4 address or hostname' })
  sipHost?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(65535)
  sipPort?: number;
  @IsOptional() @IsIn(['udp', 'tcp', 'tls'])
  transport?: string;
  @IsOptional() @IsString() @MaxLength(32)
  prefix?: string;
  @IsOptional() @IsBoolean()
  stripPlus?: boolean;
  @IsOptional() @IsIn(['extension', 'override'])
  callerIdMode?: string;
  @IsOptional() @IsString() @MaxLength(32)
  callerIdNumber?: string | null;
  @IsOptional() @IsBoolean()
  isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000)
  priority?: number;
}
