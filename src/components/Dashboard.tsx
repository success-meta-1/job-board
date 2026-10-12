'use client';

import { Compass, Download, Loader2, RefreshCw, Search, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppConfig, CountryInfo, ExportFile, JobStatus, JobWithState, RegionId } from '@/shared/types';
import { api } from '@/lib/api';
import { activeFilterCount, applyFilters, DEFAULT_FILTERS, sortJobs, type Filters, type GroupKey, type SortKey, type StatusView } from '@/lib/filters';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { FilterSidebar } from './FilterSidebar';
import { JobDrawer } from './JobDrawer';
import { JobList } from './JobList';
import { RunPanel } from './RunPanel';
import { SearchPanel } from './SearchPanel';
import { StatsBar } from './StatsBar';
import { cx, Segmented } from './ui';

const STATUS_TABS: { value: StatusView; label: string }[] = [
  { value: 'active', label: 'All active' },
  { value: 'new', label: 'New' },
  { value: 'saved', label: 'Saved' },
  { value: 'applied', label: 'Applied' },
  { value: 'hidden', label: 'Hidden' },
];

export default function Dashboard() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [jobs, setJobs] = useState<JobWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useLocalStorage<Filters>('jr.filters', DEFAULT_FILTERS);
  const [sort, setSort] = useLocalStorage<SortKey>('jr.sort', 'posted');
  const [group, setGroup] = useLocalStorage<GroupKey>('jr.group', 'none');
  const [runId, setRunId] = useLocalStorage<string | null>('jr.activeRun', null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [applyToast, setApplyToast] = useState<JobWithState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const loadJobs = useCallback(async () => {
    setJobs(await api.jobs());
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [cfg, list] = await Promise.all([api.config(), api.jobs()]);
      setConfig(cfg);
      setJobs(list);
    } catch (err: any) {
      setLoadError(err.message ?? 'Could not load the dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!applyToast) return;
    const t = setTimeout(() => setApplyToast(null), 9000);
    return () => clearTimeout(t);
  }, [applyToast]);

  const countries = useMemo(() => new Map<string, CountryInfo>((config?.countries ?? []).map((c) => [c.code, c])), [config]);
  const regionOf = useCallback((code: string): RegionId | undefined => countries.get(code)?.region, [countries]);
  const regionLabel = useCallback((id: RegionId) => config?.regions.find((r) => r.id === id)?.label ?? id, [config]);

  const visible = useMemo(() => sortJobs(applyFilters(jobs, filters, regionOf), sort), [jobs, filters, regionOf, sort]);
  const statusCounts = useMemo(() => {
    const base = applyFilters(jobs, filters, regionOf, 'status');
    return {
      active: base.filter((j) => j.status !== 'hidden').length,
      new: base.filter((j) => j.status === 'new').length,
      saved: base.filter((j) => j.status === 'saved').length,
      applied: base.filter((j) => j.status === 'applied').length,
      hidden: base.filter((j) => j.status === 'hidden').length,
      all: base.length,
    };
  }, [jobs, filters, regionOf]);

  const setStatus = useCallback(async (job: JobWithState, status: JobStatus) => {
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status, statusUpdatedAt: new Date().toISOString() } : j)));
    try {
      await api.setStatus(job.id, status);
    } catch {
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: job.status } : j)));
    }
  }, []);

  const onApply = useCallback((job: JobWithState) => {
    if (job.status !== 'applied') setApplyToast(job);
  }, []);

  const clearJobs = async () => {
    if (!confirm('Remove all jobs except saved and applied ones?')) return;
    await api.clearJobs();
    await loadJobs();
  };

  const exportData = async () => {
    const data = await api.exportData();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `job-radar-export-${data.exportedAt.slice(0, 10)}.json` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = await api.importData(JSON.parse(await file.text()) as ExportFile);
      setNotice(
        `Imported ${result.jobs.toLocaleString()} jobs, ${result.companies.toLocaleString()} company profiles, ${result.boards} new boards and ${result.linkedin} new LinkedIn searches.`,
      );
      await loadAll();
    } catch (err: any) {
      setNotice(`Import failed: ${err.message ?? err}`);
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(t);
  }, [notice]);

  const openJob = jobs.find((j) => j.id === openJobId) ?? null;

  if (loading && !config) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-slate-500">
        <Loader2 className="size-5 animate-spin" /> Loading dashboard…
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-semibold text-slate-700">Couldn’t load the dashboard</p>
        <p className="max-w-md text-sm text-slate-500">
          {loadError}. Make sure the app runs with <code className="rounded bg-slate-200 px-1">npm run dev</code> and the browser allows site storage (IndexedDB).
        </p>
        <button onClick={loadAll} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-5 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Compass className="size-5" />
          </div>
          <div>
            <h1 className="text-base leading-tight font-bold text-slate-900">Job Radar</h1>
            <p className="text-[11px] text-slate-500">Google job research → one dashboard</p>
          </div>
        </div>
        <div className="flex-1" />
        <span
          className={cx(
            'hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 sm:inline-flex',
            config.provider ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200',
          )}
          title={config.provider ? 'Search provider configured in .env.local' : 'Add a search API key to .env.local to enable Google searches'}
        >
          <span className={cx('size-1.5 rounded-full', config.provider ? 'bg-emerald-500' : 'bg-amber-500')} />
          {config.provider ? config.provider.label : 'No search API key'}
        </span>
        <button onClick={loadAll} title="Reload" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          <RefreshCw className={cx('size-4', loading && 'animate-spin')} />
        </button>
        <button onClick={exportData} title="Export all data to a JSON file" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          <Download className="size-4" />
        </button>
        <button onClick={() => importRef.current?.click()} title="Import a Job Radar JSON export" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          <Upload className="size-4" />
        </button>
        <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => importData(e.target.files?.[0])} />
        <button onClick={clearJobs} title="Clear jobs (keeps saved & applied)" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600">
          <Trash2 className="size-4" />
        </button>
        <button
          onClick={() => setSearchOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <Search className="size-4" /> New search
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <FilterSidebar jobs={jobs} filters={filters} setFilters={setFilters} config={config} countries={countries} regionOf={regionOf} />

        <main className="scroll-thin min-w-0 flex-1 overflow-y-auto">
          <div className="space-y-4 p-5">
            {jobs.length === 0 ? (
              <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-slate-200">
                <Compass className="mx-auto size-12 text-indigo-500" />
                <h2 className="mt-3 text-xl font-semibold text-slate-900">No jobs yet</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                  Run a search: your bookmarked Google queries are executed, every result is opened and parsed (ATS APIs or JobPosting metadata), then classified by
                  country, region, work type, role, seniority and tech stack.
                </p>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  <Search className="size-4" /> Run your first search
                </button>
                <button
                  onClick={() => importRef.current?.click()}
                  className="mt-5 ml-2 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  <Upload className="size-4" /> Import data
                </button>
              </div>
            ) : (
              <>
                <StatsBar all={jobs} visible={visible} filters={filters} setFilters={setFilters} countries={countries} regionLabel={regionLabel} />

                <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                  <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-2.5">
                    <div className="flex gap-1">
                      {STATUS_TABS.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setFilters({ ...filters, status: t.value })}
                          className={cx(
                            'rounded-md px-2.5 py-1 text-sm font-medium',
                            filters.status === t.value ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
                          )}
                        >
                          {t.label} <span className="text-xs tabular-nums opacity-60">{statusCounts[t.value]}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex-1" />
                    {activeFilterCount(filters) > 0 && (
                      <button onClick={() => setFilters({ ...DEFAULT_FILTERS, status: filters.status })} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
                        Clear {activeFilterCount(filters)} filter{activeFilterCount(filters) > 1 ? 's' : ''}
                      </button>
                    )}
                    <label className="flex items-center gap-1.5 text-xs text-slate-500">
                      Group
                      <Segmented<GroupKey>
                        size="sm"
                        value={group}
                        onChange={setGroup}
                        options={[
                          { value: 'none', label: 'None' },
                          { value: 'company', label: 'Company' },
                          { value: 'location', label: 'Region › Country' },
                          { value: 'role', label: 'Role' },
                          { value: 'source', label: 'Source' },
                        ]}
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500">
                      Sort
                      <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                        <option value="posted">Newest posted</option>
                        <option value="firstSeen">Recently found</option>
                        <option value="expires">Expiring soonest</option>
                        <option value="company">Company A–Z</option>
                        <option value="title">Title A–Z</option>
                      </select>
                    </label>
                  </div>
                  <JobList
                    jobs={visible}
                    groupBy={group}
                    countries={countries}
                    regionLabel={regionLabel}
                    onOpen={(j) => setOpenJobId(j.id)}
                    onStatus={setStatus}
                    onApply={onApply}
                  />
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {searchOpen && (
        <SearchPanel
          config={config}
          onClose={() => setSearchOpen(false)}
          onBoardsChange={(boards) => setConfig({ ...config, boards })}
          onLinkedInChange={(linkedinSearches) => setConfig({ ...config, linkedinSearches })}
          onStarted={(run) => {
            setRunId(run.id);
            setSearchOpen(false);
          }}
        />
      )}

      {runId && (
        <RunPanel
          runId={runId}
          onProgress={() => loadJobs()}
          onFinished={() => {
            loadJobs();
            api.config().then(setConfig).catch(() => {});
          }}
          onDismiss={() => setRunId(null)}
        />
      )}

      {openJob && (
        <JobDrawer job={openJob} countries={countries} regionLabel={regionLabel} onClose={() => setOpenJobId(null)} onStatus={setStatus} onApply={onApply} />
      )}

      {notice && (
        <div className="fixed top-16 left-1/2 z-50 flex max-w-lg -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-xs text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {applyToast && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl">
          <span className="max-w-xs truncate">
            Applied to <strong>{applyToast.title}</strong>?
          </span>
          <button
            onClick={() => {
              setStatus(applyToast, 'applied');
              setApplyToast(null);
            }}
            className="rounded-md bg-teal-500 px-2.5 py-1 text-xs font-semibold hover:bg-teal-400"
          >
            Mark applied
          </button>
          <button onClick={() => setApplyToast(null)} className="text-xs text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
