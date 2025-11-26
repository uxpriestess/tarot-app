import { View, Text, Button } from "react-native";
import { useAppStore } from "../store/appStore";

export default function DrawScreen() {
    const addDraw = useAppStore((s) => s.addDraw);

    const drawRandomCard = () => {
        const cards = ["Mág", "Poustevník", "Síla", "Císařovna"];
        const random = cards[Math.floor(Math.random() * cards.length)];
        addDraw(random);
    };

    return (
        <View style={{ padding: 20 }}>
            <Button title="Táhnout kartu" onPress={drawRandomCard} />
        </View>
    );
}
