import { buildQuery } from './query';
import { SEARCH_SOURCES } from './sources';
import type { RunRequest, SearchSource, TimeRange } from './types';

export const RANGE_MS: Record<TimeRange, number> = { '24h': 864e5, week: 7 * 864e5, month: 31 * 864e5, any: Infinity };

export function sanitizeRequest(body: Partial<RunRequest>): RunRequest {
  const validIds = new Set(SEARCH_SOURCES.map((s) => s.id));
  const keywords = [...new Set((body.keywords ?? []).map((k) => String(k).trim()).filter(Boolean))].slice(0, 10);
  return {
    sourceIds: (body.sourceIds ?? []).filter((id) => validIds.has(id)),
    keywords,
    workType: (['remote', 'hybrid', 'onsite', 'any'] as const).includes(body.workType as any) ? (body.workType as RunRequest['workType']) : 'remote',
    location: body.location?.trim() || undefined,
    timeRange: (['24h', 'week', 'month', 'any'] as const).includes(body.timeRange as any) ? (body.timeRange as TimeRange) : '24h',
    pagesPerQuery: Math.min(5, Math.max(1, Number(body.pagesPerQuery) || 1)),
    scanBoards: !!body.scanBoards,
    scanLinkedIn: !!body.scanLinkedIn,
  };
}

export function planQueries(req: RunRequest): { query: string; source: SearchSource }[] {
  const sources = SEARCH_SOURCES.filter((s) => req.sourceIds.includes(s.id));
  const keywords = req.keywords.length ? req.keywords : [undefined];
  return sources.flatMap((source) =>
    keywords.map((keyword) => ({ source, query: buildQuery({ source, keyword, workType: req.workType, location: req.location }) })),
  );
}
