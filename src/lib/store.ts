import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { companyKey } from '@/shared/company';
import { linkedInSearchKey } from '@/shared/linkedin';
import { SEED_BOARDS, SEED_LINKEDIN_SEARCHES } from '@/shared/sources';
import type {
  AtsId,
  CompanyBoard,
  CompanyRecord,
  ExportFile,
  Job,
  JobStatus,
  JobWithState,
  LinkedInSearch,
  RunProgress,
} from '@/shared/types';

type JobState = { id: string; status: JobStatus; updatedAt: string };
type CompanyRow = CompanyRecord & { key: string };

interface Meta {
  boards: CompanyBoard[];
  linkedin: LinkedInSearch[];
  runs: RunProgress[];
  seeded: boolean;
  linkedinSeeded: boolean;
}

interface RadarDB extends DBSchema {
  jobs: { key: string; value: Job };
  states: { key: string; value: JobState };
  companies: { key: string; value: CompanyRow };
  meta: { key: keyof Meta; value: Meta[keyof Meta] };
}

const ENRICH_RANK: Record<Job['enrichedBy'], number> = { 'search-snippet': 0, 'json-ld': 1, linkedin: 1, 'ats-api': 2 };
const MAX_RUNS = 25;

let dbPromise: Promise<IDBPDatabase<RadarDB>> | null = null;

function db(): Promise<IDBPDatabase<RadarDB>> {
  dbPromise ??= openDB<RadarDB>('job-radar', 1, {
    upgrade(d) {
      d.createObjectStore('jobs', { keyPath: 'id' });
      d.createObjectStore('states', { keyPath: 'id' });
      d.createObjectStore('companies', { keyPath: 'key' });
      d.createObjectStore('meta');
    },
  }).then(async (d) => {
    await initialize(d);
    return d;
  });
  return dbPromise;
}

/** Seeds boards and LinkedIn searches once, and closes runs left "running" by a closed tab. */
async function initialize(d: IDBPDatabase<RadarDB>) {
  const tx = d.transaction('meta', 'readwrite');
  const now = new Date().toISOString();
  if (!(await tx.store.get('seeded'))) {
    const boards = ((await tx.store.get('boards')) as CompanyBoard[] | undefined) ?? [];
    boards.push(...SEED_BOARDS.map((b) => ({ ...b, origin: 'seed' as const, addedAt: now })));
    await tx.store.put(boards, 'boards');
    await tx.store.put(true, 'seeded');
  }
  const searches = ((await tx.store.get('linkedin')) as LinkedInSearch[] | undefined) ?? [];
  if (!(await tx.store.get('linkedinSeeded'))) {
    searches.push(...SEED_LINKEDIN_SEARCHES.map((s) => ({ ...s, id: shortId(), enabled: true, addedAt: now })));
    await tx.store.put(true, 'linkedinSeeded');
  }
  const unique = uniqueSearches(searches);
  if (unique.length !== searches.length || !(await tx.store.get('linkedin'))) await tx.store.put(unique, 'linkedin');
  const runs = ((await tx.store.get('runs')) as RunProgress[] | undefined) ?? [];
  if (runs.some((r) => r.status === 'running')) {
    for (const run of runs) {
      if (run.status === 'running') Object.assign(run, { status: 'cancelled', finishedAt: run.finishedAt ?? now });
    }
    await tx.store.put(runs, 'runs');
  }
  await tx.done;
}

const shortId = () => crypto.randomUUID().slice(0, 8);

