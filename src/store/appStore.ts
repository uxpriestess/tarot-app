import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 👇 We import our new type from user.ts so the gender preference
//    is always typed consistently across the whole app.
//    If you ever rename or extend GenderPreference, you only change it in one place.
import { GenderPreference, UserContext } from "../types/user";

export interface JournalEntry {
    id: string;
    cardId: string;
    date: string; // ISO string
    position: 'upright' | 'reversed';
    note?: string;
}

interface AppState {
    // ─── User Profile ────────────────────────────────────────────────────────
    // These three existed before but were never nullable — they defaulted to ''.
    // We keep displayName and zodiacSign, but rename birthDate handling:
    // birthDate is NO LONGER stored here. It gets calculated into zodiacSign
    // during onboarding and then discarded. Storing it is unnecessary risk.
    displayName: string;
    zodiacSign: string;

    // 👇 NEW: Gender preference for Czech grammar inflection.
    //    null means "user hasn't set this" = neutral mode (zero change from today).
    //    We use GenderPreference | null instead of string to prevent typos like 'male'.
    userGenderPreference: GenderPreference | null;

    // ─── Progress ────────────────────────────────────────────────────────────
    journalEntries: number;
    streakDays: number;
    drawHistory: string[]; // Deprecated
    journalHistory: JournalEntry[];

    // ─── Actions ─────────────────────────────────────────────────────────────

    // 👇 CHANGED: removed birthDate parameter.
    //    The onboarding screen calculates zodiacSign from birthDate,
    //    then calls setUserProfile(name, zodiacSign) — birthDate never persists.
    setUserProfile: (displayName: string, zodiacSign: string) => void;

    // 👇 NEW: Separate action for gender so ProfileScreen can update it
    //    independently, without re-triggering the whole profile write.
    setUserGender: (gender: GenderPreference) => void;

    // 👇 NEW: Utility to build the userContext object that universe.ts
    //    sends to the backend. Centralizing this here means if you ever
    //    add a new field (e.g. preferredReadingStyle), you update it in one place.
    //    Returns undefined if there's nothing to send (neutral user, no zodiac).
    getUserContext: () => UserContext | undefined;

    // 👇 NEW: Clears all personal data. Used for "Delete my data" in ProfileScreen
    //    or if the user wants to restart onboarding completely.
    clearUserProfile: () => void;

    addJournalEntry: (entry: JournalEntry) => void;
    updateEntryNote: (id: string, note: string) => void;
    increaseStreak: () => void;
    addDraw: (card: string) => void; // Deprecated but kept for type compat
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            // ─── Initial State ────────────────────────────────────────────────

            // User Profile
            // 👇 We initialize as empty string (not null) to stay compatible
            //    with your existing onboarding screens that might check `if (displayName)`.
            displayName: '',
            zodiacSign: '',
            // 👇 null = user hasn't chosen gender yet = neutral mode.
            //    This is the safe default: existing users are unaffected.
            userGenderPreference: null,

            // Progress
            journalEntries: 0,
            streakDays: 0,
            drawHistory: [],
            journalHistory: [],

            // ─── Actions ──────────────────────────────────────────────────────

            // 👇 CHANGED: signature is now (displayName, zodiacSign) — no birthDate.
            //    Call this from ZodiacRevealScreen after Supabase write, like:
            //    appStore.setUserProfile(name, calculatedZodiac)
            //    The birthDate variable can then go out of scope and is never stored.
            setUserProfile: (displayName, zodiacSign) =>
                set(() => ({
                    displayName,
                    zodiacSign,
                })),

            // 👇 NEW: Called from ProfileScreen when user toggles gender preference.
            //    Also called from ZodiacRevealScreen if user sets gender during onboarding.
            setUserGender: (gender) =>
                set(() => ({
                    userGenderPreference: gender,
                })),

            // 👇 NEW: This is the key helper for universe.ts.
            //    It reads current state via get() (Zustand's way to access state in actions),
            //    builds a clean UserContext, and returns undefined if there's nothing to send.
            //    This way universe.ts doesn't need to know about the store's shape —
            //    it just calls getUserContext() and passes the result to the API.
            getUserContext: () => {
                const { zodiacSign, userGenderPreference } = get();
                const context: UserContext = {};

                // Only include gender if explicitly set — null means neutral,
                // and we don't want to send 'neutral' to the API unnecessarily.
                if (userGenderPreference) {
                    context.genderPreference = userGenderPreference;
                }

                // Only include zodiac if it exists (it should after onboarding,
                // but could be empty for users who installed before Phase 1).
                if (zodiacSign) {
                    context.zodiacSign = zodiacSign;
                }

                // Return undefined if context is empty — universe.ts will then
                // simply omit userContext from the API body entirely.
                return Object.keys(context).length > 0 ? context : undefined;
            },

            // 👇 NEW: Full reset of personal data.
            //    Does NOT reset journal/streak — those feel like app progress,
            //    not personal identity. Adjust if you want a full wipe.
            clearUserProfile: () =>
                set(() => ({
                    displayName: '',
                    zodiacSign: '',
                    userGenderPreference: null,
                })),

            addJournalEntry: (entry) =>
                set((s) => ({
                    journalHistory: [entry, ...s.journalHistory],
                    journalEntries: s.journalEntries + 1,
                })),

            updateEntryNote: (id, note) =>
                set((s) => ({
                    journalHistory: s.journalHistory.map((e) =>
                        e.id === id ? { ...e, note } : e
                    ),
                })),

            increaseStreak: () => set((s) => ({ streakDays: s.streakDays + 1 })),

            addDraw: () => console.warn('addDraw is deprecated, use addJournalEntry'),
        }),
        {
            name: "tarot-app-storage-v2",
            storage: createJSONStorage(() => AsyncStorage),
            // 👇 IMPORTANT: We explicitly list which fields get persisted to AsyncStorage.
            //    birthDate is intentionally NOT in this list — if it somehow ended up
            //    in old storage under v2, it'll be ignored on next load.
            //    All new fields (userGenderPreference) ARE included so they survive restarts.
            partialize: (state) => ({
                displayName: state.displayName,
                zodiacSign: state.zodiacSign,
                userGenderPreference: state.userGenderPreference,
                journalEntries: state.journalEntries,
                streakDays: state.streakDays,
                drawHistory: state.drawHistory,
                journalHistory: state.journalHistory,
            }),
        }
    )
);
