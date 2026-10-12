import { createHash } from 'node:crypto';
import { canonicalUrl } from '@/shared/url';
import { classifyRole } from '../classify/role';
import type { SearchResult } from '../search/providers';
import { cleanText } from '../utils/html';
import { BoardCache, fetchAtsJob, parseAtsUrl, prettifySlug } from './ats';
import { fetchJsonLdJob } from './jsonld';
import type { AtsRef, RawJob } from './types';

const HOST_SOURCES: [RegExp, string][] = [
  [/greenhouse\.io$/, 'Greenhouse'],
  [/lever\.co$/, 'Lever'],
  [/ashbyhq\.com$/, 'Ashby'],
  [/workable\.com$/, 'Workable'],
  [/smartrecruiters\.com$/, 'SmartRecruiters'],
  [/recruitee\.com$/, 'Recruitee'],
  [/personio\.(?:de|com)$/, 'Personio'],
  [/teamtailor\.com$/, 'Teamtailor'],
  [/breezy\.hr$/, 'Breezy'],
  [/(?:^|\.)join\.com$/, 'JOIN'],
  [/freshteam\.com$/, 'Freshteam'],
  [/applytojob\.com$/, 'JazzHR'],
  [/zohorecruit\.\w+$/, 'Zoho Recruit'],
  [/jobvite\.com$/, 'Jobvite'],
  [/gusto\.com$/, 'Gusto'],
  [/trakstar\.com$/, 'Trakstar'],
  [/comeet\.(?:com|co)$/, 'Comeet'],
  [/rippling(?:-ats)?\.com$/, 'Rippling'],
  [/careers-page\.com$/, 'Careers-page'],
  [/dover\.com$/, 'Dover'],
  [/startup\.jobs$/, 'Startup.jobs'],
  [/cleverstaff\.net$/, 'CleverStaff'],
  [/needle\.so$/, 'Needle'],
  [/notion\.site$/, 'Notion'],
  [/bamboohr\.com$/, 'BambooHR'],
  [/myworkdayjobs\.com$/, 'Workday'],
];

const SUBDOMAIN_ATS = /\.(?:recruitee\.com|teamtailor\.com|personio\.(?:de|com)|breezy\.hr|bamboohr\.com|freshteam\.com|zohorecruit\.\w+|applytojob\.com|rippling-ats\.com|careers-page\.com|hire\.trakstar\.com|notion\.site|myworkdayjobs\.com)$/;
const PATH_ATS = /^(?:jobs\.lever\.co|jobs\.eu\.lever\.co|jobs\.ashbyhq\.com|apply\.workable\.com|(?:job-)?boards(?:\.eu)?\.greenhouse\.io|jobs\.smartrecruiters\.com|(?:www\.)?join\.com|jobs\.jobvite\.com|app\.dover\.com|(?:www\.)?comeet\.com|jobs\.gusto\.com|jobs\.needle\.so|(?:www\.)?startup\.jobs)$/;
const GENERIC_SEGMENTS = new Set(['companies', 'company', 'jobs', 'job', 'apply', 'boards', 'j', 'o', 'careers', 'career', 'en', 'de', 'positions']);
const SUBDOMAIN_PREFIXES = /^(?:www|careers?|jobs?|apply|hire|talent|work|join)\./;

export function sourceLabelForUrl(url: string): string {
  const host = safeHost(url);
  return HOST_SOURCES.find(([re]) => re.test(host))?.[1] ?? 'Careers page';
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function companyFromUrl(url: string): string | undefined {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return undefined;
  }
  const host = u.hostname.toLowerCase();
  if (SUBDOMAIN_ATS.test(host)) {
    const label = host.split('.').find((l) => !['jobs', 'www', 'careers'].includes(l));
    return label ? prettifySlug(label) : undefined;
  }
  if (PATH_ATS.test(host)) {
    const seg = u.pathname.split('/').find((s) => s && !GENERIC_SEGMENTS.has(s.toLowerCase()));
    return seg ? prettifySlug(decodeURIComponent(seg).replace(/-[0-9a-f-]{8,}$/i, '')) : undefined;
  }
  const labels = host.replace(SUBDOMAIN_PREFIXES, '').split('.');
  const sld = labels.length >= 3 && /^(?:co|com|org|net|ac)$/.test(labels[labels.length - 2]) ? labels[labels.length - 3] : labels[labels.length - 2];
  return sld ? prettifySlug(sld) : undefined;
}

export const urlKey = (url: string) => `url:${createHash('sha1').update(canonicalUrl(url)).digest('hex').slice(0, 16)}`;

