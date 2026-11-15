export const FINANCE_READING_TYPE = 'finance_3_card' as const;
export const FINANCE_SECTION_KEYS = ['dnes', 'vyzva', 'vysledek'] as const;
export type FinanceSectionKey = typeof FINANCE_SECTION_KEYS[number];
export const FINANCE_READING_TIMEOUT_MS = 45_000;
export type FinanceReadingErrorCode = 'invalid' | 'network' | 'timeout' | 'server' | 'aborted';
const ERROR_MESSAGES: Record<FinanceReadingErrorCode, string> = {
    invalid: 'Výklad nepřišel celý nebo ve správném formátu. Zkus to prosím znovu.',
    network: 'Spojení se přerušilo. Zkontroluj internet a zkus výklad znovu.',
    timeout: 'Výklad trvá příliš dlouho. Zkus to prosím znovu se stejnými kartami.',
    server: 'Výklad teď není dostupný. Zkus to prosím za chvíli znovu.',
    aborted: 'Načítání výkladu bylo zrušeno.',
};

const LABELS: Record<FinanceSectionKey, string> = {
    dnes: 'Dnes', vyzva: 'Výzva', vysledek: 'Výsledek',
};

// dnes: current financial situation, resources, habits or decisions.
// vyzva: challenge, tension or consideration deserving attention.
// vysledek: possible direction or opportunity, never a guaranteed outcome.
export interface FinanceReading {
    readingType: typeof FINANCE_READING_TYPE;
    sections: { key: FinanceSectionKey; label: string; text: string }[];
}

export class FinanceReadingError extends Error {
    constructor(public readonly code: FinanceReadingErrorCode = 'invalid') {
        super(ERROR_MESSAGES[code]);
        this.name = 'FinanceReadingError';
    }
}

// Bound the whole operation, including response.json(), even if fetch ignores abort.
export async function withFinanceReadingTimeout<T>(
    operation: (signal: AbortSignal) => Promise<T>, externalSignal?: AbortSignal,
): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onAbort = () => {};
    try {
        const cancelled = new Promise<never>((_, reject) => {
            const stop = (code: 'timeout' | 'aborted') => {
                reject(new FinanceReadingError(code));
                controller.abort();
            };
            onAbort = () => stop('aborted');
            if (externalSignal?.aborted) { onAbort(); return; }
            externalSignal?.addEventListener('abort', onAbort, { once: true });
            timer = setTimeout(() => stop('timeout'), FINANCE_READING_TIMEOUT_MS);
        });
        const work = Promise.resolve().then(() => {
            if (controller.signal.aborted) throw new FinanceReadingError('aborted');
            return operation(controller.signal);
        });
        return await Promise.race([cancelled, work]);
    } finally {
        if (timer !== undefined) clearTimeout(timer);
        externalSignal?.removeEventListener('abort', onAbort);
    }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);
const owns = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

// Validate a decoded HTTP response. Existing envelope fields meta/answer are
// tolerated but never used as interpretations. No prose repair or fallback.
export function parseFinanceReading(value: unknown): FinanceReading {
    const invalid = () => new FinanceReadingError();
    if (!isObject(value) || !owns(value, 'readingType') || !owns(value, 'sections') ||
        value.readingType !== FINANCE_READING_TYPE ||
        Object.keys(value).some(key => !['readingType', 'sections', 'meta', 'answer'].includes(key)) ||
        !Array.isArray(value.sections) || value.sections.length !== 3) throw invalid();

    const texts = new Map<FinanceSectionKey, string>();
    for (const section of value.sections) {
        if (!isObject(section) || !owns(section, 'key') || !owns(section, 'text') ||
            Object.keys(section).some(key => !['key', 'label', 'text'].includes(key)) ||
            !FINANCE_SECTION_KEYS.includes(section.key as FinanceSectionKey) ||
            texts.has(section.key as FinanceSectionKey) ||
            typeof section.text !== 'string' || !section.text.trim() ||
            (owns(section, 'label') && section.label !== null && typeof section.label !== 'string')) throw invalid();
        texts.set(section.key as FinanceSectionKey, section.text.trim());
    }
    if (!FINANCE_SECTION_KEYS.every(key => texts.has(key))) throw invalid();
    return {
        readingType: FINANCE_READING_TYPE,
        sections: FINANCE_SECTION_KEYS.map(key => ({ key, label: LABELS[key], text: texts.get(key)! })),
    };
}
