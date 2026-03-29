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
    // User Profile
    displayName: string;
    birthDate: string;
    zodiacSign: string;
    
    // Progress
    journalEntries: number;
    streakDays: number;
    drawHistory: string[]; // Deprecated
    journalHistory: JournalEntry[];

    // Actions
    setUserProfile: (displayName: string, birthDate: string, zodiacSign: string) => void;
    addJournalEntry: (entry: JournalEntry) => void;
    updateEntryNote: (id: string, note: string) => void;
    increaseStreak: () => void;
    addDraw: (card: string) => void; // Deprecated but kept for type compat
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            // User Profile
            displayName: '',
            birthDate: '',
            zodiacSign: '',
            
            // Progress
            journalEntries: 0,
            streakDays: 0,
            drawHistory: [], // Keeping for legacy, or we could remove. Let's keep it empty.
            journalHistory: [], // New rich history

            setUserProfile: (displayName, birthDate, zodiacSign) =>
                set(() => ({
                    displayName,
                    birthDate,
                    zodiacSign,
                })),

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
        }),
        {
            name: "tarot-app-storage-v2", // New key to reset data
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
