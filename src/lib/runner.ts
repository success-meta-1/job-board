import { companyKey } from '@/shared/company';
import { planQueries } from '@/shared/run';
import { canonicalUrl } from '@/shared/url';
import type { AtsId, CompanyProfile, Job, ProviderInfo, RunProgress, RunRequest, SearchSource } from '@/shared/types';
import { store } from './store';

const SEARCH_CONCURRENCY = 3;
const ENRICH_CONCURRENCY = 6;
const BOARD_CONCURRENCY = 4;
const LINKEDIN_DETAIL_CONCURRENCY = 2;
const MAX_COMPANIES_PER_RUN = 400;
const COMPANY_CONCURRENCY = 2;
/** Companies whose page couldn't be found are retried after this long. */
const COMPANY_RETRY_MS = 7 * 864e5;
const NO_MATCH = 'no matching LinkedIn page';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  date?: string;
}

interface LinkedInCard {
  id: string;
  title: string;
  company: string;
  companyUrl?: string;
  location: string;
}

interface BoardRef {
  ats: AtsId;
  slug: string;
  eu?: boolean;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  return data as T;
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>, shouldStop: () => boolean) {
  let next = 0;
  const worker = async () => {
    while (next < items.length && !shouldStop()) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

interface ActiveRun {
  progress: RunProgress;
  cancelled: boolean;
  abort: AbortController;
}

const active = new Map<string, ActiveRun>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if ([...active.values()].some((r) => r.progress.status === 'running')) e.preventDefault();
  });
}

export async function startRun(req: RunRequest, provider: ProviderInfo | null): Promise<RunProgress> {
  const queries = provider ? planQueries(req) : [];
  const linkedin = req.scanLinkedIn ? (await store.listLinkedInSearches()).filter((s) => s.enabled) : [];
  if (!queries.length && !req.scanBoards && !linkedin.length) {
    throw new Error(
      provider
        ? 'Select at least one search source.'
        : 'No search provider configured. Add an API key to .env.local, or enable LinkedIn searches / company board scanning.',
    );
  }
  const progress: RunProgress = {
    id: crypto.randomUUID(),
    status: 'running',
    startedAt: new Date().toISOString(),
    provider: provider?.label,
    request: req,
    totalQueries: queries.length,
    doneQueries: 0,
    resultsFound: 0,
    candidates: 0,
    enriched: 0,
    added: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    log: [],
  };
  const run: ActiveRun = { progress, cancelled: false, abort: new AbortController() };
  active.set(progress.id, run);
  await store.saveRun(progress);
  execute(run, queries).catch((err) => {
    if (!run.cancelled) {
      progress.status = 'error';
      progress.errors.push(String(err?.message ?? err));
    }
    return finish(run);
  });
  return structuredClone(progress);
}

/** Returns a snapshot so React sees a new object on every poll. */
export async function getRun(id: string): Promise<RunProgress | undefined> {
  const run = active.get(id)?.progress ?? (await store.listRuns()).find((r) => r.id === id);
  return run && structuredClone(run);
}

export function cancelRun(id: string): boolean {
  const run = active.get(id);
  if (!run || run.progress.status !== 'running') return false;
  run.cancelled = true;
  run.abort.abort();
  return true;
}

function log(run: ActiveRun, message: string) {
  run.progress.log.push(`${new Date().toLocaleTimeString('en-GB')}  ${message}`);
  if (run.progress.log.length > 300) run.progress.log.splice(0, run.progress.log.length - 300);
}

function error(run: ActiveRun, message: string) {
  if (run.progress.errors.length < 60) run.progress.errors.push(message);
  log(run, `⚠ ${message}`);
}

async function finish(run: ActiveRun) {
  if (run.progress.status === 'running') run.progress.status = run.cancelled ? 'cancelled' : 'done';
  run.progress.finishedAt = new Date().toISOString();
  await store.saveRun(run.progress);
  setTimeout(() => active.delete(run.progress.id), 60_000);
}

async function record(run: ActiveRun, job: Job) {
  const result = await store.upsertJob(job);
  run.progress[result === 'added' ? 'added' : 'updated']++;
}

const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';

