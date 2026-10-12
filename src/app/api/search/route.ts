import type { TimeRange } from '@/shared/types';
import { errorResponse, json, readBody } from '@/server/route';
import { activeProvider } from '@/server/search/providers';

export const maxDuration = 30;

export async function POST(request: Request) {
  const body = await readBody<{ query: string; page: number; timeRange: TimeRange }>(request);
  const provider = activeProvider();
  if (!provider) return json({ error: 'No search provider configured. Add an API key to .env.local.' }, 400);
  const query = String(body.query ?? '').trim();
  if (!query) return json({ error: 'Missing query' }, 400);
  const timeRange = (['24h', 'week', 'month', 'any'] as const).includes(body.timeRange as TimeRange) ? body.timeRange! : '24h';
  const page = Math.min(10, Math.max(1, Number(body.page) || 1));
  try {
    return json({ results: await provider.search({ query, page, timeRange }) });
  } catch (err) {
    return errorResponse(err);
  }
}
