/**
 * AML Studio — i18n system
 *
 * Usage:
 *   import { useT } from '@/i18n';
 *   const t = useT();
 *   t.agents  // "Agents" (or translated)
 *
 * To add a new language:
 *   1. Create src/i18n/<locale>.ts with a Partial<Translations> export.
 *   2. Import and register it in the `languages` map below.
 *
 * Language selection order:
 *   1. User's explicit preference (stored in localStorage key "aml-studio-lang").
 *   2. Browser language (navigator.language prefix match).
 *   3. English fallback.
 */

import en from './en';
import type { Translations } from './en';
import fr from './fr';

/** Registry of all available language files. Add new languages here. */
const languages: Record<string, Partial<Translations>> = {
  en,
  fr,
};

/**
 * Resolve the best-matching locale from the registry.
 * Tries exact match first, then language-prefix match, then falls back to 'en'.
 */
export function resolveLocale(preferred?: string): string {
  if (preferred && languages[preferred]) return preferred;

  const browserLang = navigator.language || 'en';
  const prefix = browserLang.split('-')[0].toLowerCase();

  if (languages[prefix]) return prefix;
  if (languages[browserLang.toLowerCase()]) return browserLang.toLowerCase();

  return 'en';
}

/**
 * Build a merged translation object.
 * The resolved locale is merged on top of English, so any missing keys
 * fall back to English automatically.
 */
export function buildTranslations(locale: string): Translations {
  if (locale === 'en') return en;
  const overrides = languages[locale] ?? {};
  return { ...en, ...overrides } as Translations;
}

/** Return a list of all registered locales with their display names. */
export function getAvailableLocales(): { locale: string; name: string }[] {
  return Object.entries(languages).map(([locale, lang]) => ({
    locale,
    name: lang.name ?? locale,
  }));
}

export type { Translations };
export default en;