async function execute(run: ActiveRun, queries: { query: string; source: SearchSource }[]) {
  const { progress } = run;
  const req = progress.request;
  const stop = () => run.cancelled;
  const signal = run.abort.signal;

  // 1. Google search through the configured provider (server route holds the API key)
  const candidates = new Map<string, { result: SearchResult; source: SearchSource; query: string }>();
  let authFailed = false;
  if (queries.length) {
    log(run, `Searching ${queries.length} queries via ${progress.provider}…`);
    await mapLimit(
      queries,
      SEARCH_CONCURRENCY,
      async ({ query, source }) => {
        for (let page = 1; page <= req.pagesPerQuery && !stop() && !authFailed; page++) {
          try {
            const { results } = await post<{ results: SearchResult[] }>('/api/search', { query, page, timeRange: req.timeRange }, signal);
            progress.resultsFound += results.length;
            for (const result of results) {
              if (!result.url) continue;
              const key = canonicalUrl(result.url);
              if (!candidates.has(key)) candidates.set(key, { result, source, query });
            }
            if (results.length < 10) break;
          } catch (err: any) {
            if (isAbort(err)) break;
            if (err instanceof ApiError && [401, 402, 403].includes(err.status)) {
              authFailed = true;
              error(run, `Search provider rejected the request (HTTP ${err.status}). Check your API key / quota.`);
            } else {
              error(run, `Search failed for "${query}": ${err.message}`);
            }
            break;
          }
        }
        progress.doneQueries++;
        progress.candidates = candidates.size;
      },
      () => stop() || authFailed,
    );
    log(run, `Search finished: ${progress.resultsFound} results, ${candidates.size} unique URLs.`);
  }

  // 2. Enrich every unique URL with full job details
  const rootBoards = new Map<string, BoardRef>();
  if (candidates.size && !stop()) {
    log(run, `Fetching job details for ${candidates.size} URLs…`);
    await mapLimit(
      [...candidates.values()],
      ENRICH_CONCURRENCY,
      async ({ result, source, query }) => {
        try {
          const outcome = await post<{ job?: Job; board?: BoardRef; boardRoot?: boolean }>(
            '/api/enrich',
            { result, sourceGroup: source.group, query },
            signal,
          );
          if (outcome.board) await store.addBoard(outcome.board.ats, outcome.board.slug, 'discovered');
          if (outcome.boardRoot && outcome.board) rootBoards.set(`${outcome.board.ats}:${outcome.board.slug}`, outcome.board);
          if (outcome.job) {
            await record(run, outcome.job);
            progress.enriched++;
          } else {
            progress.skipped++;
          }
        } catch (err: any) {
          if (isAbort(err)) return;
          progress.skipped++;
          error(run, `Could not process ${result.url}: ${err.message}`);
        }
      },
      stop,
    );
  }

  // 3. Saved LinkedIn searches (each keeps the filters from its URL)
  const linkedin = req.scanLinkedIn ? (await store.listLinkedInSearches()).filter((s) => s.enabled) : [];
  if (linkedin.length && !stop()) {
    log(run, `Running ${linkedin.length} LinkedIn searches…`);
    const found = new Map<string, { card: LinkedInCard; url: string; tag: string }>();
    for (const search of linkedin) {
      if (stop()) break;
      try {
        const { cards } = await post<{ cards: LinkedInCard[] }>('/api/linkedin/search', { url: search.url }, signal);
        progress.resultsFound += cards.length;
        cards.forEach((card) => found.has(card.id) || found.set(card.id, { card, url: search.url, tag: `LinkedIn · ${search.label}` }));
        await store.updateLinkedInSearch(search.id, { lastScannedAt: new Date().toISOString(), lastJobCount: cards.length, error: undefined });
        log(run, `LinkedIn · ${search.label}: ${cards.length} jobs`);
      } catch (err: any) {
        if (isAbort(err)) break;
        await store.updateLinkedInSearch(search.id, { lastScannedAt: new Date().toISOString(), error: err.message });
        error(run, `LinkedIn search "${search.label}" failed: ${err.message}`);
      }
    }
    progress.candidates += found.size;

    log(run, `Fetching LinkedIn job details for ${found.size} jobs…`);
    let throttled = false;
    await mapLimit(
      [...found.values()],
      LINKEDIN_DETAIL_CONCURRENCY,
      async ({ card, url, tag }) => {
        const now = new Date().toISOString();
        const existing = await store.getJob(`linkedin:${card.id}`);
        if (existing?.description) {
          await record(run, { ...existing, companyLinkedIn: existing.companyLinkedIn ?? card.companyUrl, lastSeenAt: now, queries: [tag] });
          return;
        }
        try {
          const res = await post<{ job: Job; throttled: boolean }>('/api/linkedin/job', { card, url, tag, skipDetail: throttled }, signal);
          if (res.throttled && !throttled) {
            throttled = true;
            error(run, 'LinkedIn is rate-limiting detail requests; remaining jobs are saved without descriptions.');
          }
          await record(run, res.job);
          progress.enriched++;
        } catch (err: any) {
          if (isAbort(err)) return;
          progress.skipped++;
          error(run, `LinkedIn job ${card.id} failed: ${err.message}`);
        }
      },
      stop,
    );
  }

  // 4. Scan company boards (saved watchlist and/or boards discovered in this run)
  const boards = new Map(rootBoards);
  if (req.scanBoards) (await store.listBoards()).forEach((b) => boards.set(`${b.ats}:${b.slug}`, b));
  if (boards.size && !stop()) {
    log(run, `Scanning ${boards.size} company boards…`);
    await mapLimit(
      [...boards.values()],
      BOARD_CONCURRENCY,
      async (board) => {
        try {
          const { name, total, jobs } = await post<{ name: string; total: number; jobs: Job[] }>(
            '/api/board',
            { board: { ats: board.ats, slug: board.slug, eu: board.eu }, request: req },
            signal,
          );
          for (const job of jobs) await record(run, job);
          progress.enriched += jobs.length;
          await store.updateBoard(board.ats, board.slug, { name, lastScannedAt: new Date().toISOString(), lastJobCount: total, error: undefined });
          log(run, `${name}: ${jobs.length} matching of ${total} open jobs`);
        } catch (err: any) {
          if (isAbort(err)) return;
          await store.updateBoard(board.ats, board.slug, { error: err.message, lastScannedAt: new Date().toISOString() });
          error(run, `Board ${board.ats}/${board.slug} failed: ${err.message}`);
        }
      },
      stop,
    );
  }

  // 5. Company profiles (members, founding year) for every company without one yet
  if (!stop()) await enrichCompanies(run);

  log(run, run.cancelled ? 'Run cancelled.' : `Done: ${progress.added} new, ${progress.updated} updated, ${progress.skipped} skipped.`);
  await finish(run);
}

