export type WorkType = 'remote' | 'hybrid' | 'onsite' | 'unknown';

export type RegionId =
  | 'north-america'
  | 'latam'
  | 'europe'
  | 'middle-east'
  | 'africa'
  | 'asia'
  | 'oceania';

export type TimeRange = '24h' | 'week' | 'month' | 'any';

export type JobStatus = 'new' | 'saved' | 'applied' | 'hidden';

export type RoleCategory =
  | 'Frontend'
  | 'Backend'
  | 'Full-stack'
  | 'Mobile'
  | 'DevOps / SRE'
  | 'Data'
  | 'AI / ML'
  | 'Security'
  | 'QA / Test'
  | 'Embedded'
  | 'Blockchain'
  | 'Game'
  | 'Software Engineer'
  | 'Eng. Management'
  | 'Design'
  | 'Product'
  | 'Other';

export type Seniority =
  | 'Intern'
  | 'Junior'
  | 'Mid'
  | 'Senior'
  | 'Staff / Principal'
  | 'Lead'
  | 'Manager'
  | 'Unspecified';

export type AtsId =
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'workable'
  | 'smartrecruiters'
  | 'recruitee';

export type SourceGroup = 'ATS' | 'Careers' | 'Career' | 'Other';

export interface SearchSource {
  id: string;
  label: string;
  group: SourceGroup;
  /** Google operator exactly as saved in the bookmark, e.g. `site:greenhouse.io` */
  operator: string;
}

export interface DirectBoard {
  id: string;
  label: string;
  url: string;
}

export interface CompanyBoard {
  ats: AtsId;
  slug: string;
  name?: string;
  origin: 'seed' | 'discovered' | 'manual';
  addedAt: string;
  lastScannedAt?: string;
  lastJobCount?: number;
  error?: string;
}

export interface JobLocation {
  /** Location strings as published by the employer */
  raw: string[];
  label: string;
  /** ISO 3166-1 alpha-2 codes */
  countries: string[];
  /** Every region the job touches (derived from countries + region-wide mentions) */
  regions: RegionId[];
  /** Regions that are open as a whole, e.g. "Remote - Europe" */
  regionWide: RegionId[];
  worldwide: boolean;
}

export interface Job {
  id: string;
  url: string;
  applyUrl: string;
  title: string;
  company: string;
  source: string;
  sourceGroup: SourceGroup | 'Company boards' | 'LinkedIn';
  location: JobLocation;
  workType: WorkType;
  roleCategory: RoleCategory;
  seniority: Seniority;
  employmentType?: string;
  stacks: string[];
  salary?: string;
  postedAt?: string;
  expiresAt?: string;
  expiresEstimated?: boolean;
  description?: string;
  snippet?: string;
  /** LinkedIn company page, when the source links to it */
  companyLinkedIn?: string;
  enrichedBy: 'ats-api' | 'json-ld' | 'linkedin' | 'search-snippet';
  firstSeenAt: string;
  lastSeenAt: string;
  queries: string[];
}

export interface JobWithState extends Job {
  status: JobStatus;
  statusUpdatedAt?: string;
  companyInfo?: CompanyProfile;
}

/** Company facts from its public LinkedIn page. */
export interface CompanyProfile {
  name: string;
  linkedinUrl: string;
  /** People on LinkedIn who list the company as their employer */
  members?: number;
  /** Size range declared by the company, e.g. "11-50 employees" */
  sizeRange?: string;
  founded?: number;
  industry?: string;
}

export interface CompanyRecord {
  profile?: CompanyProfile;
  fetchedAt: string;
  error?: string;
}

export interface RunRequest {
  sourceIds: string[];
  keywords: string[];
  workType: WorkType | 'any';
  location?: string;
  timeRange: TimeRange;
  pagesPerQuery: number;
  scanBoards: boolean;
  /** Runs every enabled saved LinkedIn search with its own filters */
  scanLinkedIn: boolean;
}

/** A LinkedIn job search saved from its URL; its filters (geo, work type, date) come from the URL. */
export interface LinkedInSearch {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
  addedAt: string;
  lastScannedAt?: string;
  lastJobCount?: number;
  error?: string;
}

export interface RunProgress {
  id: string;
  status: 'running' | 'done' | 'cancelled' | 'error';
  startedAt: string;
  finishedAt?: string;
  provider?: string;
  request: RunRequest;
  totalQueries: number;
  doneQueries: number;
  resultsFound: number;
  candidates: number;
  enriched: number;
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
  log: string[];
}

export interface ProviderInfo {
  id: string;
  label: string;
  configured: boolean;
}

export interface CountryInfo {
  code: string;
  name: string;
  region: RegionId;
}

/** What `/api/config` returns; the rest of `AppConfig` lives in the browser. */
export interface ServerConfig {
  provider: ProviderInfo | null;
  providers: ProviderInfo[];
  regions: { id: RegionId; label: string }[];
  countries: CountryInfo[];
}

export interface AppConfig extends ServerConfig {
  sources: SearchSource[];
  directBoards: DirectBoard[];
  boards: CompanyBoard[];
  linkedinSearches: LinkedInSearch[];
}

/** Everything stored in the browser, as written by Export and read by Import. */
export interface ExportFile {
  app: 'job-radar';
  version: 1;
  exportedAt: string;
  jobs: Job[];
  states: Record<string, { status: JobStatus; updatedAt: string }>;
  companies: Record<string, CompanyRecord>;
  boards: CompanyBoard[];
  linkedin: LinkedInSearch[];
}
