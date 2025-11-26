import { InsightType } from "./types";

export const GenZMicrocopy: Record<InsightType, (p?: any) => string> = {
    TypeTrigger: (p) =>
        p?.suit
            ? `${p.suit} vibe? That's totally you rn ✨`
            : "Ten vibe je fakt tvůj ✨",

    Milestone: (p) =>
        p?.progress
            ? `${p.progress}/78 — sbíráš je jak Pokémony 😎`
            : "Postupuješ jak legenda ✨",

    Favorite: (p) =>
        p?.card
            ? `${p.card} tě doslova stalkuje 👀`
            : "Tahle karta tě fakt miluje 👀",

    Streak: (p) =>
        p?.days
            ? `${p.days} dní v řadě — consistency queen 👑`
            : "Ten vibe si držíš fest dobře 👑",

    Journal: (p) =>
        p?.entries
            ? `${p.entries} zápisů — terapeutka by měla radost 💅`
            : "Main character energy 💫"
};
