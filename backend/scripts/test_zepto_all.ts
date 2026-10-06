
import { MailService } from '../src/mail/mail.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function testAllPbxTemplates() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const mailService = app.get(MailService);

    const testEmail = 'sahilghewari6@gmail.com';
    const testName = 'Sahil Test (PBX)';

    console.log(`--- Testing PBX Templates for ${testEmail} ---`);

    // 1. Test Password Reset (pass-reset)
    console.log('[1/3] Sending Password Reset (pass-reset)...');
    try {
        await mailService.sendPasswordResetEmail(
            testEmail,
            testName,
            'test-reset-token-999',
            'Cloud PBX'
        );
        console.log('Successfully triggered Password Reset Email.');
    } catch (error) {
        console.error('Failed to send Password Reset Email:', error);
    }

    // 2. Test Support Invite (sup-user-inv)
    console.log('[2/3] Sending Support Invite (sup-user-inv)...');
    try {
        await mailService.sendSupportInvitationEmail(
            testEmail,
            testName,
            'test-invite-token-888',
            'Super Admin',
            'Test Corp'
        );
        console.log('Successfully triggered Support Invite Email.');
    } catch (error) {
        console.error('Failed to send Support Invite Email:', error);
    }

    // 3. Test Onboarding Completion (sip-ob)
    console.log('[3/3] Sending Onboarding Completion (sip-ob)...');
    try {
        const extensionsHtml = `&bull; <b>101</b> - Sahil (Owner)<br>&bull; <b>102</b> - Support<br>`;
        await mailService.sendOnboardingCompletionEmail(
            testEmail,
            testName,
            'B999',
            '+18667360279',
            extensionsHtml,
            testEmail,
            'Premium Business Plan',
            'QT-2026-TEST'
        );
        console.log('Successfully triggered Onboarding Completion Email.');
    } catch (error) {
        console.error('Failed to send Onboarding Completion Email:', error);
    }

    console.log('--- PBX Tests Completed ---');
    await app.close();
}

testAllPbxTemplates().catch(console.error);
