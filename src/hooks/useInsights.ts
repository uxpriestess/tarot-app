import { useAppStore } from "../store/appStore";
import { getInsightsOutput } from "../insights";
import { Insight } from "../insights/types";
import { getCardById } from "../data";

export function useInsights() {
    const journalEntries = useAppStore((s) => s.journalEntries);
    const streakDays = useAppStore((s) => s.streakDays);
    const journalHistory = useAppStore((s) => s.journalHistory);
    const style = useAppStore((s) => s.userMicrocopyStyle);

    // Calculate most drawn card from journalHistory
    const cardCounts = journalHistory.reduce((acc, entry) => {
        acc[entry.cardId] = (acc[entry.cardId] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const mostDrawnId = Object.keys(cardCounts).length > 0
        ? Object.keys(cardCounts).reduce((a, b) => cardCounts[a] > cardCounts[b] ? a : b)
        : null;

    const mostDrawnCard = mostDrawnId ? getCardById(mostDrawnId) : null;

    const insights: Insight[] = [];

    if (journalEntries >= 5) {
        insights.push({
            type: "Journal",
            payload: { entries: journalEntries }
        });
    }

    if (streakDays >= 3) {
        insights.push({
            type: "Streak",
            payload: { days: streakDays }
        });
    }

    if (mostDrawnCard && cardCounts[mostDrawnCard.id] > 2) { // Threshold of >2 draws
        insights.push({
            type: "Favorite",
            payload: { card: mostDrawnCard.nameCzech }
        });
    }

    return {
        insights: getInsightsOutput(insights, style),
        raw: insights
    };
}
