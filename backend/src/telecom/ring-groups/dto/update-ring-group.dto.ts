import { PartialType } from '@nestjs/mapped-types';
import { CreateRingGroupDto } from './create-ring-group.dto';

export class UpdateRingGroupDto extends PartialType(CreateRingGroupDto) {
    // All fields from CreateRingGroupDto are optional for updates
}
