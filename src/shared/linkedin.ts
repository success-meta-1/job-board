import type { WorkType } from './types';

/** LinkedIn's `f_WT` codes. */
export const LINKEDIN_WORK_TYPES: Record<string, WorkType> = { '1': 'onsite', '2': 'remote', '3': 'hybrid' };

const KEPT_PARAMS = /^(?:keywords|geoId|location|distance|sortBy|f_\w+)$/;

export interface LinkedInQuery {
  keywords: string;
  geoId?: string;
  location?: string;
  workTypes: WorkType[];
  /** From `f_TPR=r<seconds>` */
  postedWithinSeconds?: number;
  /** Only the parameters that affect results, ready for the guest search API */
  params: URLSearchParams;
}

/** Parses a linkedin.com/jobs/search URL; returns null for anything else. */
export function parseLinkedInSearchUrl(url: string): LinkedInQuery | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (!/(^|\.)linkedin\.com$/i.test(u.hostname) || !u.pathname.startsWith('/jobs')) return null;
  const params = new URLSearchParams();
  u.searchParams.forEach((value, key) => {
    if (KEPT_PARAMS.test(key) && value) params.set(key, value);
  });
  if (!params.get('keywords') && !params.get('geoId') && !params.get('location')) return null;
  const tpr = params.get('f_TPR')?.match(/^r(\d+)$/)?.[1];
  return {
    keywords: params.get('keywords') ?? '',
    geoId: params.get('geoId') ?? undefined,
    location: params.get('location') ?? undefined,
    workTypes: (params.get('f_WT') ?? '')
      .split(',')
      .map((code) => LINKEDIN_WORK_TYPES[code])
      .filter(Boolean),
    postedWithinSeconds: tpr ? Number(tpr) : undefined,
    params,
  };
}

/** Canonical search URL containing only the parameters that matter. */
export function canonicalLinkedInUrl(query: LinkedInQuery): string {
  return `https://www.linkedin.com/jobs/search/?${query.params.toString()}`;
}

/** Identifies a search regardless of parameter order or `+`/`%20` encoding. */
export function linkedInSearchKey(url: string): string {
  const params = parseLinkedInSearchUrl(url)?.params;
  if (!params) return url;
  params.sort();
  return params.toString();
}

export function describePostedWithin(seconds: number | undefined): string {
  if (!seconds) return 'any time';
  if (seconds <= 86400) return 'past 24h';
  if (seconds <= 604800) return 'past week';
  if (seconds <= 2592000) return 'past month';
  return `past ${Math.round(seconds / 86400)} days`;
}
