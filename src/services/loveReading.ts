// love_3_card contract: exactly one non-empty text for each stable position key.
// `vztah` is the existing API key for the UI position VAŠE POUTO.
export const LOVE_SECTION_KEYS = ['ty', 'partner', 'vztah'] as const;
export type LoveSectionKey = typeof LOVE_SECTION_KEYS[number];

export const LOVE_READING_TIMEOUT_MS = 45_000;
export type LoveReadingErrorCode = 'network' | 'timeout' | 'invalid' | 'server' | 'aborted';
const ERROR_MESSAGES: Record<LoveReadingErrorCode, string> = {
    network: 'Spojení se přerušilo. Zkontroluj internet a zkus výklad znovu.',
    timeout: 'Výklad trvá příliš dlouho. Zkus to prosím znovu se stejnými kartami.',
    invalid: 'Výklad nepřišel celý nebo ve správném formátu. Zkus to prosím znovu.',
    server: 'Výklad teď není dostupný. Zkus to prosím za chvíli znovu.',
    aborted: 'Načítání výkladu bylo zrušeno.',
};
export class LoveReadingError extends Error {
    constructor(public readonly code: LoveReadingErrorCode) {
        super(ERROR_MESSAGES[code]);
        this.name = 'LoveReadingError';
    }
}

// Race the whole operation, including response.json(), even if fetch ignores abort.
export async function withLoveReadingTimeout<T>(
    operation: (signal: AbortSignal) => Promise<T>, externalSignal?: AbortSignal,
): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onAbort: () => void = () => {};
    try {
        const cancelled = new Promise<never>((_, reject) => {
            const stop = (code: 'timeout' | 'aborted') => {
                reject(new LoveReadingError(code));
                controller.abort();
            };
            onAbort = () => stop('aborted');
            if (externalSignal?.aborted) { onAbort(); return; }
            externalSignal?.addEventListener('abort', onAbort, { once: true });
            timer = setTimeout(() => stop('timeout'), LOVE_READING_TIMEOUT_MS);
        });
        const work = Promise.resolve().then(() => {
            if (controller.signal.aborted) throw new LoveReadingError('aborted');
            return operation(controller.signal);
        });
        return await Promise.race([cancelled, work]);
    } finally {
        if (timer !== undefined) clearTimeout(timer);
        externalSignal?.removeEventListener('abort', onAbort);
    }
}

export function getLoveSections(reading: unknown): Record<LoveSectionKey, string> {
    const invalid = () => new LoveReadingError('invalid');
    if (!reading || typeof reading !== 'object') throw invalid();
    const { readingType, sections } = reading as { readingType?: unknown; sections?: unknown };
    if (readingType !== 'love_3_card' || !Array.isArray(sections) || sections.length !== 3) {
        throw invalid();
    }
    const result: Partial<Record<LoveSectionKey, string>> = {};
    for (const section of sections) {
        if (!section || typeof section !== 'object' ||
            !LOVE_SECTION_KEYS.includes(section.key) ||
            Object.prototype.hasOwnProperty.call(result, section.key) ||
            typeof section.text !== 'string' || !section.text.trim()) throw invalid();
        result[section.key as LoveSectionKey] = section.text.trim();
    }
    if (!LOVE_SECTION_KEYS.every(key => typeof result[key] === 'string')) throw invalid();
    return result as Record<LoveSectionKey, string>;
}
