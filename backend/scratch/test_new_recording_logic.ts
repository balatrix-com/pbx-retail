import { RecordingStorageService } from '../src/freeswitch/recording-storage.service';
import { DialplanGeneratorService } from '../src/freeswitch/dialplan-generator.service';
import * as fs from 'fs';
import * as path from 'path';
import { Writable } from 'stream';

// Set up environment variable
const testPath = path.join(__dirname, 'test-recordings-dir');
process.env.FS_RECORDING_PATH = testPath;

async function runTest() {
    console.log('--- STARTING CALL RECORDING UNIT TEST ---');
    console.log(`Configured FS_RECORDING_PATH: ${testPath}`);

    // Create the test recordings folder clean
    if (fs.existsSync(testPath)) {
        fs.rmSync(testPath, { recursive: true, force: true });
    }
    fs.mkdirSync(testPath, { recursive: true });

    // Initialize service
    const storageService = new RecordingStorageService();
    const generatorService = new DialplanGeneratorService();

    // 1. Test ensureRecordingsDirectory
    console.log('\n[Test 1] ensureRecordingsDirectory:');
    const customerCode = 'test_cust_001';
    await storageService.ensureRecordingsDirectory(customerCode);
    const expectedDir = path.join(testPath, customerCode);
    const dirExists = fs.existsSync(expectedDir);
    console.log(`Directory created: ${dirExists ? 'SUCCESS' : 'FAILED'} (Path: ${expectedDir})`);
    if (!dirExists) throw new Error('ensureRecordingsDirectory failed to create directory');

    // 2. Test checkFileExists and file operations
    console.log('\n[Test 2] checkFileExists:');
    const callUuid = 'some-uuid-1234';
    const testFile = path.join(expectedDir, `${callUuid}.mp3`);
    fs.writeFileSync(testFile, 'mock mp3 data');

    // Path starting with /recordings
    const remotePath = `/recordings/${customerCode}/${callUuid}.mp3`;
    const fileExists = await storageService.checkFileExists(remotePath);
    console.log(`File exists check (starts with /recordings): ${fileExists ? 'SUCCESS' : 'FAILED'}`);
    if (!fileExists) throw new Error('checkFileExists failed');

    // 3. Test streamAudio
    console.log('\n[Test 3] streamAudio:');
    const mockResponse = {
        headers: {} as Record<string, string>,
        statusVal: 200,
        bodyData: '',
        headersSent: false,
        setHeader(name: string, value: string) {
            this.headers[name] = value;
        },
        status(code: number) {
            this.statusVal = code;
            return this;
        },
        send(data: string) {
            this.bodyData = data;
        },
        end() {
            this.headersSent = true;
        }
    };

    await new Promise<void>((resolve, reject) => {
        let receivedData = '';
        const mockResStream = new Writable({
            write(chunk, encoding, callback) {
                receivedData += chunk.toString();
                callback();
            }
        }) as any;

        mockResStream.setHeader = (name: string, value: string) => {
            mockResponse.setHeader(name, value);
        };
        mockResStream.status = (code: number) => {
            mockResponse.status(code);
            return mockResStream;
        };
        mockResStream.send = (data: string) => {
            mockResponse.send(data);
            resolve();
        };

        const originalEnd = mockResStream.end.bind(mockResStream);
        mockResStream.end = (chunk?: any, cb?: any) => {
            if (chunk) {
                receivedData += chunk.toString();
            }
            mockResponse.end();
            mockResponse.bodyData = receivedData;
            resolve();
            originalEnd(cb);
        };

        storageService.streamAudio(remotePath, mockResStream).catch(reject);
    });

    console.log(`Response Status: ${mockResponse.statusVal}`);
    console.log(`Content-Disposition Header: ${mockResponse.headers['Content-Disposition']}`);
    console.log(`Response Streamed Data: "${mockResponse.bodyData}"`);
    if (mockResponse.bodyData !== 'mock mp3 data') {
        throw new Error(`streamAudio failed: expected "mock mp3 data" but got "${mockResponse.bodyData}"`);
    }
    console.log('streamAudio check: SUCCESS');

    // 4. Test DialplanGeneratorService
    console.log('\n[Test 4] DialplanGeneratorService paths:');
    const xml = generatorService.generateSimpleExtensionXML(
        'dial_key',
        '101',
        'localhost',
        true,
        customerCode
    );
    const expectedSubString = `execute_on_answer='record_session ${testPath}/${customerCode}/\select_on_answer'`; // wait, the uuid has a backslash before it: \${uuid}
    const expectedSubStringMatch = `execute_on_answer='record_session ${testPath}/${customerCode}/\${uuid}.mp3'`;
    const containsCorrectPath = xml.includes(expectedSubStringMatch);
    console.log(`Dialplan contains correct path: ${containsCorrectPath ? 'SUCCESS' : 'FAILED'}`);
    if (!containsCorrectPath) {
        console.log(`Generated XML:\n${xml}`);
        throw new Error('Dialplan path check failed');
    }

    // Cleanup
    fs.rmSync(testPath, { recursive: true, force: true });
    console.log('\n--- ALL TESTS PASSED SUCCESSFULLY! ---');
}

runTest().catch(err => {
    console.error('\n--- TEST FAILED! ---');
    console.error(err);
    process.exit(1);
});
