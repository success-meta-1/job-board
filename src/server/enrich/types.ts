import type { AtsId, Job, Seniority } from '@/shared/types';

/** Source-specific job data before classification. */
export interface RawJob {
  key: string;
  url: string;
  applyUrl?: string;
  title: string;
  company?: string;
  companyLinkedIn?: string;
  source: string;
  locations: string[];
  countryHints: string[];
  workTypeHints: unknown[];
  employmentType?: string;
  /** Used when the title doesn't reveal seniority */
  seniorityHint?: Seniority;
  salary?: string;
  postedAt?: string;
  expiresAt?: string;
  description?: string;
  snippet?: string;
  enrichedBy: Job['enrichedBy'];
}

export interface AtsRef {
  ats: AtsId;
  slug: string;
  /** Present for job detail URLs, absent for board roots */
  jobId?: string;
  eu?: boolean;
}
