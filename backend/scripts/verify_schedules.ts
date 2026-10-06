import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { DialplanGeneratorService } from '../src/freeswitch/dialplan-generator.service';

const service = new DialplanGeneratorService();

console.log('--- Verifying Schedule and Forwarding XML ---');

// 1. Verify DID Forwarding
const fwdKey = 'fwd1_1002';
const fwdDest = '+15551234567';
const expectedGateway = process.env.OUTBOUND_GATEWAY || 'localhost:5060';
const fwdXml = service.generateDIDForwardXML(fwdKey, fwdDest, expectedGateway);

console.log('\n[Forwarding Check]');
if (fwdXml.includes(`bridge" data="{ignore_early_media=true}sofia/external/${fwdDest}@${expectedGateway}"`)) {
    console.log('✅ Forwarding Bridge string matches.');
} else {
    console.log('❌ Forwarding Bridge string MISMATCH.');
    console.log(fwdXml);
}

// 2. Verify DID Schedule (Time conversion)
const schedKey = 'sched1_1002';
const rules = {
    primaryRoute: 'ext1_1002',
    afterHoursRoute: 'ivr1_1002',
    weekendRoute: 'vm_1002',
    startTime: '09:00', // Should be 9*60 = 540
    endTime: '17:30',   // Should be 17*60 + 30 = 1050
    weekdays: '1-5'
};

const schedXml = service.generateDIDScheduleXML(schedKey, 'America/New_York', rules);

console.log('\n[Schedule Check]');
// Check time conversion
if (schedXml.includes('minute-of-day="540-1050"')) {
    console.log('✅ Time conversion (09:00-17:30 -> 540-1050) matches.');
} else {
    console.log('❌ Time conversion MISMATCH.');

    // Extract what it actually has
    const match = schedXml.match(/minute-of-day="([^"]+)"/);
    if (match) {
        console.log(`   Found: ${match[1]}`);
    } else {
        console.log('   No minute-of-day condition found.');
        console.log(schedXml);
    }
}

// Check Step structure (spot check)
if (schedXml.includes(`${schedKey}_time_based_bh`)) {
    console.log('✅ Business Hours extension found.');
} else {
    console.log('❌ Business Hours extension missing.');
}
