import type { ProviderInfo, TimeRange } from '@/shared/types';
import { TIME_RANGE_TBS } from '@/shared/query';
import { config } from '../config';
import { getJson } from '../utils/http';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  /** Relative or absolute date shown by the search engine, e.g. "3 days ago" */
  date?: string;
}

export interface SearchParams {
  query: string;
  page: number;
  timeRange: TimeRange;
}

interface SearchProvider extends ProviderInfo {
  search(params: SearchParams): Promise<SearchResult[]>;
}

const serper: SearchProvider = {
  id: 'serper',
  label: 'Serper (Google)',
  configured: !!config.serperKey,
  async search({ query, page, timeRange }) {
    const data = await getJson('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': config.serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 10, page, ...(TIME_RANGE_TBS[timeRange] && { tbs: TIME_RANGE_TBS[timeRange] }) }),
    });
    return (data.organic ?? []).map((r: any) => ({ title: r.title, url: r.link, snippet: r.snippet ?? '', date: r.date }));
  },
};

const serpapi: SearchProvider = {
  id: 'serpapi',
  label: 'SerpAPI (Google)',
  configured: !!config.serpapiKey,
  async search({ query, page, timeRange }) {
    const params = new URLSearchParams({ engine: 'google', q: query, num: '10', start: String((page - 1) * 10), api_key: config.serpapiKey });
    const tbs = TIME_RANGE_TBS[timeRange];
    if (tbs) params.set('tbs', tbs);
    const data = await getJson(`https://serpapi.com/search.json?${params}`);
    if (data.error && !/hasn't returned any results/i.test(data.error)) throw new Error(`SerpAPI: ${data.error}`);
    return (data.organic_results ?? []).map((r: any) => ({ title: r.title, url: r.link, snippet: r.snippet ?? '', date: r.date }));
  },
};

const CSE_DATE: Record<TimeRange, string | undefined> = { '24h': 'd1', week: 'w1', month: 'm1', any: undefined };

const googleCse: SearchProvider = {
  id: 'google-cse',
  label: 'Google Programmable Search',
  configured: !!(config.googleCseKey && config.googleCseCx),
  async search({ query, page, timeRange }) {
    const params = new URLSearchParams({ key: config.googleCseKey, cx: config.googleCseCx, q: query, num: '10', start: String((page - 1) * 10 + 1) });
    if (CSE_DATE[timeRange]) params.set('dateRestrict', CSE_DATE[timeRange]!);
    const data = await getJson(`https://www.googleapis.com/customsearch/v1?${params}`);
    return (data.items ?? []).map((r: any) => ({ title: r.title, url: r.link, snippet: r.snippet ?? '' }));
  },
};

const BRAVE_FRESHNESS: Record<TimeRange, string | undefined> = { '24h': 'pd', week: 'pw', month: 'pm', any: undefined };

const brave: SearchProvider = {
  id: 'brave',
  label: 'Brave Search',
  configured: !!config.braveKey,
  async search({ query, page, timeRange }) {
    const params = new URLSearchParams({ q: query, count: '20', offset: String(page - 1) });
    if (BRAVE_FRESHNESS[timeRange]) params.set('freshness', BRAVE_FRESHNESS[timeRange]!);
    const data = await getJson(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: { 'X-Subscription-Token': config.braveKey },
    });
    return (data.web?.results ?? []).map((r: any) => ({ title: r.title, url: r.url, snippet: r.description ?? '', date: r.age ?? r.page_age }));
  },
};

export const PROVIDERS: SearchProvider[] = [serper, serpapi, googleCse, brave];

export function activeProvider(): SearchProvider | null {
  if (config.searchProvider) {
    const chosen = PROVIDERS.find((p) => p.id === config.searchProvider);
    if (chosen?.configured) return chosen;
  }
  return PROVIDERS.find((p) => p.configured) ?? null;
}

export const providerInfo = (p: SearchProvider): ProviderInfo => ({ id: p.id, label: p.label, configured: p.configured });
