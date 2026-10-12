import { parseLinkedInSearchUrl } from '@/shared/linkedin';
import { searchLinkedIn } from '@/server/enrich/linkedin';
import { errorResponse, json, readBody } from '@/server/route';

export const maxDuration = 60;

/** Runs one saved LinkedIn search through the public (logged-out) job search. */
export async function POST(request: Request) {
  const body = await readBody<{ url: string }>(request);
  const query = parseLinkedInSearchUrl(String(body.url ?? ''));
  if (!query) return json({ error: 'Invalid LinkedIn search URL' }, 400);
  try {
    return json({ cards: await searchLinkedIn(query, () => request.signal.aborted) });
  } catch (err) {
    return errorResponse(err);
  }
}
