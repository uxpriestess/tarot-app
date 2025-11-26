import { InsightType } from "./types";

export const SoftMicrocopy: Record<InsightType, (p?: any) => string> = {
    TypeTrigger: (p) =>
        p?.suit
            ? `Jsi v říši ${p.suit} — prožíváš období citu a intuice.`
            : "Jsi v jednom živlu — období citu a intuice.",

    Milestone: (p) =>
        p?.progress
            ? `${p.progress}/78 — pomalu odkrýváš celý obraz.`
            : "Pomalu odkrýváš celý obraz.",

    Favorite: (p) =>
        p?.card
            ? `${p.card} se objevuje často — všímáš si jeho poselství?`
            : "Tato karta se objevuje často — všímáš si jejího poselství?",

    Streak: (p) =>
        p?.days
            ? `${p.days} dní v rytmu — krásně si držíš svoji cestu.`
            : "Pokračuješ krásně ve svém rytmu.",

    Journal: (p) =>
        p?.entries
            ? `${p.entries} zápisů — krásně nasloucháš sama sobě.`
            : "Krásně nasloucháš sama sobě."
};
