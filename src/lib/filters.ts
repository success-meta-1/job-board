import { foundedBucket, matchesMemberFilter, type FoundedBucket, type MemberFilter } from '@/shared/company';
import type { JobWithState, RegionId, RoleCategory, Seniority, WorkType } from '@/shared/types';
import { expiryState } from './format';

export type StatusView = 'active' | 'new' | 'saved' | 'applied' | 'hidden' | 'all';
export type PostedWithin = 'any' | '24h' | '3d' | '7d' | '30d';
export type SortKey = 'posted' | 'expires' | 'company' | 'title' | 'firstSeen';
export type GroupKey = 'none' | 'company' | 'location' | 'role' | 'source';

export interface Filters {
  text: string;
  status: StatusView;
  /** Location keys: `ww`, `none`, `r:<region>`, `rw:<region>`, `c:<ISO2>` */
  locations: string[];
  /** Country filters also match region-wide and worldwide jobs */
  includeBroad: boolean;
  workTypes: WorkType[];
  roles: RoleCategory[];
  seniorities: Seniority[];
  stacks: string[];
  stackMode: 'any' | 'all';
  sources: string[];
  companyMembers: MemberFilter;
  founded: FoundedBucket[];
  postedWithin: PostedWithin;
  hideExpired: boolean;
  onlySalary: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  text: '',
  status: 'active',
  locations: [],
  includeBroad: true,
  workTypes: [],
  roles: [],
  seniorities: [],
  stacks: [],
  stackMode: 'any',
  sources: [],
  companyMembers: 'any',
  founded: [],
  postedWithin: 'any',
  hideExpired: true,
  onlySalary: false,
};

export type Facet = 'locations' | 'workTypes' | 'roles' | 'seniorities' | 'stacks' | 'sources' | 'companyMembers' | 'founded' | 'status';

const POSTED_MS: Record<PostedWithin, number> = { any: Infinity, '24h': 864e5, '3d': 3 * 864e5, '7d': 7 * 864e5, '30d': 30 * 864e5 };

export function matchesLocation(job: JobWithState, keys: string[], includeBroad: boolean, regionOf: (code: string) => RegionId | undefined): boolean {
  if (!keys.length) return true;
  const loc = job.location;
  return keys.some((key) => {
    if (key === 'ww') return loc.worldwide;
    if (key === 'none') return !loc.worldwide && !loc.countries.length && !loc.regions.length;
    const [kind, value] = key.split(':') as [string, string];
    if (kind === 'r') return loc.regions.includes(value as RegionId) || (includeBroad && loc.worldwide);
    if (kind === 'rw') return loc.regionWide.includes(value as RegionId);
    if (kind === 'c') {
      if (loc.countries.includes(value)) return true;
      if (!includeBroad) return false;
      const region = regionOf(value);
      return loc.worldwide || (!!region && loc.regionWide.includes(region));
    }
    return false;
  });
}

export function applyFilters(
  jobs: JobWithState[],
  f: Filters,
  regionOf: (code: string) => RegionId | undefined,
  except?: Facet,
  now = Date.now(),
): JobWithState[] {
  const terms = f.text.toLowerCase().split(/\s+/).filter(Boolean);
  return jobs.filter((job) => {
    if (except !== 'status') {
      if (f.status === 'active' && job.status === 'hidden') return false;
      if (f.status !== 'active' && f.status !== 'all' && job.status !== f.status) return false;
    }
    if (terms.length) {
      const hay = `${job.title} ${job.company} ${job.location.label} ${job.stacks.join(' ')} ${job.source}`.toLowerCase();
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    if (except !== 'locations' && !matchesLocation(job, f.locations, f.includeBroad, regionOf)) return false;
    if (except !== 'workTypes' && f.workTypes.length && !f.workTypes.includes(job.workType)) return false;
    if (except !== 'roles' && f.roles.length && !f.roles.includes(job.roleCategory)) return false;
    if (except !== 'seniorities' && f.seniorities.length && !f.seniorities.includes(job.seniority)) return false;
    if (except !== 'sources' && f.sources.length && !f.sources.includes(job.source)) return false;
    if (except !== 'companyMembers' && !matchesMemberFilter(job.companyInfo, f.companyMembers)) return false;
    if (except !== 'founded' && f.founded.length && !f.founded.includes(foundedBucket(job.companyInfo))) return false;
    if (except !== 'stacks' && f.stacks.length) {
      const ok = f.stackMode === 'all' ? f.stacks.every((s) => job.stacks.includes(s)) : f.stacks.some((s) => job.stacks.includes(s));
      if (!ok) return false;
    }
    if (f.postedWithin !== 'any') {
      const ts = Date.parse(job.postedAt ?? job.firstSeenAt);
      if (now - ts > POSTED_MS[f.postedWithin]) return false;
    }
    if (f.hideExpired) {
      const state = expiryState(job, now);
      if (state === 'expired' || state === 'stale') return false;
    }
    if (f.onlySalary && !job.salary) return false;
    return true;
  });
}

export function countBy<T extends string>(jobs: JobWithState[], pick: (job: JobWithState) => T | T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const job of jobs) {
    const values = pick(job);
    for (const v of Array.isArray(values) ? values : [values]) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

export function sortJobs(jobs: JobWithState[], key: SortKey): JobWithState[] {
  const time = (iso?: string, fallback = 0) => (iso ? Date.parse(iso) : fallback);
  const sorted = [...jobs];
  switch (key) {
    case 'posted':
      return sorted.sort((a, b) => time(b.postedAt ?? b.firstSeenAt) - time(a.postedAt ?? a.firstSeenAt));
    case 'expires':
      return sorted.sort((a, b) => time(a.expiresAt, Infinity) - time(b.expiresAt, Infinity));
    case 'company':
      return sorted.sort((a, b) => a.company.localeCompare(b.company) || a.title.localeCompare(b.title));
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'firstSeen':
      return sorted.sort((a, b) => time(b.firstSeenAt) - time(a.firstSeenAt));
  }
}

export const activeFilterCount = (f: Filters) =>
  f.locations.length + f.workTypes.length + f.roles.length + f.seniorities.length + f.stacks.length + f.sources.length + f.founded.length +
  (f.companyMembers !== 'any' ? 1 : 0) +
  (f.postedWithin !== 'any' ? 1 : 0) + (f.onlySalary ? 1 : 0) + (f.text ? 1 : 0);