const NOT_A_JOB = [
  /^(?:careers?|jobs|join us|open (?:positions|roles)|work (?:with|at) us|life at|about us|our team)\b/i,
  /\b(?:careers|jobs|job openings|open positions|current openings|vacancies)\s*(?:at|@|page|\||-|–|$)/i,
  /\b\d+\s+(?:jobs|open (?:positions|roles)|openings)\b/i,
];
const JOBLIKE = /\b(?:manager|specialist|analyst|consultant|coordinator|director|lead|architect|administrator|associate|representative|recruiter|marketing|sales|support|writer|accountant|intern|scientist|researcher|officer|executive|head of)\b/i;

export function looksLikeJobTitle(title: string): boolean {
  if (!title || title.length < 4 || NOT_A_JOB.some((re) => re.test(title))) return false;
  return classifyRole(title) !== 'Other' || JOBLIKE.test(title);
}

const NOISE_COMPANY = /^(?:careers?|jobs?|hiring|greenhouse|lever|workable|ashby|linkedin|indeed|glassdoor|apply|job application)$/i;

function splitSearchTitle(raw: string, host: string): { title: string; company?: string } {
  const t = cleanText(raw.replace(/<[^>]+>/g, '')).replace(/\s*(?:\.\.\.|…)$/, '');
  let m = t.match(/^Job Application for (.+?) at (.+)$/i);
  if (m) return { title: m[1], company: m[2] };
  const parts = t.split(/\s+[|–—-]\s+/).filter(Boolean);
  m = parts[0]?.match(/^(.+?)\s+(?:at|@)\s+(.+)$/);
  if (m) return { title: m[1], company: m[2] };
  if (/lever\.co$/.test(host) && parts.length >= 2) return { title: parts[1], company: parts[0] };
  if (parts.length >= 2) return { title: parts[0], company: NOISE_COMPANY.test(parts[1]) ? undefined : parts[1] };
  return { title: t };
}

/** Parses "3 days ago", "5 hours ago", "Jan 5, 2026" or a snippet beginning with such a date. */
export function parseSearchDate(date: string | undefined, snippet: string): string | undefined {
  const candidates = [date, snippet.match(/^(.{3,25}?)\s+[—–-]\s/)?.[1]].filter(Boolean) as string[];
  for (const c of candidates) {
    const rel = c.match(/(\d+)\s*(minute|min|hour|hr|day|week|month)s?\s+ago/i);
    if (rel) {
      const n = Number(rel[1]);
      const unit = rel[2].toLowerCase();
      const ms = unit.startsWith('min') ? 6e4 : unit.startsWith('h') ? 36e5 : unit === 'day' ? 864e5 : unit === 'week' ? 6048e5 : 2592e6;
      return new Date(Date.now() - n * ms).toISOString();
    }
    const abs = Date.parse(c);
    if (!Number.isNaN(abs) && abs > Date.parse('2000-01-01')) return new Date(abs).toISOString();
  }
  return undefined;
}

function snippetJob(result: SearchResult, key: string, source: string): RawJob | null {
  const host = safeHost(result.url);
  const { title, company } = splitSearchTitle(result.title, host);
  if (!looksLikeJobTitle(title)) return null;
  const snippet = cleanText(result.snippet.replace(/<[^>]+>/g, ''));
  return {
    key,
    url: result.url,
    title,
    company: company || companyFromUrl(result.url),
    source,
    locations: [],
    countryHints: [],
    workTypeHints: [],
    postedAt: parseSearchDate(result.date, snippet),
    snippet,
    enrichedBy: 'search-snippet',
  };
}

export interface EnrichOutcome {
  job?: RawJob;
  /** ATS board the URL belongs to (discovered company) */
  board?: AtsRef;
  /** URL is a board listing page rather than a single job */
  boardRoot?: boolean;
  /** Posting was removed from the ATS */
  gone?: boolean;
}

export async function enrichSearchResult(result: SearchResult, cache: BoardCache): Promise<EnrichOutcome> {
  const ref = parseAtsUrl(result.url);
  if (ref && !ref.jobId) return { board: ref, boardRoot: true };

  const snippet = cleanText(result.snippet.replace(/<[^>]+>/g, ''));
  const source = sourceLabelForUrl(result.url);
  const key = urlKey(result.url);

  if (ref) {
    try {
      const job = await fetchAtsJob(ref, cache);
      return job ? { job: { ...job, snippet }, board: ref } : { gone: true, board: ref };
    } catch {
      /* platform API unavailable: fall back to page metadata */
    }
  }

  const fallback = snippetJob(result, key, source);
  try {
    const ld = await fetchJsonLdJob(result.url, key, source);
    if (ld?.title) {
      return {
        board: ref ?? undefined,
        job: {
          ...ld,
          company: ld.company || fallback?.company || companyFromUrl(result.url),
          postedAt: ld.postedAt || fallback?.postedAt,
          snippet,
        },
      };
    }
  } catch {
    /* page blocked or unreachable: keep the search snippet */
  }
  return fallback ? { job: fallback, board: ref ?? undefined } : {};
}
