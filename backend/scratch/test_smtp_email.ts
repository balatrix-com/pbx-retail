import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function runTest() {
    console.log('--- STARTING SMTP MAIL INTEGRATION TEST ---');
    const app = await NestFactory.createApplicationContext(AppModule);
    const mailService = app.get(MailService);
    const prisma = app.get(PrismaService);

    // 1. Fetch current partner branding or create one for testing
    let partner = await prisma.partner.findFirst();
    const originalSettings = partner ? { ...partner } : null;

    console.log('\n[Step 1] Configuring temporary SMTP credentials in DB...');
    const testSmtpSettings = {
        smtpHost: 'smtp.mailtrap.io',
        smtpPort: 2525,
        smtpSecure: false,
        smtpUser: 'test-user-123',
        smtpPass: 'test-pass-123',
        smtpFromName: 'Test SMTP Sender',
        smtpFromEmail: 'test@telecom-platform.com',
    };

    if (partner) {
        partner = await prisma.partner.update({
            where: { id: partner.id },
            data: testSmtpSettings,
        });
    } else {
        partner = await prisma.partner.create({
            data: {
                domain: 'smtp-test-domain',
                name: 'Test Partner',
                ...testSmtpSettings,
            },
        });
    }

    console.log('Branding model updated in database with mock SMTP settings.');

    // 2. Trigger MailService.sendPasswordResetEmail
    console.log('\n[Step 2] Sending test password reset email (expecting SMTP trigger)...');
    
    // We expect this to attempt SMTP, log "via custom SMTP...", fail due to invalid auth, and log fallback
    await mailService.sendPasswordResetEmail(
        'recipient@example.com',
        'Test User',
        'dummy-token-1234',
        'SMTP Test Platform'
    );

    // 3. Restore original settings
    console.log('\n[Step 3] Restoring original branding settings in DB...');
    if (originalSettings) {
        // Strip relations out for prisma update
        const { id, tenants, users, ...data } = originalSettings as any;
        await prisma.partner.update({
            where: { id: originalSettings.id },
            data: data,
        });
        console.log('Original branding settings restored.');
    } else {
        await prisma.partner.delete({
            where: { id: partner.id },
        });
        console.log('Temporary test branding deleted.');
    }

    await app.close();
    console.log('\n--- SMTP MAIL INTEGRATION TEST COMPLETED ---');
}

runTest().catch(err => {
    console.error('\n--- TEST FAILED ---');
    console.error(err);
    process.exit(1);
});
