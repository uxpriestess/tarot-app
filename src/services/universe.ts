import { drawCard } from '../data';
import { TarotCard } from '../types/tarot';
import { useAppStore } from '../store/appStore';
import { getLoveSections, LoveReadingError, withLoveReadingTimeout, normalizeReadingSynthesis } from './loveReading';

const API_URL = 'https://my-ai-backend-dun.vercel.app/api/chat';

export interface UniverseResponse {
    answer: string;
    cards: any[];
}

export interface UniverseCard {
    name: string;
    nameCzech: string;
    position: 'upright' | 'reversed';
    label?: string;
}

export interface ReadingRequest {
    spreadName: string;
    cards: UniverseCard[];
    question?: string;
    mode?: string;
    moonPhase?: string;
}

export interface ReadingSection {
    key: string;
    label: string | null;
    text: string;
}

export interface StructuredReading {
    readingType: string;
    sections: ReadingSection[];
    synthesis?: string;
    meta?: {
        cardCount: number;
        timestamp: string;
    };
    answer?: string;
}

export async function performReading(request: ReadingRequest, options: { signal?: AbortSignal } = {}): Promise<StructuredReading> {
    // getUserContext() returns only zodiac + gender — never name, never birthDate.
    // Returns undefined if the user hasn't completed onboarding yet, which is
    // safe: the backend treats missing userContext as neutral mode.
    const userContext = useAppStore.getState().getUserContext();
    const startedAt = Date.now();
    let httpStatus: number | null = null;
    let category = 'success';

    const load = async (signal?: AbortSignal): Promise<StructuredReading> => {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            ...(signal ? { signal } : {}),
            body: JSON.stringify({
                spreadName: request.spreadName,
                cards:      request.cards,
                question:   request.question || 'Celkový výhled',
                mode:       request.mode || 'reading-screen',
                moonPhase:  request.moonPhase,
                userContext,  // undefined is stripped by JSON.stringify automatically
            }),
        });

        if (request.mode === 'love_3_card') {
            httpStatus = response.status;
            // HTTP failures are not malformed successful readings. Only 502 may
            // carry our specific validation error; never log the error body.
            if (!response.ok) {
                if (response.status === 408 || response.status === 504) throw new LoveReadingError('timeout');
                if (response.status === 502) {
                    let errorData;
                    try { errorData = await response.json(); } catch { /* Keep the known HTTP failure. */ }
                    if (errorData?.code === 'INVALID_LOVE_READING') throw new LoveReadingError('invalid');
                }
                throw new LoveReadingError('server');
            }
        }

        let data;
        try {
            data = await response.json();
        } catch (error) {
            if (request.mode === 'love_3_card') {
                const name = error && typeof error === 'object' && 'name' in error ? error.name : undefined;
                throw new LoveReadingError(signal?.aborted ? 'aborted' : name === 'SyntaxError' ? 'invalid' : 'network');
            }
            throw error;
        }

        if (!response.ok) {
            throw new Error(data.answer || `API error: ${response.status}`);
        }

        if (request.mode === 'love_3_card') getLoveSections(data);

        return {
            readingType: data.readingType || request.mode || 'reading-screen',
            sections: data.sections || [{ key: 'reading', label: null, text: data.answer || '' }],
            meta:     data.meta,
            answer:   data.answer,
            ...(request.mode === 'love_3_card' && normalizeReadingSynthesis(data.synthesis)
                ? { synthesis: normalizeReadingSynthesis(data.synthesis) } : {}),
        };
    };
    try {
        return request.mode === 'love_3_card'
            ? await withLoveReadingTimeout(load, options.signal)
            : await load();
    } catch (error) {
        if (request.mode === 'love_3_card') {
            const readingError = error instanceof LoveReadingError ? error : new LoveReadingError('network');
            category = readingError.code;
            throw readingError;
        }
        console.error('Reading service error:', error);

        const errorMessage = error instanceof Error && error.message
            ? error.message
            : 'Obraz neprošel úplně jasně. Zkusíme to za chvíli znovu?';

        return {
            readingType: 'error',
            sections: [{ key: 'error', label: null, text: errorMessage }],
            answer: errorMessage,
        };
    } finally {
        if (request.mode === 'love_3_card') {
            console.info('[love-reading:client]', { durationMs: Math.max(0, Date.now() - startedAt), httpStatus, category });
        }
    }
}

export async function askUniverse(
    question: string,
    mode: string = 'daily',
    cards?: UniverseCard[]
): Promise<UniverseResponse> {
    const userContext = useAppStore.getState().getUserContext();

    let finalCards: UniverseCard[];
    let sourceCards: any[];

    if (cards && cards.length > 0) {
        finalCards = cards;
        sourceCards = cards;
    } else {
        const { card, position } = drawCard();
        sourceCards = [card];
        finalCards = [{
            name:      card.name,
            nameCzech: card.nameCzech || card.name,
            position,
        }];
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question,
                cards: finalCards,
                mode,
                userContext,
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        return {
            answer: data.answer,
            cards:  sourceCards,
        };
    } catch (error) {
        console.error('Universe service error:', error);
        throw new Error('Spojení se na moment rozostřilo. Zkusíme to vyložit znovu?');
    }
}
