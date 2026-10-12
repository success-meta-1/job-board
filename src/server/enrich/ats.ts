import type { AtsId } from '@/shared/types';
import { cleanText, htmlToText } from '../utils/html';
import { getJson, HttpError } from '../utils/http';
import type { AtsRef, RawJob } from './types';

export const ATS_LABELS: Record<AtsId, string> = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby',
  workable: 'Workable',
  smartrecruiters: 'SmartRecruiters',
  recruitee: 'Recruitee',
};

const RESERVED_SLUGS = new Set(['embed', 'api', 'v1', 'jobs', 'j', 'o', 'search', 'login', 'apply', 'careers', 'www']);

/** Recognises job URLs on ATS platforms that expose public JSON APIs. */
export function parseAtsUrl(rawUrl: string): AtsRef | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const parts = u.pathname.split('/').filter(Boolean);
  const ok = (slug: string | undefined) => !!slug && !RESERVED_SLUGS.has(slug.toLowerCase());

  if (/(^|\.)greenhouse\.io$/.test(host) && /boards|job-boards/.test(host)) {
    const forParam = u.searchParams.get('for');
    if (forParam) return { ats: 'greenhouse', slug: forParam, jobId: u.searchParams.get('token') ?? undefined };
    if (!ok(parts[0])) return null;
    const jobId = parts[1] === 'jobs' && /^\d+$/.test(parts[2] ?? '') ? parts[2] : undefined;
    return { ats: 'greenhouse', slug: parts[0], jobId };
  }
  if (host === 'jobs.lever.co' || host === 'jobs.eu.lever.co') {
    if (!ok(parts[0])) return null;
    const jobId = /^[0-9a-f-]{36}$/i.test(parts[1] ?? '') ? parts[1] : undefined;
    return { ats: 'lever', slug: parts[0], jobId, eu: host.includes('.eu.') };
  }
  if (host === 'jobs.ashbyhq.com') {
    if (!ok(parts[0])) return null;
    const jobId = /^[0-9a-f-]{36}$/i.test(parts[1] ?? '') ? parts[1] : undefined;
    return { ats: 'ashby', slug: decodeURIComponent(parts[0]), jobId };
  }
  if (host === 'apply.workable.com') {
    if (!ok(parts[0])) return null;
    return { ats: 'workable', slug: parts[0], jobId: parts[1] === 'j' ? parts[2] : undefined };
  }
  if (host === 'jobs.smartrecruiters.com' || host === 'careers.smartrecruiters.com') {
    if (!ok(parts[0])) return null;
    const id = parts[1]?.match(/^(\d{6,})/)?.[1];
    return { ats: 'smartrecruiters', slug: parts[0], jobId: id };
  }
  const recruitee = host.match(/^([a-z0-9-]+)\.recruitee\.com$/);
  if (recruitee && ok(recruitee[1])) {
    return { ats: 'recruitee', slug: recruitee[1], jobId: parts[0] === 'o' ? parts[1] : undefined };
  }
  return null;
}

export const prettifySlug = (slug: string) =>
  slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

/** Short-lived cache so many jobs from the same board (one per API request) share one fetch. */
export class BoardCache {
  private cache = new Map<string, { at: number; value: Promise<any> }>();
  constructor(private ttlMs = 5 * 60_000, private maxEntries = 300) {}
  get<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < this.ttlMs) return hit.value;
    const value = load();
    value.catch(() => this.cache.delete(key));
    this.cache.delete(key);
    this.cache.set(key, { at: Date.now(), value });
    if (this.cache.size > this.maxEntries) this.cache.delete(this.cache.keys().next().value!);
    return value;
  }
}

export const boardCache = new BoardCache();

const iso = (v: unknown): string | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const d = new Date(typeof v === 'number' || /^\d+$/.test(String(v)) ? Number(v) : String(v));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

const money = (min?: number, max?: number, currency?: string, interval?: string) => {
  if (!min && !max) return undefined;
  const fmt = (n?: number) => (n ? n.toLocaleString('en-US') : '');
  const range = min && max && min !== max ? `${fmt(min)}–${fmt(max)}` : fmt(min || max);
  return [currency, range, interval && `/ ${interval.replace(/^per[-_ ]?/i, '').toLowerCase()}`].filter(Boolean).join(' ');
};

// ---------------------------------------------------------------- Greenhouse

const ghBase = (slug: string) => `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}`;

async function greenhouseBoardName(slug: string, cache: BoardCache): Promise<string> {
  return cache.get(`gh-name:${slug}`, async () => {
    try {
      return cleanText((await getJson(ghBase(slug))).name) || prettifySlug(slug);
    } catch {
      return prettifySlug(slug);
    }
  });
}

function fromGreenhouse(slug: string, j: any, company: string): RawJob {
  const offices: string[] = (j.offices ?? []).map((o: any) => o.location || o.name).filter(Boolean);
  return {
    key: `greenhouse:${slug}:${j.id}`,
    url: j.absolute_url || `https://job-boards.greenhouse.io/${slug}/jobs/${j.id}`,
    title: cleanText(j.title),
    company: cleanText(j.company_name) || company,
    source: ATS_LABELS.greenhouse,
    locations: [j.location?.name, ...offices].filter(Boolean),
    countryHints: [],
    workTypeHints: [],
    postedAt: iso(j.first_published ?? j.updated_at),
    description: htmlToText(j.content),
    enrichedBy: 'ats-api',
  };
}

