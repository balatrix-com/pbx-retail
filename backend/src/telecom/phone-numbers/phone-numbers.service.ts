import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DIDsService } from '../dids/dids.service';
import { TFNsService } from '../tfns/tfns.service';
import { PhoneNumberResponseDto } from './dto/phone-number-response.dto';
import { UpdatePhoneNumberDto } from './dto/update-phone-number.dto';

@Injectable()
export class PhoneNumbersService {
    constructor(
        private readonly didsService: DIDsService,
        private readonly tfnsService: TFNsService,
    ) { }

    async findAll(tenantId: string): Promise<PhoneNumberResponseDto[]> {
        const [dids, tfns] = await Promise.all([
            this.didsService.findAll(tenantId),
            this.tfnsService.findAll(tenantId),
        ]);

        const unifiedNumbers: PhoneNumberResponseDto[] = [];

        dids.forEach(did => {
            unifiedNumbers.push({
                id: did.id,
                number: did.number,
                type: 'DID',
                status: did.isActive ? 'ACTIVE' : 'INACTIVE',
                monthlyFee: did.monthlyFee ? Number(did.monthlyFee) : 0,
                routeType: did.routeType,
                routeTargetId: did.routeTargetId,
                forwardEnabled: did.forwardEnabled,
                forwardNumber: did.forwardNumber,
                createdAt: did.createdAt,
            });
        });

        tfns.forEach(tfn => {
            unifiedNumbers.push({
                id: tfn.id,
                number: tfn.number,
                type: 'TFN',
                status: tfn.status,
                monthlyFee: tfn.price ? Number(tfn.price) : 0,
                routeType: tfn.routeType,
                routeTargetId: tfn.routeTargetId,
                forwardEnabled: tfn.forwardEnabled,
                forwardNumber: tfn.forwardNumber,
                createdAt: tfn.createdAt,
            });
        });

        return unifiedNumbers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    async findOne(tenantId: string, id: string): Promise<PhoneNumberResponseDto> {
        let result: any = null;
        let type: 'DID' | 'TFN' | null = null;
        
        try {
            result = await this.didsService.findOne(tenantId, id);
            type = 'DID';
        } catch(e) {
            try {
                result = await this.tfnsService.findOne(tenantId, id);
                type = 'TFN';
            } catch(err) {
                throw new NotFoundException('Phone number not found');
            }
        }
        
        if (type === 'DID') {
             return {
                id: result.id,
                number: result.number,
                type: 'DID',
                status: result.isActive ? 'ACTIVE' : 'INACTIVE',
                monthlyFee: result.monthlyFee ? Number(result.monthlyFee) : 0,
                routeType: result.routeType,
                routeTargetId: result.routeTargetId,
                forwardEnabled: result.forwardEnabled,
                forwardNumber: result.forwardNumber,
                createdAt: result.createdAt,
            };
        } else {
             return {
                id: result.id,
                number: result.number,
                type: 'TFN',
                status: result.status,
                monthlyFee: result.price ? Number(result.price) : 0,
                routeType: result.routeType,
                routeTargetId: result.routeTargetId,
                forwardEnabled: result.forwardEnabled,
                forwardNumber: result.forwardNumber,
                createdAt: result.createdAt,
            };
        }
    }

    async update(tenantId: string, id: string, dto: UpdatePhoneNumberDto) {
        if (dto.type === 'DID') {
            return this.didsService.update(tenantId, id, {
                routeType: dto.routeType as any,
                routeDestinationId: dto.routeDestinationId,
                forwardNumber: dto.forwardNumber,
            });
        } else if (dto.type === 'TFN') {
            return this.tfnsService.update(tenantId, id, {
                routeType: dto.routeType as any,
                routeDestinationId: dto.routeDestinationId,
                forwardNumber: dto.forwardNumber,
            });
        } else {
            throw new BadRequestException('Invalid phone number type specified for update');
        }
    }
}
