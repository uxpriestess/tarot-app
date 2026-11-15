import { FINANCE_SECTION_KEYS, FinanceSectionKey } from '../services/financeReading';

export type FinanceFace = 'back' | 'illustration' | 'interpretation';
export interface FinanceFocusState {
    focused: FinanceSectionKey | null;
    faces: Record<FinanceSectionKey, FinanceFace>;
    completed: FinanceSectionKey[];
}
export const initialFinanceFocus = (): FinanceFocusState => ({
    focused: null, faces: { dnes: 'back', vyzva: 'back', vysledek: 'back' }, completed: [],
});
export type FinanceFocusAction =
    | { type: 'open'; key: FinanceSectionKey }
    | { type: 'advance'; key: FinanceSectionKey }
    | { type: 'close'; ready: boolean };

export function canOpenFinanceCard(state: FinanceFocusState, key: FinanceSectionKey) {
    return state.completed.includes(key) || FINANCE_SECTION_KEYS[state.completed.length] === key;
}

// Presentation only: opening, closing and advancing can never issue a request.
export function financeFocusReducer(state: FinanceFocusState, action: FinanceFocusAction): FinanceFocusState {
    if (action.type === 'open') {
        if (state.focused || !canOpenFinanceCard(state, action.key)) return state;
        return { ...state, focused: action.key };
    }
    if (action.type === 'advance') {
        if (state.focused !== action.key) return state;
        const face = state.faces[action.key];
        if (face === 'interpretation') return state;
        return { ...state, faces: { ...state.faces, [action.key]: face === 'back' ? 'illustration' : 'interpretation' } };
    }
    const key = state.focused;
    if (!key) return state;
    const complete = action.ready && state.faces[key] === 'interpretation' && !state.completed.includes(key);
    return { ...state, focused: null, completed: complete ? [...state.completed, key] : state.completed };
}