// ---------------------------------------------------------------- Lever

const leverBase = (eu?: boolean) => `https://api${eu ? '.eu' : ''}.lever.co/v0/postings`;

function fromLever(slug: string, j: any): RawJob {
  const lists = (j.lists ?? []).map((l: any) => `${l.text}\n${htmlToText(l.content)}`).join('\n\n');
  const sr = j.salaryRange;
  return {
    key: `lever:${slug}:${j.id}`,
    url: j.hostedUrl,
    applyUrl: j.applyUrl,
    title: cleanText(j.text),
    company: prettifySlug(slug),
    source: ATS_LABELS.lever,
    locations: [j.categories?.location, ...(j.categories?.allLocations ?? [])].filter(Boolean),
    countryHints: [j.country].filter(Boolean),
    workTypeHints: [j.workplaceType],
    employmentType: j.categories?.commitment,
    salary: sr ? money(sr.min, sr.max, sr.currency, sr.interval) : undefined,
    postedAt: iso(j.createdAt),
    description: [j.descriptionPlain, lists, j.additionalPlain].filter(Boolean).join('\n\n').slice(0, 6000),
    enrichedBy: 'ats-api',
  };
}

// ---------------------------------------------------------------- Ashby

function fromAshby(slug: string, j: any): RawJob {
  const addr = j.address?.postalAddress;
  const secondary = (j.secondaryLocations ?? []).map((s: any) => s.location).filter(Boolean);
  return {
    key: `ashby:${slug}:${j.id}`,
    url: j.jobUrl || `https://jobs.ashbyhq.com/${slug}/${j.id}`,
    applyUrl: j.applyUrl,
    title: cleanText(j.title),
    company: prettifySlug(slug),
    source: ATS_LABELS.ashby,
    locations: [j.location, ...secondary, [addr?.addressLocality, addr?.addressRegion].filter(Boolean).join(', ')].filter(Boolean),
    countryHints: [addr?.addressCountry, ...(j.secondaryLocations ?? []).map((s: any) => s.address?.postalAddress?.addressCountry)].filter(Boolean),
    workTypeHints: [j.workplaceType, j.isRemote === true ? 'remote' : undefined],
    employmentType: j.employmentType,
    salary: j.compensation?.compensationTierSummary || j.compensation?.scrapeableCompensationSalarySummary,
    postedAt: iso(j.publishedAt),
    description: j.descriptionPlain?.slice(0, 6000) || htmlToText(j.descriptionHtml),
    enrichedBy: 'ats-api',
  };
}

// ---------------------------------------------------------------- Workable

function fromWorkable(slug: string, j: any, company: string): RawJob {
  const locs = (j.locations ?? []).filter((l: any) => !l.hidden);
  return {
    key: `workable:${slug}:${j.shortcode}`,
    url: j.url || `https://apply.workable.com/${slug}/j/${j.shortcode}/`,
    applyUrl: j.application_url,
    title: cleanText(j.title),
    company,
    source: ATS_LABELS.workable,
    locations: locs.length
      ? locs.map((l: any) => [l.city, l.region, l.country].filter(Boolean).join(', '))
      : [[j.city, j.state, j.country].filter(Boolean).join(', ')].filter(Boolean),
    countryHints: locs.map((l: any) => l.countryCode).filter(Boolean),
    workTypeHints: [j.workplace, j.telecommuting === true ? 'remote' : undefined],
    employmentType: j.employment_type,
    postedAt: iso(j.published_on ?? j.created_at),
    description: htmlToText(j.description),
    enrichedBy: 'ats-api',
  };
}

// ---------------------------------------------------------------- SmartRecruiters

function fromSmartRecruiters(slug: string, j: any): RawJob {
  const loc = j.location ?? {};
  const sections = j.jobAd?.sections ?? {};
  return {
    key: `smartrecruiters:${slug}:${j.id}`,
    url: j.postingUrl || `https://jobs.smartrecruiters.com/${slug}/${j.id}`,
    applyUrl: j.applyUrl,
    title: cleanText(j.name),
    company: cleanText(j.company?.name) || prettifySlug(slug),
    source: ATS_LABELS.smartrecruiters,
    locations: [loc.fullLocation || [loc.city, loc.region, loc.country?.toUpperCase()].filter(Boolean).join(', ')].filter(Boolean),
    countryHints: [loc.country].filter(Boolean),
    workTypeHints: [loc.hybrid ? 'hybrid' : loc.remote ? 'remote' : undefined],
    employmentType: j.typeOfEmployment?.label,
    postedAt: iso(j.releasedDate),
    description: [sections.jobDescription?.text, sections.qualifications?.text, sections.additionalInformation?.text]
      .map((t) => htmlToText(t))
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 6000),
    enrichedBy: 'ats-api',
  };
}

