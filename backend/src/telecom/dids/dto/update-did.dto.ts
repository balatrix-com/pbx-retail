import { PartialType } from '@nestjs/mapped-types';
import { CreateDIDDto } from './create-did.dto';

export class UpdateDIDDto extends PartialType(CreateDIDDto) {
    // All fields from CreateDIDDto are optional for updates
}
