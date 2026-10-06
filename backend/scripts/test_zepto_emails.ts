
import { PrismaService } from '../src/prisma/prisma.service';
import { MailService } from '../src/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function testEmails() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const mailService = app.get(MailService);

    const testEmail = 'nexaworks28@gmail.com'; // Change this to your email for testing
    const testName = 'Sahil Test';

    console.log(`Sending test emails to ${testEmail}...`);

    // 1. Test Support Invite
    console.log('Sending Support Invite...');
    await mailService.sendSupportInvitationEmail(
        testEmail,
        testName,
        'test-token-123',
        'Admin Sahil',
        'Cloud PBX Demo Corp'
    );

    // 2. Test Onboarding Completion
    console.log('Sending Onboarding Completion...');
    const extensionsHtml = `&bull; <b>1001</b> - Sales Team<br>&bull; <b>1002</b> - Support Desk<br>`;
    await mailService.sendOnboardingCompletionEmail(
        testEmail,
        testName,
        'A104',
        '+16475551234',
        extensionsHtml,
        testEmail,
        'Standard Startup Plan',
        'QT-0001-X'
    );

    console.log('Test emails triggered. Check ZeptoMail logs or your inbox.');
    await app.close();
}

testEmails().catch(console.error);