// ---------------------------------------------------------------- Recruitee

function fromRecruitee(slug: string, o: any): RawJob {
  const s = o.salary;
  return {
    key: `recruitee:${slug}:${o.slug}`,
    url: o.careers_url || `https://${slug}.recruitee.com/o/${o.slug}`,
    applyUrl: o.careers_apply_url,
    title: cleanText(o.title),
    company: cleanText(o.company_name) || prettifySlug(slug),
    source: ATS_LABELS.recruitee,
    locations: [o.location, ...(o.locations ?? []).map((l: any) => l.name)].filter(Boolean),
    countryHints: [o.country_code, ...(o.locations ?? []).map((l: any) => l.country_code)].filter(Boolean),
    workTypeHints: [o.hybrid ? 'hybrid' : o.remote ? 'remote' : o.on_site ? 'onsite' : undefined],
    employmentType: o.employment_type_code?.replace(/_/g, ' '),
    salary: s ? money(Number(s.min), Number(s.max), s.currency, s.period) : undefined,
    postedAt: iso(o.published_at ?? o.created_at),
    description: [htmlToText(o.description), htmlToText(o.requirements)].filter(Boolean).join('\n\n').slice(0, 6000),
    enrichedBy: 'ats-api',
  };
}

// ---------------------------------------------------------------- Public API

/** Full board listings (with descriptions) can be several MB for large employers. */
const boardJson = (url: string) => getJson(url, {}, 60_000);

/** Lists every open job on a company board. */
export async function fetchBoard(ref: Pick<AtsRef, 'ats' | 'slug' | 'eu'>, cache: BoardCache): Promise<{ name: string; jobs: RawJob[] }> {
  const { ats, slug } = ref;
  switch (ats) {
    case 'greenhouse': {
      const [data, name] = await Promise.all([
        cache.get(`gh-board:${slug}`, () => boardJson(`${ghBase(slug)}/jobs?content=true`)),
        greenhouseBoardName(slug, cache),
      ]);
      return { name, jobs: (data.jobs ?? []).map((j: any) => fromGreenhouse(slug, j, name)) };
    }
    case 'lever': {
      const data = await cache.get(`lever-board:${slug}`, () => boardJson(`${leverBase(ref.eu)}/${encodeURIComponent(slug)}?mode=json`));
      return { name: prettifySlug(slug), jobs: (data ?? []).map((j: any) => fromLever(slug, j)) };
    }
    case 'ashby': {
      const data = await cache.get(`ashby-board:${slug}`, () =>
        boardJson(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`),
      );
      return { name: prettifySlug(slug), jobs: (data.jobs ?? []).filter((j: any) => j.isListed !== false).map((j: any) => fromAshby(slug, j)) };
    }
    case 'workable': {
      const data = await cache.get(`workable-board:${slug}`, () =>
        boardJson(`https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}?details=true`),
      );
      const name = cleanText(data.name) || prettifySlug(slug);
      return { name, jobs: (data.jobs ?? []).map((j: any) => fromWorkable(slug, j, name)) };
    }
    case 'smartrecruiters': {
      const data = await cache.get(`sr-board:${slug}`, () =>
        boardJson(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=100`),
      );
      const jobs = (data.content ?? []).map((j: any) => fromSmartRecruiters(slug, j));
      return { name: jobs[0]?.company ?? prettifySlug(slug), jobs };
    }
    case 'recruitee': {
      const data = await cache.get(`recruitee-board:${slug}`, () => boardJson(`https://${slug}.recruitee.com/api/offers/`));
      const jobs = (data.offers ?? []).map((o: any) => fromRecruitee(slug, o));
      return { name: jobs[0]?.company ?? prettifySlug(slug), jobs };
    }
  }
}

const isGone = (err: unknown) => err instanceof HttpError && (err.status === 404 || err.status === 410);

/**
 * Fetches a single job. Returns null when the posting no longer exists;
 * throws when the platform API itself is unavailable (caller falls back to page metadata).
 */
export async function fetchAtsJob(ref: AtsRef, cache: BoardCache): Promise<RawJob | null> {
  const { ats, slug, jobId } = ref;
  if (!jobId) return null;
  const single = async (load: () => Promise<RawJob>) => {
    try {
      return await load();
    } catch (err) {
      if (isGone(err)) return null;
      throw err;
    }
  };
  switch (ats) {
    case 'greenhouse':
      return single(async () => {
        const [j, name] = await Promise.all([getJson(`${ghBase(slug)}/jobs/${jobId}`), greenhouseBoardName(slug, cache)]);
        return fromGreenhouse(slug, j, name);
      });
    case 'lever':
      return single(async () => fromLever(slug, await getJson(`${leverBase(ref.eu)}/${encodeURIComponent(slug)}/${jobId}`)));
    case 'smartrecruiters':
      return single(async () =>
        fromSmartRecruiters(slug, await getJson(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings/${jobId}`)),
      );
    default: {
      const board = await fetchBoard(ref, cache);
      return board.jobs.find((j) => j.key.endsWith(`:${jobId}`)) ?? null;
    }
  }
}
