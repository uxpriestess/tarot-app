const API_URL = 'https://my-ai-backend-dun.vercel.app/api/chat';

async function run() {
    try {
        const resp = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                spreadName: "Láska a vztahy",
                mode: "reading-screen",
                cards: [
                    { name: "Ten of Wands", nameCzech: "Desítka holí", position: "upright", label: "Ty" },
                    { name: "Four of Cups", nameCzech: "Čtyřka pohárů", position: "upright", label: "Partner" },
                    { name: "Two of Cups", nameCzech: "Dvojka pohárů", position: "upright", label: "Vztah" }
                ]
            })
        });
        const data = await resp.json();
        console.log("ANSWER_START");
        console.log(data.answer);
        console.log("ANSWER_END");
    } catch (e) {
        console.log("ERROR:", e.message);
    }
}
run();
