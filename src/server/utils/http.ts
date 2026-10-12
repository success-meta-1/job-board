const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

export class HttpError extends Error {
  constructor(
    public status: number,
    public url: string,
    message?: string,
  ) {
    super(message ?? `HTTP ${status} for ${url}`);
  }
}

async function request(url: string, init: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9', ...init.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new HttpError(res.status, url, `HTTP ${res.status} for ${url}${body ? `: ${body.slice(0, 200)}` : ''}`);
  }
  return res;
}

export async function getJson<T = any>(url: string, init: RequestInit = {}, timeoutMs?: number): Promise<T> {
  const res = await request(url, { ...init, headers: { Accept: 'application/json', ...init.headers } }, timeoutMs);
  return (await res.json()) as T;
}

export async function getText(url: string, init: RequestInit = {}, timeoutMs?: number): Promise<{ text: string; finalUrl: string }> {
  const res = await request(url, { ...init, headers: { Accept: 'text/html,application/xhtml+xml', ...init.headers } }, timeoutMs);
  const type = res.headers.get('content-type') ?? '';
  if (type && !/html|xml|text/i.test(type)) throw new Error(`Unsupported content-type ${type}`);
  const text = await res.text();
  return { text: text.slice(0, 3_000_000), finalUrl: res.url || url };
}

/** Runs `fn` over `items` with at most `limit` in flight. Stops scheduling once `shouldStop` returns true. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  shouldStop: () => boolean = () => false,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length && !shouldStop()) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
