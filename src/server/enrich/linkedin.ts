import type { Seniority } from '@/shared/types';
import type { LinkedInQuery } from '@/shared/linkedin';
import { classifyLocation } from '../classify/location';
import { linkedInCompanyUrl } from './company';
import { cleanText, htmlToText } from '../utils/html';
import { getText, HttpError } from '../utils/http';
import { parseSearchDate } from './index';
import type { RawJob } from './types';

const GUEST_API = 'https://www.linkedin.com/jobs-guest/jobs/api';
const PAGE_DELAY_MS = 700;
const MAX_JOBS_PER_SEARCH = 100;

/** Used only when a card's location text can't be classified. */
const GEO_NAMES: Record<string, string> = {
  '91000000': 'European Union',
  '103121230': 'Philippines',
  '100862922': 'Hong Kong',
  '103804675': 'Singapore',
  '106808692': 'Malaysia',
  '105146118': 'Thailand',
  '102478259': 'Indonesia',
  '104195383': 'Vietnam',
  '103644278': 'United States',
  '101165590': 'United Kingdom',
  '101174742': 'Canada',
  '101282230': 'Germany',
  '102713980': 'India',
  '101452733': 'Australia',
  '105646813': 'Spain',
  '105015875': 'France',
  '105072130': 'Poland',
  '106670623': 'Romania',
  '100364837': 'Portugal',
  '103350119': 'Italy',
  '102974008': 'Estonia',
  '104738515': 'Ireland',
  '105333783': 'Bulgaria',
  '100961908': 'Malta',
  '105490917': 'New Zealand',
  '103323778': 'Mexico',
  '100876405': 'Colombia',
  '100446943': 'Argentina',
  '106057199': 'Brazil',
  '104621616': 'Chile',
  '102890719': 'Netherlands',
  '100565514': 'Belgium',
  '100288700': 'Hungary',
  '104688944': 'Croatia',
  '106693272': 'Switzerland',
  '104508036': 'Czechia',
  '104514075': 'Denmark',
  '100456013': 'Finland',
  '101355337': 'Japan',
};

/** A work type in the title beats LinkedIn's employer-set filter. */
const TITLE_WORK_TYPE = /\b(?:hybrid|on[- ]?site|in[- ]office|remote)\b/i;

const SENIORITY_LEVELS: Record<string, Seniority> = {
  internship: 'Intern',
  'entry level': 'Junior',
  associate: 'Mid',
  director: 'Manager',
  executive: 'Manager',
};

export interface LinkedInCard {
  id: string;
  title: string;
  company: string;
  companyUrl?: string;
  location: string;
  postedAt?: string;
  salary?: string;
}

