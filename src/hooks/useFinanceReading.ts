import { useEffect, useRef, useState } from 'react';
import { drawCard } from '../data';
import { useAppStore } from '../store/appStore';
import { performReading, ReadingRequest } from '../services/universe';
import { FINANCE_SECTION_KEYS, FinanceSectionKey, FinanceReadingError, parseFinanceReading } from '../services/financeReading';

function createSnapshot() {
    const labels = ['Dnes', 'Výzva', 'Výsledek'] as const;
    const cards = FINANCE_SECTION_KEYS.map(key => {
        const draw = drawCard(); // Independent full-deck draws: repeats remain valid.
        const card = { ...draw.card, keywords: [...draw.card.keywords] };
        Object.freeze(card.keywords);
        return Object.freeze({ key, card: Object.freeze(card), position: draw.position });
    });
    const context = useAppStore.getState().getUserContext();
    const userContext = context ? Object.freeze({ zodiacSign: context.zodiacSign, genderPreference: context.genderPreference }) : undefined;
    const request: ReadingRequest = {
        mode: 'finance_3_card', spreadName: 'Zázemí', question: 'Celkový výhled', userContext,
        cards: cards.map(({ card, position }, index) => Object.freeze({
            name: card.name, nameCzech: card.nameCzech || card.name, position, label: labels[index],
        })),
    };
    Object.freeze(request.cards);
    return Object.freeze({ cards: Object.freeze(cards), request: Object.freeze(request) });
}

export type FinanceReadingSnapshot = ReturnType<typeof createSnapshot>;
export interface FinanceReadingState {
    status: 'idle' | 'pending' | 'ready' | 'error';
    snapshot: FinanceReadingSnapshot | null;
    meanings: Readonly<Record<FinanceSectionKey, string>> | null;
    error: FinanceReadingError | null;
}
const idle = (): FinanceReadingState => ({ status: 'idle', snapshot: null, meanings: null, error: null });

// Owned by the mounted reading screen; tab blur intentionally does not reset it.
export function useFinanceReading() {
    const [state, setState] = useState<FinanceReadingState>(idle);
    const stateRef = useRef(state);
    const snapshotRef = useRef<FinanceReadingSnapshot | null>(null);
    const active = useRef<{ controller: AbortController } | null>(null);
    const mounted = useRef(true);
    const publish = (next: FinanceReadingState) => {
        stateRef.current = next;
        setState(next);
    };
    const invalidate = () => {
        const attempt = active.current;
        active.current = null;
        snapshotRef.current = null;
        attempt?.controller.abort();
    };
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; invalidate(); };
    }, []);

    const run = async (snapshot: FinanceReadingSnapshot) => {
        if (!mounted.current || active.current || snapshotRef.current !== snapshot) return;
        const attempt = { controller: new AbortController() };
        active.current = attempt;
        const isCurrent = () => mounted.current && active.current === attempt && snapshotRef.current === snapshot;
        publish({ ...stateRef.current, status: 'pending', snapshot, error: null });
        try {
            const response = await performReading(snapshot.request, { signal: attempt.controller.signal });
            if (!isCurrent()) return;
            const reading = parseFinanceReading(response);
            const meanings = {} as Record<FinanceSectionKey, string>;
            for (const section of reading.sections) meanings[section.key] = section.text;
            publish({ status: 'ready', snapshot, meanings: Object.freeze(meanings), error: null });
        } catch (error) {
            if (!isCurrent()) return;
            publish({ ...stateRef.current, status: 'error', error: error instanceof FinanceReadingError ? error : new FinanceReadingError('network') });
        } finally {
            if (active.current === attempt) active.current = null;
        }
    };

    const start = () => {
        if (!mounted.current || snapshotRef.current) return null;
        const snapshot = createSnapshot();
        snapshotRef.current = snapshot; // Synchronous guard before the first await/render.
        void run(snapshot);
        return snapshot;
    };
    const retry = () => {
        if (stateRef.current.status !== 'error' || !snapshotRef.current) return;
        return run(snapshotRef.current);
    };
    const reset = () => {
        invalidate();
        if (mounted.current) publish(idle());
    };
    return { ...state, start, retry, reset };
}
