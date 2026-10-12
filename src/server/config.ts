import 'server-only';

const env = (name: string) => process.env[name]?.trim() || '';

/** Read lazily so `.env.local` edits apply after a dev-server restart without stale module state. */
export const config = {
  get searchProvider() {
    return env('SEARCH_PROVIDER').toLowerCase();
  },
  get serperKey() {
    return env('SERPER_API_KEY');
  },
  get serpapiKey() {
    return env('SERPAPI_API_KEY');
  },
  get googleCseKey() {
    return env('GOOGLE_CSE_API_KEY');
  },
  get googleCseCx() {
    return env('GOOGLE_CSE_CX');
  },
  get braveKey() {
    return env('BRAVE_API_KEY');
  },
};
