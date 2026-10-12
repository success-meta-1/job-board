import type { SearchSource, TimeRange, WorkType } from './types';

const WORK_TYPE_TERMS: Record<WorkType | 'any', string> = {
  remote: 'remote',
  hybrid: 'hybrid',
  onsite: '(onsite OR "on-site")',
  unknown: '',
  any: '',
};

export const TIME_RANGE_TBS: Record<TimeRange, string | undefined> = {
  '24h': 'qdr:d',
  week: 'qdr:w',
  month: 'qdr:m',
  any: undefined,
};

const quoteIfPhrase = (s: string) => (/\s/.test(s) && !/["()]|\bOR\b/.test(s) ? `"${s}"` : s);

/** Mirrors the saved bookmark format: `<work type> <keyword> <location> <operator>`. */
export function buildQuery(opts: {
  source: Pick<SearchSource, 'operator'>;
  keyword?: string;
  workType: WorkType | 'any';
  location?: string;
}): string {
  return [WORK_TYPE_TERMS[opts.workType], opts.keyword?.trim(), opts.location?.trim() && quoteIfPhrase(opts.location.trim()), opts.source.operator]
    .filter(Boolean)
    .join(' ');
}

export function googleSearchUrl(query: string, timeRange: TimeRange): string {
  const tbs = TIME_RANGE_TBS[timeRange];
  return `https://www.google.com/search?q=${encodeURIComponent(query)}${tbs ? `&tbs=${tbs}` : ''}`;
}
