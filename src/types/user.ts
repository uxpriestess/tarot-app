export type GenderPreference = 'masculine' | 'feminine' | 'neutral';

export interface UserContext {
  genderPreference?: GenderPreference;
  zodiacSign?: string;
  // ❌ No name. No birthDate. Ever.
}