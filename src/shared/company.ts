import type { CompanyProfile } from './types';

/** Cumulative member filters: "≤ 50" also includes companies with ≤ 10 members. */
export type MemberFilter = 'any' | 'upTo10' | 'upTo50' | 'upTo100' | 'over100';
export type FoundedBucket = 'startup' | 'before2020' | 'unknown';

export const STARTUP_SINCE = 2020;

export const MEMBER_FILTERS: { value: MemberFilter; label: string; max?: number; min?: number }[] = [
  { value: 'any', label: 'Any' },
  { value: 'upTo10', label: '1–10', max: 10 },
  { value: 'upTo50', label: '1–50', max: 50 },
  { value: 'upTo100', label: '1–100', max: 100 },
  { value: 'over100', label: '100+', min: 101 },
];

export const FOUNDED_LABEL: Record<FoundedBucket, string> = {
  startup: `Startup (${STARTUP_SINCE}+)`,
  before2020: `Before ${STARTUP_SINCE}`,
  unknown: 'Unknown',
};

/**
 * Member count, falling back to the declared size range when LinkedIn shows no count.
 * "51-200 employees" straddles 100, so it can't be placed and stays unknown.
 */
export function memberCount(profile: CompanyProfile | undefined): number | undefined {
  if (!profile) return undefined;
  if (profile.members !== undefined) return profile.members;
  const [lo, hi] = (profile.sizeRange?.replace(/,/g, '').match(/\d+/g) ?? []).map(Number);
  if (hi !== undefined && hi <= 100) return hi;
  if (lo !== undefined && lo > 100) return lo;
  return undefined;
}

export function matchesMemberFilter(profile: CompanyProfile | undefined, filter: MemberFilter): boolean {
  if (filter === 'any') return true;
  const n = memberCount(profile);
  if (n === undefined) return false;
  const { min = 0, max = Infinity } = MEMBER_FILTERS.find((f) => f.value === filter)!;
  return n >= min && n <= max;
}

export function foundedBucket(profile: CompanyProfile | undefined): FoundedBucket {
  if (!profile?.founded) return 'unknown';
  return profile.founded >= STARTUP_SINCE ? 'startup' : 'before2020';
}

/** Lowercased company name without legal suffixes, used to share profiles across jobs. */
export function companyKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(?:inc|incorporated|llc|ltd|limited|corp|corporation|co|company|gmbh|ag|sa|bv|plc|pte|pty|sdn bhd|bhd|jsc|tbk|pt|srl|sas|oy|ab|as)\b\.?/g, ' ')
    .replace(/[^a-z0-9]+/g, '');
}
