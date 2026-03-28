export interface ZodiacSign {
    name: string;       // Czech name e.g. "Štír"
    revelation: string; // The one-liner for ZodiacRevealScreen
}

const ZODIAC_SIGNS: ZodiacSign[] = [
    { name: 'Kozoroh',   revelation: 'Stavíš pomalu, ale pevně.' },
    { name: 'Vodnář',    revelation: 'Vidíš věci jinak. Karty to ocení.' },
    { name: 'Ryby',      revelation: 'Intuice je tvůj první jazyk — tady ji použijeme.' },
    { name: 'Beran',     revelation: 'Jdeš rovnou k věci — to se nám bude hodit.' },
    { name: 'Býk',       revelation: 'Víš, co chceš. Teď zjistíme, co ti stojí v cestě.' },
    { name: 'Blíženci',  revelation: 'Máš víc vrstev, než ukazuješ.' },
    { name: 'Rak',       revelation: 'Cítíš věci dřív, než je dokážeš pojmenovat.' },
    { name: 'Lev',       revelation: 'Přítomnost, kterou nejde přehlédnout.' },
    { name: 'Panna',     revelation: 'Všímáš si detailů, které ostatní přehlédnou.' },
    { name: 'Váhy',      revelation: 'Hledáš rovnováhu — i když to někdy bolí.' },
    { name: 'Štír',      revelation: 'Tohle půjde víc do hloubky.' },
    { name: 'Střelec',   revelation: 'Pravda nade vše — i když není pohodlná.' },
]

export function getZodiacSign(birthDate: Date): ZodiacSign {
    const month = birthDate.getMonth() + 1 // 1-12
    const day = birthDate.getDate()

    if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
        return ZODIAC_SIGNS[0]  // Kozoroh
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
        return ZODIAC_SIGNS[1]  // Vodnář
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20))
        return ZODIAC_SIGNS[2]  // Ryby
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
        return ZODIAC_SIGNS[3]  // Beran
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20))
        return ZODIAC_SIGNS[4]  // Býk
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
        return ZODIAC_SIGNS[5]  // Blíženci
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22))
        return ZODIAC_SIGNS[6]  // Rak
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22))
        return ZODIAC_SIGNS[7]  // Lev
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
        return ZODIAC_SIGNS[8]  // Panna
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
        return ZODIAC_SIGNS[9]  // Váhy
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
        return ZODIAC_SIGNS[10] // Štír
    return ZODIAC_SIGNS[11]     // Střelec
}