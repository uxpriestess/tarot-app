import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_KEY = 'tarot-registration-draft';

interface OnboardingData {
    displayName: string;
    birthDate: string;       // ISO string e.g. "1995-11-15"
    zodiacSign: string;      // e.g. "Štír"
    email: string;
}

interface OnboardingStore {
    data: OnboardingData;
    setDisplayName: (name: string) => void;
    setBirthDate: (date: string) => void;
    setZodiacSign: (sign: string) => void;
    setEmail: (email: string) => void;
    reset: () => void;
    saveDraft: (email: string) => Promise<void>;
    restoreDraft: () => Promise<void>;
    clearDraft: () => Promise<void>;
}

const initialData: OnboardingData = {
    displayName: '',
    birthDate: '',
    email: '',
    zodiacSign: '',
}

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
    data: initialData,

    setDisplayName: (name) => set((state) => ({
        data: { ...state.data, displayName: name }
    })),

    setBirthDate: (date) => set((state) => ({
        data: { ...state.data, birthDate: date }
    })),

    setZodiacSign: (sign) => set((state) => ({
        data: { ...state.data, zodiacSign: sign }
    })),

    setEmail: (email) => set((state) => ({
        data: { ...state.data, email }
    })),

    reset: () => set({ data: initialData }),
    saveDraft: async (email) => {
        const current = get().data;
        const data = {
            displayName: current.displayName, birthDate: current.birthDate,
            zodiacSign: current.zodiacSign, email: email.trim().toLowerCase(),
        };
        await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(data));
        set({ data });
    },
    restoreDraft: async () => {
        const saved = await AsyncStorage.getItem(DRAFT_KEY);
        if (!saved) return;
        const data = JSON.parse(saved);
        if (!data || !Object.keys(initialData).every(key => typeof data[key] === 'string')) {
            throw new Error('Invalid registration draft');
        }
        set({ data: {
            displayName: data.displayName, birthDate: data.birthDate,
            zodiacSign: data.zodiacSign, email: data.email,
        } });
    },
    clearDraft: async () => {
        await AsyncStorage.removeItem(DRAFT_KEY);
        set({ data: initialData });
    },
}))
