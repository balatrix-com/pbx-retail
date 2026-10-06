import { PartialType } from '@nestjs/mapped-types';
import { CreateDIDForwardDto } from './create-did-forward.dto';

export class UpdateDIDForwardDto extends PartialType(CreateDIDForwardDto) { }
