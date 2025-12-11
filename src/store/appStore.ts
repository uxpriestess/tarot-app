import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface JournalEntry {
    id: string;
    cardId: string;
    date: string; // ISO string
    position: 'upright' | 'reversed';
    note?: string;
}

interface AppState {
    // Progress
    journalEntries: number;
    streakDays: number;
    drawHistory: string[]; // Deprecated
    journalHistory: JournalEntry[];

    // User pref
    userMicrocopyStyle: "soft" | "genz";

    // Actions
    addJournalEntry: (entry: JournalEntry) => void;
    updateEntryNote: (id: string, note: string) => void;
    increaseStreak: () => void;
    addDraw: (card: string) => void; // Deprecated but kept for type compat
    setStyle: (style: "soft" | "genz") => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            journalEntries: 0,
            streakDays: 0,
            drawHistory: [], // Keeping for legacy, or we could remove. Let's keep it empty.
            journalHistory: [], // New rich history
            userMicrocopyStyle: "soft",

            addJournalEntry: (entry) =>
                set((s) => ({
                    journalHistory: [entry, ...s.journalHistory],
                    journalEntries: s.journalEntries + 1 // Keep counter in sync
                })),

            updateEntryNote: (id, note) =>
                set((s) => ({
                    journalHistory: s.journalHistory.map((e) =>
                        e.id === id ? { ...e, note } : e
                    ),
                })),

            increaseStreak: () => set((s) => ({ streakDays: s.streakDays + 1 })),

            // Deprecated/Legacy interface implementation if needed, or update consumers
            addDraw: (card) => console.warn('addDraw is deprecated, use addJournalEntry'),

            setStyle: (style) => set({ userMicrocopyStyle: style })
        }),
        {
            name: "tarot-app-storage-v2", // New key to reset data
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
