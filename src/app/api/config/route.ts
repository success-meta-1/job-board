import { COUNTRIES, REGIONS } from '@/server/classify/geo-data';
import { json } from '@/server/route';
import { activeProvider, PROVIDERS, providerInfo } from '@/server/search/providers';

export const dynamic = 'force-dynamic';

export function GET() {
  const provider = activeProvider();
  return json({
    provider: provider ? providerInfo(provider) : null,
    providers: PROVIDERS.map(providerInfo),
    regions: REGIONS,
    countries: COUNTRIES.map(({ code, name, region }) => ({ code, name, region })),
  });
}
