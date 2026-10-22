// data/yesNo.ts
// Yes/No reading for Tarotka: one card, one decisive answer (Ano or Ne).
//
// How the answer is decided (all in code, instant, works offline):
// 1. Every card has an upright and a reversed value: yes / no / maybe
//    (standard Rider-Waite-Smith yes/no convention, edit freely, it's YOUR chart).
// 2. A clear yes or no is the answer.
// 3. A "maybe" card is never shown as "maybe". It is resolved by its position:
//    upright leans Ano, reversed leans Ne. The answer is still Ano or Ne,
//    it just gets a small "těsně" (close call) tag in the UI.
//
// The AI is only used for the optional "Proč?" explanation (backend mode 'yes_no').

import type { TarotCard, CardPosition } from '../types/tarot';
import { allCards } from './index';

export type Polarity = 'yes' | 'no' | 'maybe';

// The 4 values the backend (chat.js, mode 'yes_no') accepts.
export type YesNoVerdict = 'yes' | 'leaning-yes' | 'leaning-no' | 'no';

export interface YesNoReading {
  verdict: YesNoVerdict;
  card: TarotCard;
  position: CardPosition;
  isYes: boolean; // what the user sees: Ano (true) or Ne (false)
  closeCall: boolean; // the card was a "maybe" and was resolved by its position
}

// ---------------------------------------------------------------------------
// 1. THE CHART: [upright, reversed] per card id
// ---------------------------------------------------------------------------

const Y: Polarity = 'yes';
const N: Polarity = 'no';
const M: Polarity = 'maybe';

const YES_NO_CHART: Record<string, [Polarity, Polarity]> = {
  // Major Arcana
  'major-0': [Y, M], // Blázen
  'major-1': [Y, M], // Mág
  'major-2': [M, M], // Velekněžka
  'major-3': [Y, M], // Císařovna
  'major-4': [Y, N], // Císař
  'major-5': [Y, M], // Velekněz
  'major-6': [Y, N], // Milenci
  'major-7': [Y, N], // Vůz
  'major-8': [Y, M], // Síla
  'major-9': [M, N], // Poustevník
  'major-10': [Y, M], // Kolo osudu
  'major-11': [Y, N], // Spravedlnost
  'major-12': [M, N], // Viselec
  'major-13': [M, N], // Smrt
  'major-14': [Y, N], // Umírněnost
  'major-15': [N, M], // Ďábel
  'major-16': [N, M], // Věž
  'major-17': [Y, M], // Hvězda
  'major-18': [M, N], // Měsíc
  'major-19': [Y, Y], // Slunce (yes even reversed)
  'major-20': [Y, M], // Soud
  'major-21': [Y, M], // Svět

  // Cups
  'cups-1': [Y, M], // Eso
  'cups-2': [Y, M], // Dvojka
  'cups-3': [Y, M], // Trojka
  'cups-4': [M, Y], // Čtyřka (reversed = re-engagement)
  'cups-5': [N, M], // Pětka
  'cups-6': [Y, M], // Šestka
  'cups-7': [M, M], // Sedmička
  'cups-8': [M, N], // Osmička
  'cups-9': [Y, M], // Devítka
  'cups-10': [Y, M], // Desítka
  'cups-11': [Y, M], // Páže
  'cups-12': [Y, M], // Rytíř
  'cups-13': [Y, M], // Královna
  'cups-14': [Y, M], // Král
};

export function getPolarity(card: TarotCard, position: CardPosition): Polarity {
  const entry = YES_NO_CHART[card.id];
  if (!entry) {
    // New suits (wands, swords, pentacles) must be added to the chart.
    console.warn(`[yesNo] No chart entry for ${card.id}, treating as maybe`);
    return 'maybe';
  }
  return position === 'upright' ? entry[0] : entry[1];
}

// ---------------------------------------------------------------------------
// 2. THE DRAW
// `random` is injectable so the logic can be tested.
// ---------------------------------------------------------------------------

export function resolveVerdict(polarity: Polarity, position: CardPosition): YesNoVerdict {
  if (polarity === 'yes') return 'yes';
  if (polarity === 'no') return 'no';
  return position === 'upright' ? 'leaning-yes' : 'leaning-no';
}

export function drawYesNoReading(
  deck: TarotCard[] = allCards,
  random: () => number = Math.random
): YesNoReading {
  const card = deck[Math.floor(random() * deck.length)];
  const position: CardPosition = random() < 0.5 ? 'upright' : 'reversed';
  const polarity = getPolarity(card, position);
  const verdict = resolveVerdict(polarity, position);

  return {
    verdict,
    card,
    position,
    isYes: verdict === 'yes' || verdict === 'leaning-yes',
    closeCall: polarity === 'maybe',
  };
}

// Dev helper: how often each answer comes up. Run in a scratch file:
// console.log(simulateDistribution(20000));
export function simulateDistribution(runs = 10000) {
  let yes = 0;
  let close = 0;
  for (let i = 0; i < runs; i++) {
    const r = drawYesNoReading();
    if (r.isYes) yes++;
    if (r.closeCall) close++;
  }
  const pct = (n: number) => `${((n / runs) * 100).toFixed(1)} %`;
  return { ano: pct(yes), ne: pct(runs - yes), tesne: pct(close) };
}

