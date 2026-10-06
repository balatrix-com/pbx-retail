import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class IdempotencyService {
    constructor(private prisma: PrismaService) { }

    async check(key: string, path: string, method: string, params: any) {
        const existing = await this.prisma.idempotencyKey.findUnique({
            where: { key },
        });

        if (existing) {
            return existing;
        }

        // Lock the key immediately to prevent race conditions
        // In a real distributed system, use Redis SETNX. Here, DB Insert is safe enough for low concurrency per-key.
        // If insert fails (unique constraint), it's a race -> treat as existing.
        try {
            await this.prisma.idempotencyKey.create({
                data: {
                    key,
                    path,
                    method,
                    params: params ? JSON.parse(JSON.stringify(params)) : {},
                    response: Prisma.JsonNull, // Pending
                },
            });
            return null; // Not found, lock acquired
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                return this.prisma.idempotencyKey.findUnique({ where: { key } });
            }
            throw e;
        }
    }

    async saveResponse(key: string, response: any) {
        await this.prisma.idempotencyKey.update({
            where: { key },
            data: { response: response ? JSON.parse(JSON.stringify(response)) : {} },
        });
    }
}
