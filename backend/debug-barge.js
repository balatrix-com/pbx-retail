const axios = require('axios');

async function testBarge() {
    const url = 'http://localhost:8003/barge';
    const apiKey = 'J2vDWrxu9dhJGc9VCxL30mJP2TVvnGI99YVba6FSEyA'; // From .env

    console.log(`Testing Barge API at ${url}...`);

    try {
        const response = await axios.post(
            url,
            {
                uuid_in: 'd0702da3-4192-4248-85c8-2008bcea7cc1', // From recent log
                uuid_out: '35645103-2f6b-46ea-a6fa-c97d485827a9', // From recent log
                admin_extension: '100101', // Example admin ext
                mode: 'listen'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey
                },
                timeout: 5000
            }
        );

        console.log('Success:', response.status);
        console.log('Data:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('API Error:', error.response.status);
            console.error('Data:', error.response.data);
        } else if (error.request) {
            console.error('No response received (Network/Timeout)');
            console.error(error.message);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testBarge();
