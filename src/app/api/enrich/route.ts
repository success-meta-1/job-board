import type { Job } from '@/shared/types';
import { normalizeJob } from '@/server/classify';
import { boardCache } from '@/server/enrich/ats';
import { enrichSearchResult } from '@/server/enrich';
import { errorResponse, json, readBody } from '@/server/route';
import type { SearchResult } from '@/server/search/providers';

export const maxDuration = 60;

/** Turns one search result into a full job (ATS API, then JSON-LD, then the search snippet). */
export async function POST(request: Request) {
  const body = await readBody<{ result: SearchResult; sourceGroup: Job['sourceGroup']; query: string }>(request);
  const result = body.result;
  if (!result || typeof result.url !== 'string' || !/^https?:\/\//i.test(result.url)) return json({ error: 'Invalid result' }, 400);
  try {
    const outcome = await enrichSearchResult(
      { title: String(result.title ?? ''), url: result.url, snippet: String(result.snippet ?? ''), date: result.date },
      boardCache,
    );
    const job = outcome.job
      ? normalizeJob(outcome.job, { sourceGroup: body.sourceGroup ?? 'Other', query: body.query, now: new Date().toISOString() })
      : undefined;
    return json({ job, board: outcome.board, boardRoot: outcome.boardRoot, gone: outcome.gone });
  } catch (err) {
    return errorResponse(err);
  }
}