async function enrichCompanies(run: ActiveRun) {
  const [jobs, companies] = await Promise.all([store.listJobs(), store.listCompanies()]);
  const pending = new Map<string, Job>();
  for (const job of jobs) {
    const key = companyKey(job.company);
    if (!key || job.company === 'Unknown company') continue;
    const existing = companies.get(key);
    if (existing?.profile) continue;
    const linkNowKnown = !!job.companyLinkedIn && existing?.error === NO_MATCH;
    if (existing && Date.now() - Date.parse(existing.fetchedAt) < COMPANY_RETRY_MS && !linkNowKnown) continue;
    // Prefer a job that links straight to the company page.
    if (!pending.has(key) || (job.companyLinkedIn && !pending.get(key)!.companyLinkedIn)) pending.set(key, job);
  }
  if (!pending.size) return;

  const queue = [...pending].slice(0, MAX_COMPANIES_PER_RUN);
  log(run, `Looking up ${queue.length} company profiles on LinkedIn…`);
  let blocked = false;
  let found = 0;
  await mapLimit(
    queue,
    COMPANY_CONCURRENCY,
    async ([key, job]) => {
      try {
        const { profile } = await post<{ profile?: CompanyProfile }>(
          '/api/company',
          { company: job.company, companyLinkedIn: job.companyLinkedIn },
          run.abort.signal,
        );
        const err = profile ? undefined : job.companyLinkedIn ? 'LinkedIn page not found' : NO_MATCH;
        await store.setCompany(key, { profile, fetchedAt: new Date().toISOString(), error: err });
        if (profile) found++;
      } catch (err: any) {
        if (isAbort(err)) return;
        if (err instanceof ApiError && err.status === 429) {
          if (!blocked) error(run, `${err.message}; the remaining companies will be looked up next run.`);
          blocked = true;
        } else {
          await store.setCompany(key, { fetchedAt: new Date().toISOString(), error: err.message });
        }
      }
    },
    () => run.cancelled || blocked,
  );
  log(run, `Company profiles: ${found} found of ${queue.length} looked up${pending.size > queue.length ? ` (${pending.size - queue.length} left for next run)` : ''}.`);
}