// Body for the backend explanation call (chat.js, mode 'yes_no').
// The question is deliberately NOT included: it never leaves the phone.
export function buildExplainBody(reading: YesNoReading) {
  return {
    mode: 'yes_no',
    verdict: reading.verdict,
    cards: [
      {
        nameCzech: reading.card.nameCzech,
        position: reading.position,
        keywords: reading.card.keywords,
      },
    ],
  };
}

// Shown if the explanation call fails, so "Proč?" always answers something.
export function describeCard(reading: YesNoReading): string {
  return `${reading.card.nameCzech}: ${reading.card.keywords.join(', ')}.`;
}

// ---------------------------------------------------------------------------
// 3. COPY: yours, with extra variants so repeat users don't see the same text.
// Variant 1 of each answer is your original text. Variants 2-3 are drafts in
// your voice: replace freely. Rules kept: tykání, no "/a" forms, no question
// at the end.
// ---------------------------------------------------------------------------

export interface VerdictCopy {
  title: string;
  body: string;
}

const YES_COPY: VerdictCopy[] = [
  {
    title: 'Manifesting zafungoval. Je to ANO.',
    body: 'Vesmír ti dává zelenou a já ti k tomu dělám mentální doprovod. Ber to jako to znamení, na které celou dobu čekáš. Jdi do toho.',
  },
  {
    title: 'Je to ANO. Bez ale.',
    body: 'Karta tady nemá žádné velké ale. Všimni si, jak se ti právě ulevilo, to je tvoje druhá odpověď a ta se počítá taky. Jdi do toho.',
  },
  {
    title: 'ANO. Můžeš jít spát.',
    body: 'Rozhodnuto. Tři dny kroužení myšlenek končí tady. Napiš to, kup to, řekni to. Zítra ti bude líp, že to máš za sebou.',
  },
];

const NO_COPY: VerdictCopy[] = [
  {
    title: 'Radši ne. Fakt.',
    body: 'Tohle zavání solidním průšvihem a oba to víme. Virtuálně ti beru telefon z ruky, zapínám ti letový režim a ordinuju hodinu bezmyšlenkovitého scrollování kočičích videí. Pusť to z hlavy, nestojí to za to.',
  },
  {
    title: 'NE. Dýchej.',
    body: 'Tohle dneska nech být. Telefon dej stranou, kočičí videa jsou na můj účet. Všimni si, jestli se ti ulevilo. Když jo, víš, jak to s tebou je.',
  },
  {
    title: 'Ne. A víš to.',
    body: 'Hluboko uvnitř to víš už před kartou. Teď to jen zaznělo nahlas. Jdi si dát čaj a nech to ležet do zítřka.',
  },
];

const CLOSE_CALL_LINES = [
  'Vyšlo to těsně, ale vyšlo.',
  'Těsný souboj, ale rozhodnuto.',
  'Na hraně, ale karta se rozhodla.',
];

export const PLACEHOLDERS = [
  'Mám napsat první?',
  'Mám dát výpověď?',
  'Mám si to koupit?',
  'Mám tam jít?',
];

export const HEADER_TITLE = 'Vesmírný vibe check.';
export const HEADER_SUBTITLE =
  'Myslíš na to už tři dny v kuse. Pojďme to rozseknout, ať můžeš jít konečně spát.';
export const INPUT_HINT =
  'Zavři oči, vizualizuj si to a podrž kartu, až ucítíš, že je správný čas.';
export const CTA_LABEL = 'Chci vědět, na čem jsem';
export const NEW_QUESTION_LABEL = 'Vyřešit jiné dilema';
export const FOOTER_DEFAULT =
  'A nezkoušej se ptát na to samé dokola, dokud ti nepadne ANO. Vidím tě.';
export const REPEAT_LINE = 'Tahle otázka už padla. Odpověď platí pořád.';

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

export function pickVerdictCopy(isYes: boolean, random: () => number = Math.random): VerdictCopy {
  return pick(isYes ? YES_COPY : NO_COPY, random);
}

export function pickCloseCallLine(random: () => number = Math.random): string {
  return pick(CLOSE_CALL_LINES, random);
}

// Friendly wink instead of a wall: the more questions in a row, the cheekier.
export function getSessionWink(asksThisSession: number): string | null {
  if (asksThisSession >= 5) return 'Pět dilemat v řadě. Kočičí videa na tebe čekají.';
  if (asksThisSession >= 3) return 'Třetí dilema za chvíli. Dej si vodu. Vidím tě.';
  return null;
}

// Same question (ignoring case, accents, punctuation) -> same answer, with a wink.
export function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// 4. THE ONE SAFETY CATCH. Runs on the phone only (the question never reaches
// the backend, so the AI safety rule can never see it). Delete this block and
// the `isCrisisQuestion` check in YesNoScreen to remove it.
// ---------------------------------------------------------------------------

const CRISIS_PATTERN =
  /sebevrazd|zabit se|se zabit|zabiju se|nechci (uz )?zit|chci umrit|ublizit si|ukoncit (si )?zivot|skoncit se zivotem|ukoncit to vsechno/;

export function isCrisisQuestion(question: string): boolean {
  return CRISIS_PATTERN.test(
    question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );
}

export const CRISIS_MESSAGE =
  'Tohle není otázka pro karty. Pokud ti je zle, zavolej Lince první psychické pomoci na 116 123 (non-stop). Při akutním ohrožení volej 112.';
