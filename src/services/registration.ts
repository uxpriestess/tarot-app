import { supabase } from './supabase';

export interface RegistrationDraft {
  displayName: string;
  birthDate: string;
  zodiacSign: string;
  email: string;
}

export class RegistrationError extends Error {
  constructor(public kind: 'session' | 'profile' | 'details', message: string) {
    super(message);
  }
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function hasRegistrationDetails(draft: RegistrationDraft, email?: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(draft.birthDate);
  if (!match || !draft.displayName.trim() || !draft.zodiacSign.trim() || !email ||
      normalizeEmail(draft.email) !== normalizeEmail(email)) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export async function getRegistrationSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new RegistrationError('session', 'Přihlas se znovu. Tvoje údaje pro dokončení profilu zůstaly uložené.');
  }
  return data.session;
}

export async function readOwnProfile(userId: string) {
  const { data, error } = await supabase.from('profiles')
    .select('id, display_name, zodiac_sign').eq('id', userId).maybeSingle();
  if (error) throw new RegistrationError('profile', 'Profil se nepodařilo načíst. Zkontroluj připojení a zkus to znovu.');
  return data;
}

export async function recoverRegistration(draft: RegistrationDraft) {
  const session = await getRegistrationSession();
  let profile = await readOwnProfile(session.user.id);
  if (!profile) {
    if (!hasRegistrationDetails(draft, session.user.email)) {
      throw new RegistrationError('details', 'Účet existuje, ale chybí údaje pro profil. Doplň znovu jméno a datum narození.');
    }
    const { error } = await supabase.from('profiles').insert({
      id: session.user.id,
      display_name: draft.displayName.trim(),
      birth_date: draft.birthDate,
      zodiac_sign: draft.zodiacSign,
    });
    if (error && error.code !== '23505') {
      throw new RegistrationError('profile', 'Účet je vytvořený, ale profil se nepodařilo uložit. Zkus dokončení profilu znovu.');
    }
    // Also verifies conflicts caused by a trigger or another registration attempt.
    profile = await readOwnProfile(session.user.id);
    if (!profile) throw new RegistrationError('profile', 'Profil zatím není dostupný. Zkus dokončení profilu znovu.');
  }
  const currentSession = await getRegistrationSession();
  if (currentSession.user.id !== session.user.id) {
    throw new RegistrationError('session', 'Přihlášený účet se změnil. Přihlas se znovu.');
  }
  return profile;
}
