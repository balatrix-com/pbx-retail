import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit_metadata';
export const Audit = (action: string, category: string) =>
    SetMetadata(AUDIT_KEY, { action, category });
