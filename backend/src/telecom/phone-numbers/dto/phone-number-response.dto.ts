export class PhoneNumberResponseDto {
    id: string;
    number: string;
    type: 'DID' | 'TFN';
    status: string;
    monthlyFee: number;
    routeType: string | null;
    routeTargetId: string | null;
    forwardEnabled: boolean;
    forwardNumber: string | null;
    createdAt: Date;
}
