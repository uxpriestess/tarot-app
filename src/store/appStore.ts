import { create } from "zustand";

interface AppState {
    // Progress
    journalEntries: number;
    streakDays: number;
    drawHistory: string[]; // e.g. ["Mág", "Poustevník", ...]

    // User pref
    userMicrocopyStyle: "soft" | "genz";

    // Actions
    addJournalEntry: () => void;
    increaseStreak: () => void;
    addDraw: (card: string) => void;
    setStyle: (style: "soft" | "genz") => void;
}

export const useAppStore = create<AppState>((set) => ({
    journalEntries: 0,
    streakDays: 0,
    drawHistory: [],
    userMicrocopyStyle: "soft",

    addJournalEntry: () =>
        set((s) => ({ journalEntries: s.journalEntries + 1 })),

    increaseStreak: () => set((s) => ({ streakDays: s.streakDays + 1 })),

    addDraw: (card) =>
        set((s) => ({ drawHistory: [...s.drawHistory, card] })),

    setStyle: (style) => set({ userMicrocopyStyle: style })
}));
