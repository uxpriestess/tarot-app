
const API_URL = 'https://my-ai-backend-dun.vercel.app/api/chat';

async function testBackend() {
    console.log('🔮 Connecting to live Tarotka backend...');
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: "Testing connection",
                cards: [{
                    name: "The Fool",
                    nameCzech: "Blázen",
                    position: "upright"
                }]
            })
        });

        if (!response.ok) {
            console.error('❌ Error Status:', response.status);
            const text = await response.text();
            console.error('❌ Error Body:', text);
            return;
        }

        const data = await response.json();
        console.log('\n✅ SUCCESS! Full Response Object:');
        console.log(JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('❌ Connection failed:', error.message);
    }
}

testBackend();
