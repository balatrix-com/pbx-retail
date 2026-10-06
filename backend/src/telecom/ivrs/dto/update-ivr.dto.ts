import { PartialType } from '@nestjs/mapped-types';
import { CreateIVRDto } from './create-ivr.dto';

export class UpdateIVRDto extends PartialType(CreateIVRDto) {
    // All fields from CreateIVRDto are optional for updates
}
