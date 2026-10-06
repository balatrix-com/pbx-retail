import { PartialType } from '@nestjs/mapped-types';
import { CreateTFNDto } from './create-tfn.dto';

export class UpdateTFNDto extends PartialType(CreateTFNDto) { }
