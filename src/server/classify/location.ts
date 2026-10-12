import type { JobLocation, RegionId } from '@/shared/types';
import {
  AMBIGUOUS_CITIES,
  AREA_PHRASES,
  CA_PROVINCES,
  CITIES,
  COUNTRIES,
  COUNTRY_BY_CODE,
  COUNTRY_TOKENS,
  ISO3_TO_ISO2,
  NAME_MATCH_EXCLUDED,
  REGIONS,
  SUBDIVISIONS,
  US_STATES,
} from './geo-data';

interface Matcher {
  re: RegExp;
  countries: string[];
  regions: RegionId[];
  worldwide: boolean;
  weak: boolean;
  city: boolean;
}

interface Hit {
  countries: Set<string>;
  regionWide: Set<RegionId>;
  worldwide: boolean;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildMatchers(): Matcher[] {
  const entries: { phrase: string; caseSensitive: boolean; m: Omit<Matcher, 're'> }[] = [];
  const add = (phrase: string, caseSensitive: boolean, m: Partial<Omit<Matcher, 're'>>) =>
    entries.push({
      phrase,
      caseSensitive,
      m: { countries: m.countries ?? [], regions: m.regions ?? [], worldwide: !!m.worldwide, weak: !!m.weak, city: !!m.city },
    });

  for (const a of AREA_PHRASES) add(a.phrase, !!a.caseSensitive, a);
  for (const c of COUNTRIES) {
    if (!NAME_MATCH_EXCLUDED.has(c.code)) add(c.name, false, { countries: [c.code] });
    for (const alias of c.aliases) add(alias, false, { countries: [c.code] });
  }
  for (const [token, code] of Object.entries(COUNTRY_TOKENS)) add(token, true, { countries: [code] });
  for (const [name, code] of Object.entries(SUBDIVISIONS)) add(name, name.length <= 4, { countries: [code] });
  for (const [city, code] of Object.entries(CITIES)) add(city, true, { countries: [code], city: true });

  // Longest phrases first so "New Mexico" wins over "Mexico" and "South Sudan" over "Sudan".
  entries.sort((a, b) => b.phrase.length - a.phrase.length);
  return entries.map(({ phrase, caseSensitive, m }) => ({
    ...m,
    re: new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(phrase)}(?![\\p{L}\\p{N}])`, caseSensitive ? 'gu' : 'giu'),
  }));
}

const MATCHERS = buildMatchers();

const blank = (s: string, start: number, end: number) => s.slice(0, start) + ' '.repeat(end - start) + s.slice(end);

function knownCitySuffix(text: string): string | undefined {
  const words = text.trim().split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const candidate = words.slice(i).join(' ');
    if (CITIES[candidate]) return candidate;
  }
  return undefined;
}

/** "Austin, TX" / "Toronto, ON" style locations. */
function matchStateCodes(text: string, hit: Hit): string {
  const re = /([\p{L}][\p{L}.'’]*(?:[ -][\p{L}][\p{L}.'’]*){0,3}),\s*([A-Z]{2})(?![\p{L}])/gu;
  let working = text;
  for (const m of text.matchAll(re)) {
    const [, place, code] = m;
    const country = US_STATES[code] ? 'US' : CA_PROVINCES[code] ? 'CA' : undefined;
    if (!country) continue;
    const city = knownCitySuffix(place);
    if (city && CITIES[city] !== country && !AMBIGUOUS_CITIES.has(city)) continue;
    hit.countries.add(country);
    working = blank(working, m.index!, m.index! + m[0].length);
  }
  return working;
}

function scan(text: string, hit: Hit, allowWeak: boolean) {
  // "Georgia" is the US state unless a Georgian city is mentioned.
  if (/\b(?:Tbilisi|Batumi|Kutaisi)\b/.test(text)) text = text.replace(/\bGeorgia\b/g, ' ');
  for (const segment of text.split(/\s*[;|/·•\n]\s*/)) scanSegment(segment, hit, allowWeak);
}

/** A city only counts when no other country is named next to it ("Lagos, Faro, Portugal" is not Nigeria). */
function scanSegment(text: string, hit: Hit, allowWeak: boolean) {
  const stated = new Set<string>();
  let working = matchStateCodes(text, { ...hit, countries: stated });
  const fromCities = new Set<string>();
  for (const matcher of MATCHERS) {
    if (matcher.weak && !allowWeak) continue;
    matcher.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = matcher.re.exec(working))) {
      matcher.countries.forEach((c) => (matcher.city ? fromCities : stated).add(c));
      matcher.regions.forEach((r) => hit.regionWide.add(r));
      if (matcher.worldwide) hit.worldwide = true;
      working = blank(working, m.index, m.index + m[0].length);
    }
  }
  stated.forEach((c) => hit.countries.add(c));
  fromCities.forEach((c) => (!stated.size || stated.has(c)) && hit.countries.add(c));
}

function resolveHint(hint: string, hit: Hit) {
  const value = hint.trim();
  if (!value) return;
  const upper = value.toUpperCase();
  if (/^[A-Z]{2}$/i.test(value)) {
    const code = upper === 'UK' ? 'GB' : upper;
    if (COUNTRY_BY_CODE.has(code)) return void hit.countries.add(code);
  }
  if (/^[A-Z]{3}$/i.test(value) && ISO3_TO_ISO2[upper]) return void hit.countries.add(ISO3_TO_ISO2[upper]);
  scan(value, hit, true);
}

const isEmpty = (h: Hit) => !h.countries.size && !h.regionWide.size && !h.worldwide;

export interface LocationInput {
  /** Location fields published by the employer */
  raw?: (string | undefined | null)[];
  /** Structured country codes or names (ISO2, ISO3 or names) */
  hints?: (string | undefined | null)[];
  /** Title / snippet text used only when nothing structured is available */
  freeText?: (string | undefined | null)[];
}

export function classifyLocation({ raw = [], hints = [], freeText = [] }: LocationInput): JobLocation {
  const rawClean = [...new Set(raw.map((r) => r?.replace(/\s+/g, ' ').trim()).filter((r): r is string => !!r))];
  const hit: Hit = { countries: new Set(), regionWide: new Set(), worldwide: false };

  hints.forEach((h) => h && resolveHint(h, hit));
  rawClean.forEach((r) => scan(r, hit, true));
  if (isEmpty(hit)) freeText.forEach((t) => t && scan(t, hit, false));

  const countries = [...hit.countries];
  const regionWide = [...hit.regionWide];
  const regions = [...new Set<RegionId>([...countries.map((c) => COUNTRY_BY_CODE.get(c)!.region), ...regionWide])];

  return {
    raw: rawClean,
    label: buildLabel(rawClean, countries, regionWide, hit.worldwide),
    countries,
    regions,
    regionWide,
    worldwide: hit.worldwide,
  };
}

function buildLabel(raw: string[], countries: string[], regionWide: RegionId[], worldwide: boolean): string {
  if (raw.length) return raw.length > 3 ? `${raw.slice(0, 3).join(' · ')} +${raw.length - 3}` : raw.join(' · ');
  const parts = countries.map((c) => COUNTRY_BY_CODE.get(c)!.name);
  if (regionWide.length) parts.push(...regionWide.map((r) => REGIONS.find((x) => x.id === r)!.label));
  if (worldwide) parts.push('Worldwide');
  return parts.length ? parts.join(' · ') : 'Unspecified';
}
