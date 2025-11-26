import { useAppStore } from "../store/appStore";

export function useUserProgress() {
    const journalEntries = useAppStore((s) => s.journalEntries);
    const streakDays = useAppStore((s) => s.streakDays);

    return { journalEntries, streakDays };
}
