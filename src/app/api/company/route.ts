import { fetchCompanyProfile, linkedInCompanyUrl, LinkedInBlockedError } from '@/server/enrich/company';
import { errorResponse, json, readBody } from '@/server/route';

export const maxDuration = 60;

/** Looks up a company's public LinkedIn page (members, size, founding year). */
export async function POST(request: Request) {
  const body = await readBody<{ company: string; companyLinkedIn: string }>(request);
  const company = String(body.company ?? '').trim();
  if (!company) return json({ error: 'Missing company' }, 400);
  const companyLinkedIn = typeof body.companyLinkedIn === 'string' ? linkedInCompanyUrl(body.companyLinkedIn) : undefined;
  try {
    const profile = await fetchCompanyProfile({ company, companyLinkedIn });
    return json({ profile });
  } catch (err) {
    if (err instanceof LinkedInBlockedError) return json({ blocked: true, error: err.message }, 429);
    return errorResponse(err);
  }
}
