import { create } from 'zustand'

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
}

const initialData: OnboardingData = {
    displayName: '',
    birthDate: '',
    email: '',
    zodiacSign: '',
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
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
}))