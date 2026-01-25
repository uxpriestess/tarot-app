/**
 * Simple Moon Phase Calculation Utility
 * Based on the synodic month: ~29.53059 days
 */

export interface MoonPhaseInfo {
    name: string;
    icon: string;
    percentage: number; // 0 to 1
    age: number; // 0 to 29.53
}

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

    // Determine the phase name and icon
    let name = '';
    let icon = '';

    if (age < 1.845) {
        name = 'Novoluní';
        icon = '🌑';
    } else if (age < 5.536) {
        name = 'Dorůstající srpek';
        icon = '🌒';
    } else if (age < 9.228) {
        name = 'První čtvrť';
        icon = '🌓';
    } else if (age < 12.919) {
        name = 'Dorůstající měsíc';
        icon = '🌔';
    } else if (age < 16.61) {
        name = 'Úplněk';
        icon = '🌕';
    } else if (age < 20.302) {
        name = 'Ubývající měsíc';
        icon = '🌖';
    } else if (age < 23.993) {
        name = 'Poslední čtvrť';
        icon = '🌗';
    } else if (age < 27.685) {
        name = 'Ubývající srpek';
        icon = '🌘';
    } else {
        name = 'Novoluní';
        icon = '🌑';
    }

    return { name, icon, percentage, age };
}
