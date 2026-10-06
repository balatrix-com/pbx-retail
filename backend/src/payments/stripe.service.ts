import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StripeService {
    private stripe: Stripe;
    private readonly logger = new Logger(StripeService.name);

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        if (!secretKey) {
            this.logger.error('STRIPE_SECRET_KEY is not defined');
            throw new Error('STRIPE_SECRET_KEY is not defined');
        }

        this.stripe = new Stripe(secretKey, {
            apiVersion: '2024-12-18.acacia' as any, // Bypass strict type check
        });
    }



    async verifySession(sessionId: string) {
        const session = await this.stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') {
            throw new Error('Payment not completed');
        }
        return session;
    }
}
