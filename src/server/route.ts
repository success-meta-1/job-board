import 'server-only';
import { HttpError } from './utils/http';

export const json = (body: unknown, status = 200) => Response.json(body, { status });

export async function readBody<T>(request: Request): Promise<Partial<T>> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

/** Upstream failures surface as 502 except auth/quota/rate errors, which keep their status for the client. */
export function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const status = err instanceof HttpError && [401, 402, 403, 429].includes(err.status) ? err.status : 502;
  return json({ error: message }, status);
}
