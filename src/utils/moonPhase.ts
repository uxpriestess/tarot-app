/**
 * Moon Phase Calculation & Interpretations
 * Based on the synodic month: ~29.53059 days
 */

export interface MoonPhaseInfo {
    name: string;
    icon: string;
    percentage: number; // 0 to 1
    age: number; // 0 to 29.53
    theme: string;
    description: string;
    energy: string;
}

interface PhaseData {
    name: string;
    icon: string;
    theme: string;
    description: string;
    energy: string;
}

const MOON_PHASES: PhaseData[] = [
    {
        name: 'Novoluní',
        icon: '🌑',
        theme: 'začátky, záměr, tichá touha',
        description: 'Energie je nízká, ale plodná. Pocity jsou jemné, plány se formují pod povrchem.',
        energy: 'Dobrý čas se ptát: Co chci pěstovat, i když ještě nejsem připravený jednat?'
    },
    {
        name: 'Dorůstající srpek',
        icon: '🌒',
        theme: 'naděje, první kroky, zvědavost',
        description: 'Hybnost se probouzí. Emoce se posouvají dopředu, i když sebevědomí zaostává.',
        energy: 'Podporuj jemné činy a malé závazky.'
    },
    {
        name: 'První čtvrť',
        icon: '🌓',
        theme: 'napětí, volba, úsilí',
        description: 'Vnitřní tření je teď normální. Můžeš cítit tlak rozhodnout se nebo bránit svůj směr.',
        energy: 'Růst vyžaduje zapojení, ne dokonalost.'
    },
    {
        name: 'Dorůstající měsíc',
        icon: '🌔',
        theme: 'zdokonalování, soustředění, úprava',
        description: 'Energie roste a povědomí zostřuje. Vidíš, co ještě potřebuje doladění.',
        energy: 'Poslouchej pozorně, upravuj odvážně.'
    },
    {
        name: 'Úplněk',
        icon: '🌕',
        theme: 'vyvrcholení, jasnost, emoční vrchol',
        description: 'Pocity jsou zesílené. Pravdy vyplouvají na povrch, i když jsou nepohodlné.',
        energy: 'To, co je teď viditelné, už nelze ignorovat.'
    },
    {
        name: 'Ubývající měsíc',
        icon: '🌖',
        theme: 'integrace, hledání smyslu',
        description: 'Vrchol už pominul. Emoce se usazují do porozumění.',
        energy: 'Dobré pro reflexi, vděčnost a upřímné rozhovory.'
    },
    {
        name: 'Poslední čtvrť',
        icon: '🌗',
        theme: 'uvolnění, přehodnocení, stanovení hranic',
        description: 'Energie se obrací dovnitř. Můžeš být připravený pustit to, co tě vyčerpává.',
        energy: 'Čištění je produktivní, ne pasivní.'
    },
    {
        name: 'Ubývající srpek',
        icon: '🌘',
        theme: 'odpočinek, uzavření, odevzdání',
        description: 'Citlivost se zvyšuje, energie klesá. Psychika touží po klidu.',
        energy: 'Konce připravují půdu pro nové záměry.'
    }
];

export function getMoonPhase(date: Date): MoonPhaseInfo {
    // Reference New Moon: January 6, 2000, 18:14 UTC
    const referenceNewMoon = new Date('2000-01-06T18:14:00Z');
    const synodicMonth = 29.53058867; // average lunar month in days

    // Get the time difference in days
    const diffInMs = date.getTime() - referenceNewMoon.getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    // Use modulo to find the number of days into the current cycle (lunar age)
    const age = ((diffInDays % synodicMonth) + synodicMonth) % synodicMonth;
    const percentage = age / synodicMonth;

    // Determine which phase we're in
    let phaseIndex = 0;

    if (age < 1.845) {
        phaseIndex = 0; // Novoluní
    } else if (age < 5.536) {
        phaseIndex = 1; // Dorůstající srpek
    } else if (age < 9.228) {
        phaseIndex = 2; // První čtvrť
    } else if (age < 12.919) {
        phaseIndex = 3; // Dorůstající měsíc
    } else if (age < 16.61) {
        phaseIndex = 4; // Úplněk
    } else if (age < 20.302) {
        phaseIndex = 5; // Ubývající měsíc
    } else if (age < 23.993) {
        phaseIndex = 6; // Poslední čtvrť
    } else if (age < 27.685) {
        phaseIndex = 7; // Ubývající srpek
    } else {
        phaseIndex = 0; // Novoluní (wrapping around)
    }

    const phase = MOON_PHASES[phaseIndex];

    return {
        name: phase.name,
        icon: phase.icon,
        theme: phase.theme,
        description: phase.description,
        energy: phase.energy,
        percentage,
        age
    };
}

/**
 * Get a condensed moon context for AI prompts
 * This is the "weather" your card is happening in
 */
export function getMoonContext(date: Date): string {
    const phase = getMoonPhase(date);
    return `Aktuální fáze měsíce: ${phase.icon} ${phase.name}
Téma: ${phase.theme}
${phase.description}
${phase.energy}`;
}

/**
 * Get just the phase summary (for UI display)
 */
export function getMoonPhaseSummary(date: Date): string {
    const phase = getMoonPhase(date);
    return `${phase.icon} ${phase.name}\n${phase.description}`;
}
