import { sanitizeRequest } from '@/shared/run';
import type { AtsId, RunRequest } from '@/shared/types';
import { normalizeJob } from '@/server/classify';
import { classifyLocation } from '@/server/classify/location';
import { ATS_LABELS, boardCache, fetchBoard } from '@/server/enrich/ats';
import { matchesRequest } from '@/server/match';
import { errorResponse, json, readBody } from '@/server/route';

export const maxDuration = 60;

const MAX_JOBS_PER_BOARD = 100;

/** Fetches every open job on one company board and returns those matching the run's filters. */
export async function POST(request: Request) {
  const body = await readBody<{ board: { ats: AtsId; slug: string; eu?: boolean }; request: RunRequest }>(request);
  const board = body.board;
  if (!board || !(board.ats in ATS_LABELS) || !/^[\w.-]+$/.test(String(board.slug ?? ''))) return json({ error: 'Invalid board' }, 400);
  const req = sanitizeRequest(body.request ?? {});
  try {
    const { name, jobs } = await fetchBoard({ ats: board.ats, slug: board.slug, eu: !!board.eu }, boardCache);
    const now = new Date().toISOString();
    const target = req.location ? classifyLocation({ raw: [req.location] }) : null;
    const matching = jobs
      .map((raw) => normalizeJob(raw, { sourceGroup: 'Company boards', query: `${board.ats}:${board.slug}`, now }))
      .filter((job) => matchesRequest(job, req, target))
      .sort((a, b) => (b.postedAt ?? '').localeCompare(a.postedAt ?? ''))
      .slice(0, MAX_JOBS_PER_BOARD);
    return json({ name, total: jobs.length, jobs: matching });
  } catch (err) {
    return errorResponse(err);
  }
}
