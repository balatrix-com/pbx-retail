// Using global fetch (Node 18+)

const apiKey = "Zoho-enczapikey PHtE6r0PEb+92TMm9UNR46S+H5X3Z9st9elnegUWuYsXDvdVG00AqdF/wD6y/Rp5XKRKHKSYyo9usLOa4b7QdGbpNT5ND2qyqK3sx/VYSPOZsbq6x00bs1QZckDZUoXue99s1STQstnYNA==";
const apiUrl = 'https://api.zeptomail.in/v1.1/email/template';

async function testEmail() {
    const payload = {
        mail_template_key: "sip-ob",
        from: {
            address: "no-reply@telecom-platform.com",
            name: "Cloud PBX Portal"
        },
        to: [{
            email_address: {
                address: "sahil@example.com", // testing with user email
                name: "Sahil",
            }
        }],
        merge_info: {
            customer_name: "Sahil Test",
            customer_code: "TEST-001",
            phone_num: "1234567890",
            login_url: "https://subdev.telecom-platform.com/login",
            extension_list: "<li>Ext 101</li>"
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.text();
        console.log('Status:', response.status);
        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error);
    }
}

testEmail();
