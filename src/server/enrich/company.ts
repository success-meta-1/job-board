import { companyKey } from '@/shared/company';
import type { CompanyProfile, Job } from '@/shared/types';
import { cleanText } from '../utils/html';
import { getText, HttpError } from '../utils/http';

export class LinkedInBlockedError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Normalizes any linkedin.com/company/<slug>… link to https://www.linkedin.com/company/<slug>. */
export function linkedInCompanyUrl(href: string | undefined): string | undefined {
  const slug = href?.match(/linkedin\.com\/company\/([^/?#"]+)/i)?.[1];
  return slug ? `https://www.linkedin.com/company/${slug}` : undefined;
}

function aboutField(html: string, field: string): string | undefined {
  const value = html.match(new RegExp(`about-us__${field}"[\\s\\S]*?<dd[^>]*>([\\s\\S]*?)</dd>`))?.[1];
  return value ? cleanText(value.replace(/<[^>]+>/g, ' ')) || undefined : undefined;
}

function findOrganization(node: unknown): Record<string, any> | undefined {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findOrganization(item);
      if (found) return found;
    }
    return undefined;
  }
  const obj = node as Record<string, any>;
  if (obj['@type'] === 'Organization' && typeof obj.url === 'string' && obj.url.includes('/company/')) return obj;
  return findOrganization(obj['@graph']);
}

export function parseCompanyPage(html: string, url: string): CompanyProfile | undefined {
  let org: Record<string, any> | undefined;
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      org = findOrganization(JSON.parse(m[1]));
    } catch {
      continue;
    }
    if (org) break;
  }
  const name = cleanText(org?.name) || cleanText(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, ' '));
  if (!name) return undefined;
  const viewAll = html.match(/View all ([\d,]+) employees/)?.[1];
  const members = Number(org?.numberOfEmployees?.value ?? viewAll?.replace(/,/g, ''));
  const founded = Number(aboutField(html, 'foundedOn')?.match(/\d{4}/)?.[0]);
  return {
    name,
    linkedinUrl: url,
    members: Number.isFinite(members) && members > 0 ? members : undefined,
    sizeRange: aboutField(html, 'size'),
    founded: founded > 1800 ? founded : undefined,
    industry: aboutField(html, 'industry'),
  };
}

async function fetchCompanyPage(url: string, attempt = 0): Promise<CompanyProfile | undefined> {
  try {
    const { text, finalUrl } = await getText(url, {}, 20_000);
    if (/authwall|\/login|checkpoint/.test(finalUrl)) throw new LinkedInBlockedError('LinkedIn asked for sign-in');
    return parseCompanyPage(text, url);
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) return undefined;
    if (err instanceof HttpError && (err.status === 429 || err.status === 999)) {
      if (attempt < 1) {
        await sleep(6000);
        return fetchCompanyPage(url, attempt + 1);
      }
      throw new LinkedInBlockedError(`LinkedIn is rate-limiting company pages (HTTP ${err.status})`);
    }
    throw err;
  }
}

/**
 * Guessing linkedin.com/company/<name> often hits a namesake (e.g. a small firm called "Anthropic"),
 * so look for LinkedIn job cards posted under exactly this name and use the page they link to.
 */
async function findCompanyUrlViaJobs(name: string): Promise<string | undefined> {
  const params = new URLSearchParams({ keywords: `"${name}"` });
  let html: string;
  try {
    html = (await getText(`https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`, {}, 20_000)).text;
  } catch (err) {
    if (err instanceof HttpError && (err.status === 429 || err.status === 999)) throw new LinkedInBlockedError(`LinkedIn is rate-limiting searches (HTTP ${err.status})`);
    if (err instanceof HttpError && err.status === 400) return undefined;
    throw err;
  }
  const key = companyKey(name);
  const votes = new Map<string, number>();
  for (const m of html.matchAll(/base-search-card__subtitle"[^>]*>[\s\S]*?href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const url = linkedInCompanyUrl(m[1]);
    if (url && companyKey(cleanText(m[2])) === key) votes.set(url, (votes.get(url) ?? 0) + 1);
  }
  return [...votes].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/** Jobs from LinkedIn link to the company page directly; other sources are matched by company name. */
export async function fetchCompanyProfile(job: Pick<Job, 'company' | 'companyLinkedIn'>): Promise<CompanyProfile | undefined> {
  const url = job.companyLinkedIn ?? (await findCompanyUrlViaJobs(job.company));
  if (!url) return undefined;
  if (!job.companyLinkedIn) await sleep(500);
  return fetchCompanyPage(url);
}
