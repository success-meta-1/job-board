import { parseLinkedInSearchUrl } from '@/shared/linkedin';
import { normalizeJob } from '@/server/classify';
import { fetchLinkedInDetail, linkedInRawJob, type LinkedInCard, type LinkedInDetail } from '@/server/enrich/linkedin';
import { json, readBody } from '@/server/route';
import { HttpError } from '@/server/utils/http';

export const maxDuration = 60;

/** Builds a job from a LinkedIn search card, adding the description unless LinkedIn is throttling. */
export async function POST(request: Request) {
  const body = await readBody<{ card: LinkedInCard; url: string; tag: string; skipDetail: boolean }>(request);
  const card = body.card;
  const query = parseLinkedInSearchUrl(String(body.url ?? ''));
  if (!card || !/^\d+$/.test(String(card.id)) || !card.title || !query) return json({ error: 'Invalid LinkedIn job' }, 400);

  let detail: LinkedInDetail | undefined;
  let throttled = false;
  if (!body.skipDetail) {
    try {
      detail = await fetchLinkedInDetail(card.id);
    } catch (err) {
      throttled = err instanceof HttpError && err.status === 429;
    }
  }
  const job = normalizeJob(linkedInRawJob(card, detail, query), { sourceGroup: 'LinkedIn', query: body.tag, now: new Date().toISOString() });
  return json({ job, throttled });
}
