import { IsArray, ValidateNested, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class MemberOrderDto {
  @IsUUID()
  id: string;

  @IsInt()
  @Min(1)
  position: number;
}

export class ReorderMembersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MemberOrderDto)
  orders: MemberOrderDto[];
}
