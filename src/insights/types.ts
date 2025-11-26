export type InsightType =
    | "TypeTrigger"
    | "Milestone"
    | "Favorite"
    | "Streak"
    | "Journal";

export interface Insight {
    type: InsightType;
    payload?: any;
}

export interface InsightOutput {
    type: InsightType | "Default";
    text: string;
}
