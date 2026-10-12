import { cleanText, htmlToText } from '../utils/html';
import { getText } from '../utils/http';
import type { RawJob } from './types';

const asArray = <T>(v: T | T[] | undefined | null): T[] => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);

const isJobPosting = (node: any) => asArray(node?.['@type']).some((t) => String(t).toLowerCase() === 'jobposting');

function findJobPostings(node: any, out: any[] = []): any[] {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach((n) => findJobPostings(n, out));
    return out;
  }
  if (isJobPosting(node)) out.push(node);
  if (node['@graph']) findJobPostings(node['@graph'], out);
  return out;
}

function parseLdBlocks(html: string): any[] {
  const blocks = [...html.matchAll(/<script[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)];
  const postings: any[] = [];
  for (const [, body] of blocks) {
    const text = body.trim().replace(/^<!\[CDATA\[|\]\]>$/g, '');
    try {
      findJobPostings(JSON.parse(text), postings);
    } catch {
      try {
        // Some sites embed raw newlines/control chars inside JSON strings.
        findJobPostings(JSON.parse(text.replace(/[\u0000-\u001f]+/g, ' ')), postings);
      } catch {
        /* not valid JSON-LD */
      }
    }
  }
  return postings;
}

const toIso = (v: unknown) => {
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
};

const textOf = (v: any): string | undefined => (typeof v === 'string' ? v : v?.name ?? v?.['@value']);

function formatSalary(base: any): string | undefined {
  if (!base) return undefined;
  const value = base.value ?? {};
  const min = Number(value.minValue ?? value.value ?? (typeof value === 'number' ? value : NaN));
  const max = Number(value.maxValue ?? NaN);
  if (!Number.isFinite(min) && !Number.isFinite(max)) return undefined;
  const fmt = (n: number) => n.toLocaleString('en-US');
  const range = Number.isFinite(min) && Number.isFinite(max) && min !== max ? `${fmt(min)}–${fmt(max)}` : fmt(Number.isFinite(min) ? min : max);
  const unit = value.unitText ?? base.unitText;
  return [base.currency, range, unit && `/ ${String(unit).toLowerCase()}`].filter(Boolean).join(' ');
}

/** Extracts a schema.org JobPosting from any page (used by Google for Jobs, so most ATSs publish it). */
export async function fetchJsonLdJob(url: string, key: string, source: string): Promise<RawJob | null> {
  const { text: html, finalUrl } = await getText(url);
  const posting = parseLdBlocks(html)[0];
  if (!posting) return null;

  const places = asArray(posting.jobLocation);
  const addresses = places.map((p: any) => p?.address ?? p).map((a: any) => (typeof a === 'string' ? { addressLocality: a } : a ?? {}));
  const applicantReqs = asArray(posting.applicantLocationRequirements).map(textOf).filter(Boolean) as string[];
  const remote = asArray(posting.jobLocationType).some((t) => /telecommute/i.test(String(t)));

  const locations = addresses
    .map((a: any) => [textOf(a.addressLocality), textOf(a.addressRegion), textOf(a.addressCountry)].filter(Boolean).join(', '))
    .filter(Boolean);
  if (remote && applicantReqs.length) locations.push(...applicantReqs.map((r) => `Remote (${r})`));

  return {
    key,
    url: cleanText(posting.url) || finalUrl,
    title: cleanText(posting.title),
    company: cleanText(textOf(posting.hiringOrganization)),
    source,
    locations,
    countryHints: [...addresses.map((a: any) => textOf(a.addressCountry)), ...applicantReqs].filter(Boolean) as string[],
    workTypeHints: [remote ? 'remote' : undefined],
    employmentType: asArray(posting.employmentType).map(String).join(', ').replace(/_/g, ' ').toLowerCase() || undefined,
    salary: formatSalary(posting.baseSalary ?? posting.estimatedSalary),
    postedAt: toIso(posting.datePosted),
    expiresAt: toIso(posting.validThrough),
    description: htmlToText(posting.description),
    enrichedBy: 'json-ld',
  };
}
