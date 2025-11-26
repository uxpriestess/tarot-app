import { Insight, InsightOutput } from "./types";
import { SoftMicrocopy } from "./softMicrocopy";
import { GenZMicrocopy } from "./genzMicrocopy";

export function getInsightsOutput(
    insights: Insight[],
    style: "soft" | "genz"
): InsightOutput[] {
    const dict = style === "soft" ? SoftMicrocopy : GenZMicrocopy;

    if (!insights || insights.length === 0) {
        return [
            { type: "Default", text: "Vytáhni svou první kartu!" },
            { type: "Default", text: "Pravidelné čtení ti odhalí tajemství." }
        ];
    }

    const lastThree = insights.slice(-3);

    return lastThree.map((i) => ({
        type: i.type,
        text: dict[i.type](i.payload)
    }));
}
