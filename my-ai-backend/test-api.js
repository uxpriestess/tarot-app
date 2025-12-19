// Test the deployed API
const API_URL = 'https://my-ai-backend-d04s0azl3-claires-projects-7718f1e3.vercel.app/api/chat';

async function testAPI() {
    console.log('Testing API at:', API_URL);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: 'Ahoj, jak se máš?',
                cards: [
                    { nameCzech: 'Hvězda' },
                    { nameCzech: 'Měsíc' }
                ]
            })
        });

        console.log('Status:', response.status);
        console.log('Content-Type:', response.headers.get('content-type'));

        const text = await response.text();
        console.log('Raw response:', text.substring(0, 500));

        try {
            const data = JSON.parse(text);
            if (response.ok) {
                console.log('\n✅ SUCCESS! API Response:\n');
                console.log(data.answer);
            } else {
                console.error('\n❌ ERROR:', data);
            }
        } catch (e) {
            console.error('\n❌ Not JSON. Received HTML/text instead');
        }
    } catch (error) {
        console.error('\n❌ FAILED:', error.message);
    }
}

testAPI();