export interface LinkedInDetail {
  description?: string;
  employmentType?: string;
  seniorityLevel?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const pick = (html: string, re: RegExp) => {
  const match = html.match(re)?.[1];
  return match ? cleanText(match.replace(/<[^>]+>/g, ' ')) : '';
};

async function fetchHtml(url: string, attempt = 0): Promise<string> {
  try {
    return (await getText(url, {}, 20_000)).text;
  } catch (err) {
    if (err instanceof HttpError && (err.status === 429 || err.status >= 500) && attempt < 2) {
      await sleep(4000 * (attempt + 1));
      return fetchHtml(url, attempt + 1);
    }
    throw err;
  }
}

export function parseSearchCards(html: string): LinkedInCard[] {
  return html
    .split('data-entity-urn="urn:li:jobPosting:')
    .slice(1)
    .map((chunk) => {
      const time = chunk.match(/<time class="job-search-card__listdate[^"]*"\s+datetime="([^"]+)"[^>]*>([\s\S]*?)<\/time>/);
      const salary = pick(chunk, /class="job-search-card__salary-info"[^>]*>([\s\S]*?)<\/span>/);
      return {
        id: chunk.match(/^(\d+)/)?.[1] ?? '',
        title: pick(chunk, /class="base-search-card__title"[^>]*>([\s\S]*?)<\/h3>/),
        company: pick(chunk, /class="base-search-card__subtitle"[^>]*>([\s\S]*?)<\/h4>/),
        companyUrl: linkedInCompanyUrl(chunk.match(/base-search-card__subtitle"[^>]*>[\s\S]*?href="([^"]+)"/)?.[1]),
        location: pick(chunk, /class="job-search-card__location"[^>]*>([\s\S]*?)<\/span>/),
        postedAt: time ? (parseSearchDate(cleanText(time[2]), '') ?? parseSearchDate(time[1], '')) : undefined,
        salary: salary || undefined,
      };
    })
    .filter((card) => card.id && card.title);
}

/** Pages through LinkedIn's public (logged-out) job search for one saved search. */
export async function searchLinkedIn(query: LinkedInQuery, shouldStop: () => boolean): Promise<LinkedInCard[]> {
  const found = new Map<string, LinkedInCard>();
  for (let start = 0; start < MAX_JOBS_PER_SEARCH && !shouldStop(); ) {
    const params = new URLSearchParams(query.params);
    params.set('start', String(start));
    let html: string;
    try {
      html = await fetchHtml(`${GUEST_API}/seeMoreJobPostings/search?${params}`);
    } catch (err) {
      // Paging past the last result answers 400 instead of an empty page.
      if (start > 0 && err instanceof HttpError && err.status === 400) break;
      throw err;
    }
    const cards = parseSearchCards(html);
    const fresh = cards.filter((card) => !found.has(card.id));
    fresh.forEach((card) => found.set(card.id, card));
    if (!fresh.length) break;
    start += cards.length;
    await sleep(PAGE_DELAY_MS);
  }
  return [...found.values()];
}

export async function fetchLinkedInDetail(id: string): Promise<LinkedInDetail> {
  const html = await fetchHtml(`${GUEST_API}/jobPosting/${id}`);
  const descriptionHtml =
    html.match(/class="show-more-less-html__markup[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<button|<\/section>)/)?.[1] ??
    html.match(/class="show-more-less-html__markup[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1];
  const criteria = new Map<string, string>();
  for (const m of html.matchAll(/description__job-criteria-subheader">\s*([^<]+?)\s*<\/h3>\s*<span[^>]*>\s*([^<]+?)\s*<\/span>/g)) {
    criteria.set(cleanText(m[1]).toLowerCase(), cleanText(m[2]));
  }
  return {
    description: htmlToText(descriptionHtml) || undefined,
    employmentType: criteria.get('employment type'),
    seniorityLevel: criteria.get('seniority level'),
  };
}

export function linkedInRawJob(card: LinkedInCard, detail: LinkedInDetail | undefined, query: LinkedInQuery): RawJob {
  const locations = card.location ? [card.location] : [];
  const resolved = classifyLocation({ raw: locations });
  const geoName = query.geoId ? GEO_NAMES[query.geoId] : undefined;
  if (geoName && !resolved.countries.length && !resolved.regionWide.length && !resolved.worldwide) locations.push(geoName);
  return {
    key: `linkedin:${card.id}`,
    url: `https://www.linkedin.com/jobs/view/${card.id}/`,
    title: card.title,
    company: card.company || undefined,
    companyLinkedIn: card.companyUrl,
    source: 'LinkedIn',
    locations,
    countryHints: [],
    workTypeHints: query.workTypes.length === 1 && !TITLE_WORK_TYPE.test(card.title) ? [query.workTypes[0]] : [],
    employmentType: detail?.employmentType,
    seniorityHint: SENIORITY_LEVELS[detail?.seniorityLevel?.toLowerCase() ?? ''],
    salary: card.salary,
    postedAt: card.postedAt,
    description: detail?.description,
    snippet: detail?.description ? undefined : [card.company, card.location].filter(Boolean).join(' · '),
    enrichedBy: 'linkedin',
  };
}
