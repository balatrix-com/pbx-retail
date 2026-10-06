import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { FreeSwitchSyncService } from '../src/freeswitch/freeswitch-sync.service';
import { CarriersService } from '../src/carriers/carriers.service';
import { Client } from 'pg';

async function main() {
  console.log('🚀 Starting Integration Test: DB-Driven Outbound Gateway & Automated Dialplan Resync...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const syncService = app.get(FreeSwitchSyncService);
  const carriersService = app.get(CarriersService);

  // Setup FreeSWITCH DB Client
  const fsClient = new Client({
    host: process.env.FS_DB_HOST,
    port: parseInt(process.env.FS_DB_PORT || '5432', 10),
    database: process.env.FS_DB_NAME,
    user: process.env.FS_DB_USER,
    password: process.env.FS_DB_PASSWORD,
  });
  await fsClient.connect();
  console.log('✅ Connected to FreeSWITCH DB');

  let testCarrierId: number | null = null;
  let testEndpointId: number | null = null;
  let originalDid: any = null;
  let didModified = false;

  try {
    // 1. Create a Test Carrier
    console.log('STEP 1: Creating a test outbound carrier...');
    const carrier = await prisma.outboundCarrier.create({
      data: { name: `Test Carrier ${Date.now()}` }
    });
    testCarrierId = carrier.id;
    console.log(`✅ Test Carrier created with ID: ${testCarrierId}`);

    // 2. Create a System Default Endpoint pointing to 99.99.99.99:5091
    console.log('STEP 2: Creating system default endpoint...');
    const endpoint = await carriersService.createEndpoint(testCarrierId, {
      name: `Test Default Endpoint ${Date.now()}`,
      sipHost: '99.99.99.99',
      sipPort: 5091,
      isSystemDefault: true,
      isActive: true,
    });
    testEndpointId = endpoint.id;
    console.log(`✅ System default endpoint created with ID: ${testEndpointId}`);

    // 3. Find any DID in the database to use as a test target
    console.log('STEP 3: Finding a DID to configure for forwarding...');
    const did = await prisma.dID.findFirst({
      where: { tenantId: { not: null } },
      include: { tenant: true }
    });

    if (!did) {
      throw new Error('❌ Test aborted: No DID with tenantId found in the database. Please add a DID first.');
    }
    console.log(`Using DID: ${did.number} (Tenant: ${did.tenantId}, Code: ${did.tenant?.customerCode})`);

    // Store original details to restore later
    originalDid = {
      id: did.id,
      routeType: did.routeType,
      forwardNumber: did.forwardNumber
    };

    // Update DID to forward route type
    await prisma.dID.update({
      where: { id: did.id },
      data: {
        routeType: 'forward',
        forwardNumber: '+15559876543'
      }
    });
    didModified = true;
    console.log(`✅ DID ${did.number} updated to routeType: 'forward', forwardNumber: '+15559876543'`);

    // 4. Trigger dialplan sync for the DID
    console.log('STEP 4: Triggering dialplan sync for DID...');
    await syncService.syncDID(did.id);
    console.log('✅ Dialplan sync completed');

    // 5. Query dialplan_xml in FreeSWITCH DB and verify it has the gateway 99.99.99.99:5091
    console.log('STEP 5: Verifying generated dialplan XML in FreeSWITCH DB...');
    const dialplanId = `fwd_${did.sequenceId || 0}_${did.tenant?.customerCode}`;
    let res = await fsClient.query(
      'SELECT xml_content FROM dialplan_xml WHERE dialplan_id = $1',
      [dialplanId]
    );

    if (res.rows.length === 0) {
      throw new Error(`❌ Failed: No dialplan record found in dialplan_xml for ${dialplanId}`);
    }

    let xml = res.rows[0].xml_content;
    console.log(`Generated XML for ${dialplanId}:\n${xml}`);

    if (xml.includes('99.99.99.99:5091')) {
      console.log('✅ Success: XML correctly routes through 99.99.99.99:5091');
    } else {
      throw new Error('❌ Failed: XML does not contain 99.99.99.99:5091');
    }

    // 6. Update the system default endpoint's port to 5092 (which should trigger resync)
    console.log('STEP 6: Modifying system default endpoint SIP port (5091 -> 5092)...');
    await carriersService.updateEndpoint(testEndpointId, {
      sipPort: 5092
    });
    console.log('✅ Endpoint updated');

    // 7. Verify that dialplan_xml has been automatically updated to route to 99.99.99.99:5092
    console.log('STEP 7: Verifying automatically updated dialplan XML in FreeSWITCH DB...');
    res = await fsClient.query(
      'SELECT xml_content FROM dialplan_xml WHERE dialplan_id = $1',
      [dialplanId]
    );
    xml = res.rows[0].xml_content;
    console.log(`Updated XML for ${dialplanId}:\n${xml}`);

    if (xml.includes('99.99.99.99:5092')) {
      console.log('✅ Success: XML was automatically regenerated and routes through 99.99.99.99:5092!');
    } else {
      throw new Error('❌ Failed: XML was not automatically updated to use port 5092');
    }

  } catch (error: any) {
    console.error('❌ INTEGRATION TEST FAILED:', error.message);
    process.exitCode = 1;
  } finally {
    console.log('🧹 Cleanup: Restoring DB state...');
    
    // Restore original DID state
    if (didModified && originalDid) {
      try {
        await prisma.dID.update({
          where: { id: originalDid.id },
          data: {
            routeType: originalDid.routeType,
            forwardNumber: originalDid.forwardNumber
          }
        });
        await syncService.syncDID(originalDid.id);
        console.log('✅ Restored original DID route and synced it');
      } catch (err: any) {
        console.error('Failed to restore original DID:', err.message);
      }
    }

    // Delete test endpoint
    if (testEndpointId !== null) {
      try {
        await prisma.outboundEndpoint.delete({ where: { id: testEndpointId } });
        console.log('✅ Test Outbound Endpoint deleted');
      } catch (err: any) {
        console.error('Failed to delete test endpoint:', err.message);
      }
    }

    // Delete test carrier
    if (testCarrierId !== null) {
      try {
        await prisma.outboundCarrier.delete({ where: { id: testCarrierId } });
        console.log('✅ Test Outbound Carrier deleted');
      } catch (err: any) {
        console.error('Failed to delete test carrier:', err.message);
      }
    }

    await fsClient.end();
    await app.close();
    console.log('👋 Test run finished');
  }
}

main().catch(console.error);
