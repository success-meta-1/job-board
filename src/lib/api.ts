import { canonicalLinkedInUrl, parseLinkedInSearchUrl } from '@/shared/linkedin';
import { planQueries, sanitizeRequest } from '@/shared/run';
import { DIRECT_BOARDS, SEARCH_SOURCES } from '@/shared/sources';
import type { AppConfig, AtsId, CompanyBoard, ExportFile, JobStatus, JobWithState, LinkedInSearch, RunProgress, RunRequest, ServerConfig } from '@/shared/types';
import { cancelRun, getRun, startRun } from './runner';
import { store } from './store';

const ATS_IDS: AtsId[] = ['greenhouse', 'lever', 'ashby', 'workable', 'smartrecruiters', 'recruitee'];

let serverConfig: Promise<ServerConfig> | null = null;

function loadServerConfig(): Promise<ServerConfig> {
  serverConfig ??= fetch('/api/config')
    .then(async (res) => {
      if (!res.ok) throw new Error(`Could not load /api/config (${res.status})`);
      return (await res.json()) as ServerConfig;
    })
    .catch((err) => {
      serverConfig = null;
      throw err;
    });
  return serverConfig;
}

/** Same surface as the old REST client; data lives in IndexedDB and only fetching goes through `/api/*`. */
export const api = {
  async config(): Promise<AppConfig> {
    serverConfig = null;
    const [server, boards, linkedinSearches] = await Promise.all([loadServerConfig(), store.listBoards(), store.listLinkedInSearches()]);
    return { ...server, sources: SEARCH_SOURCES, directBoards: DIRECT_BOARDS, boards, linkedinSearches };
  },
  jobs: (): Promise<JobWithState[]> => store.listJobs(),
  setStatus: (id: string, status: JobStatus) => store.setStatus(id, status),
  clearJobs: async () => ({ removed: await store.clearJobs() }),
  plan: async (req: RunRequest) => ({ queries: planQueries(sanitizeRequest(req)).map((q) => q.query) }),
  startRun: async (req: RunRequest): Promise<RunProgress> => startRun(sanitizeRequest(req), (await loadServerConfig()).provider),
  async run(id: string): Promise<RunProgress> {
    const run = await getRun(id);
    if (!run) throw new Error('Run not found');
    return run;
  },
  runs: () => store.listRuns(),
  cancelRun: async (id: string) => ({ ok: cancelRun(id) }),
  async addBoard(ats: AtsId, slug: string): Promise<CompanyBoard[]> {
    const clean = slug.trim();
    if (!ATS_IDS.includes(ats) || !/^[\w.-]+$/.test(clean)) throw new Error('Invalid board');
    return store.addBoard(ats, clean, 'manual');
  },
  removeBoard: (ats: AtsId, slug: string) => store.removeBoard(ats, slug),
  async addLinkedIn(label: string, url: string): Promise<LinkedInSearch[]> {
    const query = parseLinkedInSearchUrl(url);
    if (!query) throw new Error('Paste a LinkedIn job search URL, e.g. https://www.linkedin.com/jobs/search/?keywords=…&geoId=…');
    const name = label.trim() || query.location || query.keywords || 'LinkedIn search';
    return store.addLinkedInSearch(name.slice(0, 60), canonicalLinkedInUrl(query));
  },
  updateLinkedIn(id: string, patch: { enabled?: boolean; label?: string }): Promise<LinkedInSearch[]> {
    const clean: Partial<LinkedInSearch> = {};
    if (typeof patch.enabled === 'boolean') clean.enabled = patch.enabled;
    if (patch.label?.trim()) clean.label = patch.label.trim().slice(0, 60);
    return store.updateLinkedInSearch(id, clean);
  },
  removeLinkedIn: (id: string) => store.removeLinkedInSearch(id),
  exportData: (): Promise<ExportFile> => store.exportAll(),
  importData: (file: ExportFile) => store.importAll(file),
};