/** Keeps the first entry for each distinct search. */
function uniqueSearches(list: LinkedInSearch[]): LinkedInSearch[] {
  const seen = new Set<string>();
  return list.filter((s) => {
    const key = linkedInSearchKey(s.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getMeta<K extends keyof Meta>(key: K, fallback: Meta[K]): Promise<Meta[K]> {
  return (((await (await db()).get('meta', key)) as Meta[K] | undefined) ?? fallback);
}

/** Read-modify-write of one meta entry inside a single transaction, so concurrent updates don't overwrite each other. */
async function updateMeta<K extends keyof Meta>(key: K, fallback: Meta[K], update: (value: Meta[K]) => Meta[K]): Promise<Meta[K]> {
  const tx = (await db()).transaction('meta', 'readwrite');
  const next = update(((await tx.store.get(key)) as Meta[K] | undefined) ?? fallback);
  await tx.store.put(next, key);
  await tx.done;
  return next;
}

export const store = {
  async listJobs(): Promise<JobWithState[]> {
    const d = await db();
    const [jobs, states, companies] = await Promise.all([d.getAll('jobs'), d.getAll('states'), d.getAll('companies')]);
    const stateById = new Map(states.map((s) => [s.id, s]));
    const profileByKey = new Map(companies.map((c) => [c.key, c.profile]));
    return jobs.map((job) => {
      const state = stateById.get(job.id);
      return { ...job, status: state?.status ?? 'new', statusUpdatedAt: state?.updatedAt, companyInfo: profileByKey.get(companyKey(job.company)) };
    });
  },

  async getJob(id: string): Promise<Job | undefined> {
    return (await db()).get('jobs', id);
  },

  /** Inserts or merges a job; richer enrichment replaces poorer data. */
  async upsertJob(job: Job): Promise<'added' | 'updated'> {
    const tx = (await db()).transaction('jobs', 'readwrite');
    const existing = await tx.store.get(job.id);
    if (!existing) {
      await tx.store.put(job);
      await tx.done;
      return 'added';
    }
    const queries = [...new Set([...existing.queries, ...job.queries])].slice(-5);
    const base = ENRICH_RANK[job.enrichedBy] >= ENRICH_RANK[existing.enrichedBy] ? job : existing;
    await tx.store.put({ ...base, firstSeenAt: existing.firstSeenAt, lastSeenAt: job.lastSeenAt, queries });
    await tx.done;
    return 'updated';
  },

  async setStatus(id: string, status: JobStatus): Promise<void> {
    const d = await db();
    if (status === 'new') await d.delete('states', id);
    else await d.put('states', { id, status, updatedAt: new Date().toISOString() });
  },

  /** Deletes jobs the user hasn't saved or applied to. */
  async clearJobs(): Promise<number> {
    const tx = (await db()).transaction(['jobs', 'states'], 'readwrite');
    const jobs = tx.objectStore('jobs');
    const states = tx.objectStore('states');
    let removed = 0;
    for (const id of await jobs.getAllKeys()) {
      const status = (await states.get(id))?.status;
      if (status === 'saved' || status === 'applied') continue;
      await jobs.delete(id);
      await states.delete(id);
      removed++;
    }
    await tx.done;
    return removed;
  },

  async getCompany(key: string): Promise<CompanyRecord | undefined> {
    return (await db()).get('companies', key);
  },

  async listCompanies(): Promise<Map<string, CompanyRecord>> {
    return new Map((await (await db()).getAll('companies')).map(({ key, ...record }) => [key, record]));
  },

  async setCompany(key: string, record: CompanyRecord): Promise<void> {
    await (await db()).put('companies', { ...record, key });
  },

  listBoards: () => getMeta('boards', []),

  addBoard(ats: AtsId, slug: string, origin: CompanyBoard['origin'], name?: string): Promise<CompanyBoard[]> {
    const normalized = slug.trim();
    return updateMeta('boards', [], (boards) =>
      !normalized || boards.some((b) => b.ats === ats && b.slug.toLowerCase() === normalized.toLowerCase())
        ? boards
        : [...boards, { ats, slug: normalized, origin, name, addedAt: new Date().toISOString() }],
    );
  },

  updateBoard(ats: AtsId, slug: string, patch: Partial<CompanyBoard>): Promise<CompanyBoard[]> {
    return updateMeta('boards', [], (boards) => boards.map((b) => (b.ats === ats && b.slug === slug ? { ...b, ...patch } : b)));
  },

  removeBoard(ats: AtsId, slug: string): Promise<CompanyBoard[]> {
    return updateMeta('boards', [], (boards) => boards.filter((b) => !(b.ats === ats && b.slug === slug)));
  },

  listLinkedInSearches: () => getMeta('linkedin', []),

  addLinkedInSearch(label: string, url: string): Promise<LinkedInSearch[]> {
    const key = linkedInSearchKey(url);
    return updateMeta('linkedin', [], (list) =>
      list.some((s) => linkedInSearchKey(s.url) === key) ? list : [...list, { id: shortId(), label, url, enabled: true, addedAt: new Date().toISOString() }],
    );
  },

  updateLinkedInSearch(id: string, patch: Partial<LinkedInSearch>): Promise<LinkedInSearch[]> {
    return updateMeta('linkedin', [], (list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  },

  removeLinkedInSearch(id: string): Promise<LinkedInSearch[]> {
    return updateMeta('linkedin', [], (list) => list.filter((s) => s.id !== id));
  },

  listRuns: () => getMeta('runs', []),

  async saveRun(run: RunProgress): Promise<void> {
    await updateMeta('runs', [], (runs) => [structuredClone(run), ...runs.filter((r) => r.id !== run.id)].slice(0, MAX_RUNS));
  },

  async exportAll(): Promise<ExportFile> {
    const d = await db();
    const [jobs, states, companies, boards, linkedin] = await Promise.all([
      d.getAll('jobs'),
      d.getAll('states'),
      d.getAll('companies'),
      getMeta('boards', []),
      getMeta('linkedin', []),
    ]);
    return {
      app: 'job-radar',
      version: 1,
      exportedAt: new Date().toISOString(),
      jobs,
      states: Object.fromEntries(states.map(({ id, ...s }) => [id, s])),
      companies: Object.fromEntries(companies.map(({ key, ...c }) => [key, c])),
      boards,
      linkedin,
    };
  },

  /** Merges an export into the current data: jobs merge like a run, boards and searches are added if missing. */
  async importAll(file: ExportFile): Promise<{ jobs: number; companies: number; boards: number; linkedin: number }> {
    if (file?.app !== 'job-radar' || !Array.isArray(file.jobs)) throw new Error('Not a Job Radar export file');
    let jobs = 0;
    for (const job of file.jobs) {
      if (job?.id && job.title) {
        await store.upsertJob(job);
        jobs++;
      }
    }
    const d = await db();
    const stateTx = d.transaction('states', 'readwrite');
    for (const [id, s] of Object.entries(file.states ?? {})) await stateTx.store.put({ id, status: s.status, updatedAt: s.updatedAt });
    await stateTx.done;

    const companyTx = d.transaction('companies', 'readwrite');
    let companies = 0;
    for (const [key, record] of Object.entries(file.companies ?? {})) {
      const current = await companyTx.store.get(key);
      if (current?.profile && !record.profile) continue;
      await companyTx.store.put({ ...record, key });
      companies++;
    }
    await companyTx.done;

    const beforeBoards = (await store.listBoards()).length;
    const boards = await updateMeta('boards', [], (list) => {
      const seen = new Set(list.map((b) => `${b.ats}:${b.slug.toLowerCase()}`));
      return [...list, ...(file.boards ?? []).filter((b) => !seen.has(`${b.ats}:${b.slug.toLowerCase()}`))];
    });
    const beforeLinkedIn = (await store.listLinkedInSearches()).length;
    const linkedin = await updateMeta('linkedin', [], (list) => uniqueSearches([...list, ...(file.linkedin ?? [])]));
    return { jobs, companies, boards: boards.length - beforeBoards, linkedin: Math.max(0, linkedin.length - beforeLinkedIn) };
  },
};
