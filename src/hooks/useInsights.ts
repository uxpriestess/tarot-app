import { useAppStore } from "../store/appStore";
import { getInsightsOutput } from "../insights";
import { Insight } from "../insights/types";

export function useInsights() {
    const journalEntries = useAppStore((s) => s.journalEntries);
    const streakDays = useAppStore((s) => s.streakDays);
    const drawHistory = useAppStore((s) => s.drawHistory);
    const style = useAppStore((s) => s.userMicrocopyStyle);

    const lastCard = drawHistory[drawHistory.length - 1];
    const mostDrawn =
        drawHistory.length > 3
            ? [...drawHistory].sort((a, b) =>
                drawHistory.filter((x) => x === b).length -
                drawHistory.filter((x) => x === a).length
            )[0]
            : null;

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

    if (mostDrawn) {
        insights.push({
            type: "Favorite",
            payload: { card: mostDrawn }
        });
    }

    return {
        insights: getInsightsOutput(insights, style),
        raw: insights
    };
}
