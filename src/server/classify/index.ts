import type { Job } from '@/shared/types';
import type { RawJob } from '../enrich/types';
import { classifyLocation } from './location';
import { classifyRole, classifySeniority } from './role';
import { extractStacks } from './stacks';
import { detectWorkType } from './workType';

/** Days after posting used to estimate expiry when the employer publishes none. */
const ESTIMATED_EXPIRY_DAYS = 30;

export interface NormalizeContext {
  sourceGroup: Job['sourceGroup'];
  query?: string;
  now: string;
}

export function normalizeJob(raw: RawJob, ctx: NormalizeContext): Job {
  const title = raw.title || 'Untitled role';
  const location = classifyLocation({
    raw: raw.locations,
    hints: raw.countryHints,
    freeText: raw.locations.length || raw.countryHints.length ? [] : [title, raw.snippet],
  });

  const workType = detectWorkType({
    structured: raw.workTypeHints,
    location: raw.locations,
    title,
    description: raw.description || raw.snippet,
  });

  let expiresAt = raw.expiresAt;
  let expiresEstimated = false;
  if (!expiresAt && raw.postedAt) {
    expiresAt = new Date(Date.parse(raw.postedAt) + ESTIMATED_EXPIRY_DAYS * 864e5).toISOString();
    expiresEstimated = true;
  }

  return {
    id: raw.key,
    url: raw.url,
    applyUrl: raw.applyUrl || raw.url,
    title,
    company: raw.company || 'Unknown company',
    source: raw.source,
    sourceGroup: ctx.sourceGroup,
    location,
    workType,
    roleCategory: classifyRole(title),
    seniority: classifySeniority(title) === 'Unspecified' && raw.seniorityHint ? raw.seniorityHint : classifySeniority(title),
    employmentType: raw.employmentType,
    stacks: extractStacks(title, raw.description || raw.snippet),
    salary: raw.salary,
    postedAt: raw.postedAt,
    expiresAt,
    expiresEstimated,
    description: raw.description,
    snippet: raw.snippet,
    companyLinkedIn: raw.companyLinkedIn,
    enrichedBy: raw.enrichedBy,
    firstSeenAt: ctx.now,
    lastSeenAt: ctx.now,
    queries: ctx.query ? [ctx.query] : [],
  };
}
