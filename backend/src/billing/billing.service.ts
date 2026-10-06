import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class BillingService implements OnModuleInit {
    private stripe: Stripe;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService
    ) { }

    onModuleInit() {
        const secretKey = this.configService.get<string>('stripe.secretKey');
        if (!secretKey) {
            console.warn('Stripe Secret Key not configured. Running in MOCK mode.');
            return;
        }

        this.stripe = new Stripe(secretKey, {
            apiVersion: '2025-12-15.clover' as any,
        });
    }

    isStripeConfigured(): boolean {
        return !!this.stripe;
    }

    async createCustomer(name: string, email: string) {
        if (!this.stripe) throw new Error('Stripe not configured');

        // Search if exists
        const existing = await this.stripe.customers.list({ email, limit: 1 });
        if (existing.data.length > 0) return existing.data[0];

        return this.stripe.customers.create({
            name,
            email,
        });
    }

    async createSetupIntent(customerId: string) {
        if (!this.stripe) throw new Error('Stripe not configured');
        return this.stripe.setupIntents.create({
            customer: customerId,
        });
    }

    async createCheckoutSession(tenantId: string) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) throw new NotFoundException('Tenant not found');

        let customerId = tenant.stripeCustomerId;

        if (!this.stripe) {
            // Mock Mode Logic
            if (!customerId) {
                customerId = `cus_mock_${tenantId}`;
                await this.prisma.tenant.update({
                    where: { id: tenantId },
                    data: { stripeCustomerId: customerId }
                });
            }
            return { url: 'https://checkout.stripe.com/mock-session' };
        }

        if (!customerId) {
            const customer = await this.stripe.customers.create({
                name: tenant.name,
                metadata: { tenantId: tenant.id }
            });
            customerId = customer.id;
            await this.prisma.tenant.update({
                where: { id: tenant.id },
                data: { stripeCustomerId: customerId }
            });
        }

        const frontendUrl = this.configService.get<string>('frontendUrl') || 'http://localhost:5173';
        const session = await this.stripe.checkout.sessions.create({
            mode: 'setup',
            currency: 'usd',
            customer: customerId,
            success_url: `${frontendUrl}/billing?success=true`,
            cancel_url: `${frontendUrl}/billing?canceled=true`,
        });

        return { url: session.url };
    }

    async handleWebhook(signature: string, payload: Buffer) {
        if (!this.stripe) {
            console.log('Mock Webhook received');
            return { received: true };
        }
        const webhookSecret = this.configService.get<string>('stripe.webhookSecret');
        if (!webhookSecret) throw new Error('Stripe Webhook Secret not configured');

        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        } catch (err) {
            throw new BadRequestException(`Webhook Error: ${err.message}`);
        }

        if (event.type === 'setup_intent.succeeded') {
            const setupIntent = event.data.object as Stripe.SetupIntent;
            await this.savePaymentMethod(setupIntent.payment_method as string, setupIntent.customer as string);
        }

        return { received: true };
    }

    async savePaymentMethod(paymentMethodId: string, customerId: string) {
        // 1. Fetch PM details from Stripe
        const pm = await this.stripe.paymentMethods.retrieve(paymentMethodId);

        // 2. Find Tenant
        const tenant = await this.prisma.tenant.findFirst({ where: { stripeCustomerId: customerId } });
        if (!tenant) {
            console.error(`Tenant not found for customer ${customerId}`);
            return;
        }

        // 3. Save to DB
        // Check if ID exists to avoid duplicate
        const exists = await this.prisma.paymentMethod.findUnique({ where: { id: paymentMethodId } });
        if (exists) return;

        // Check if this is the first one, make it default
        const count = await this.prisma.paymentMethod.count({ where: { tenantId: tenant.id } });
        const isFirst = count === 0;

        // Create expiry date from card info
        let expiresAt = null;
        if (pm.card?.exp_month && pm.card?.exp_year) {
            // Set to last day of expiry month
            expiresAt = new Date(pm.card.exp_year, pm.card.exp_month, 0);
        }

        await this.prisma.paymentMethod.create({
            data: {
                id: paymentMethodId,
                tenantId: tenant.id,
                brand: pm.card?.brand || 'unknown',
                last4: pm.card?.last4 || '0000',
                isDefault: isFirst,
                expiresAt,
            }
        });

        // If this is the first card, set it as default in Stripe too
        if (isFirst) {
            await this.stripe.customers.update(customerId, {
                invoice_settings: { default_payment_method: paymentMethodId }
            });
        }

        console.log(`Saved PM ${paymentMethodId} for Tenant ${tenant.id}${isFirst ? ' (set as default)' : ''}`);
    }

    async listPaymentMethods(tenantId: string) {
        // 1. Sync with Stripe if possible
        if (this.stripe) {
            const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
            if (tenant?.stripeCustomerId) {
                try {
                    const [paymentMethods, customer] = await Promise.all([
                        this.stripe.paymentMethods.list({
                            customer: tenant.stripeCustomerId,
                            type: 'card',
                        }),
                        this.stripe.customers.retrieve(tenant.stripeCustomerId)
                    ]);

                    if (!customer.deleted) {
                        const defaultPmId = (customer as Stripe.Customer).invoice_settings.default_payment_method as string;

                        // Sync each PM
                        for (const pm of paymentMethods.data) {
                            let expiresAt = null;
                            if (pm.card?.exp_month && pm.card?.exp_year) {
                                expiresAt = new Date(pm.card.exp_year, pm.card.exp_month, 0);
                            }

                            await this.prisma.paymentMethod.upsert({
                                where: { id: pm.id },
                                update: {
                                    brand: pm.card?.brand || 'unknown',
                                    last4: pm.card?.last4 || '0000',
                                    expiresAt,
                                    isDefault: pm.id === defaultPmId
                                },
                                create: {
                                    id: pm.id,
                                    tenantId: tenant.id,
                                    brand: pm.card?.brand || 'unknown',
                                    last4: pm.card?.last4 || '0000',
                                    expiresAt,
                                    isDefault: pm.id === defaultPmId
                                }
                            });
                        }

                        // Handle removal of deleted cards? 
                        // Optional: Delete from DB if not in Stripe list.
                        // For safety, we can just rely on upserting existing ones.
                    }
                } catch (error) {
                    console.error('Failed to sync payment methods from Stripe:', error);
                    // Continue to return what we have locally
                }
            }
        }

        const methods = await this.prisma.paymentMethod.findMany({
            where: { tenantId },
            orderBy: { isDefault: 'desc' }
        });

        // Format expiry date for frontend
        return methods.map(method => ({
            ...method,
            expMonth: method.expiresAt ? method.expiresAt.getMonth() + 1 : null,
            expYear: method.expiresAt ? method.expiresAt.getFullYear() : null,
        }));
    }

    async setDefaultPaymentMethod(tenantId: string, paymentMethodId: string) {
        const pm = await this.prisma.paymentMethod.findFirst({ where: { id: paymentMethodId, tenantId } });
        if (!pm) throw new NotFoundException('Payment method not found');

        await this.prisma.$transaction([
            this.prisma.paymentMethod.updateMany({
                where: { tenantId, isDefault: true },
                data: { isDefault: false }
            }),
            this.prisma.paymentMethod.update({
                where: { id: paymentMethodId },
                data: { isDefault: true }
            })
        ]);

        // Sync with Stripe Customer Default (optional but recommended)
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (tenant?.stripeCustomerId && this.stripe) {
            await this.stripe.customers.update(tenant.stripeCustomerId, {
                invoice_settings: { default_payment_method: paymentMethodId }
            });
        }

        return { success: true };
    }

    async chargeCustomer(tenantId: string, amount: number, description: string) {
        if (!this.stripe) {
            console.log(`Mock Charge: $${amount} for tenant ${tenantId}`);
            return { id: `ch_mock_${Date.now()}`, status: 'succeeded' };
        }

        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant || !tenant.stripeCustomerId) throw new BadRequestException('Tenant has no payment method configured');

        const customer = await this.stripe.customers.retrieve(tenant.stripeCustomerId);
        if (customer.deleted) throw new BadRequestException('Customer deleted');

        let defaultPm = (customer as Stripe.Customer).invoice_settings.default_payment_method as string;

        // Auto-fix: If no default PM but customer has cards, set the first one as default
        if (!defaultPm) {
            const paymentMethods = await this.stripe.paymentMethods.list({
                customer: tenant.stripeCustomerId,
                type: 'card',
                limit: 1,
            });

            if (paymentMethods.data.length > 0) {
                defaultPm = paymentMethods.data[0].id;
                await this.stripe.customers.update(tenant.stripeCustomerId, {
                    invoice_settings: { default_payment_method: defaultPm }
                });
                // Also update local DB
                await this.prisma.$transaction([
                    this.prisma.paymentMethod.updateMany({
                        where: { tenantId: tenant.id, isDefault: true },
                        data: { isDefault: false }
                    }),
                    this.prisma.paymentMethod.upsert({
                        where: { id: defaultPm },
                        update: { isDefault: true },
                        create: {
                            id: defaultPm,
                            tenantId: tenant.id,
                            brand: paymentMethods.data[0].card?.brand || 'unknown',
                            last4: paymentMethods.data[0].card?.last4 || '0000',
                            isDefault: true
                        }
                    })
                ]);
            } else {
                throw new BadRequestException('No payment method configured');
            }
        }

        const frontendUrl = this.configService.get<string>('frontendUrl') || 'http://localhost:5173';
        // Create PaymentIntent
        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Convert to cents
                currency: 'usd',
                customer: tenant.stripeCustomerId,
                payment_method: defaultPm,
                off_session: true,
                confirm: true,
                description,
                return_url: `${frontendUrl}/payment-return` // Required for some flows
            });

            if (paymentIntent.status === 'succeeded') {
                return { id: paymentIntent.id, status: 'succeeded' };
            }
            throw new Error(`Payment failed: ${paymentIntent.status}`);

        } catch (err) {
            throw new BadRequestException(`Charge failed: ${err.message}`);
        }
    }
}
