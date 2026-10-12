import { AlertTriangle, ExternalLink, Loader2, Play, Plus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AppConfig, AtsId, CompanyBoard, LinkedInSearch, RunProgress, RunRequest, SourceGroup, TimeRange, WorkType } from '@/shared/types';
import { buildQuery, googleSearchUrl } from '@/shared/query';
import { api } from '@/lib/api';
import { relativeTime } from '@/lib/format';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { LinkedInSearches } from './LinkedInSearches';
import { Checkbox, cx, Segmented } from './ui';

interface Props {
  config: AppConfig;
  onClose: () => void;
  onStarted: (run: RunProgress) => void;
  onBoardsChange: (boards: CompanyBoard[]) => void;
  onLinkedInChange: (searches: LinkedInSearch[]) => void;
}

const GROUPS: { id: SourceGroup; label: string; hint: string }[] = [
  { id: 'ATS', label: 'ATS platforms', hint: 'Greenhouse, Lever, Ashby, Workable…' },
  { id: 'Careers', label: 'Company /careers pages', hint: 'site:*.com/careers, careers.*.io…' },
  { id: 'Career', label: 'Company /career pages', hint: 'site:*.com/career, career.*.de…' },
  { id: 'Other', label: 'Other', hint: 'Notion pages, inurl:hiring' },
];

const SUGGESTED_KEYWORDS = ['react', 'frontend', '"full stack"', 'node', 'python', 'typescript', 'devops', '"software engineer"'];
const ATS_OPTIONS: { id: AtsId; label: string }[] = [
  { id: 'greenhouse', label: 'Greenhouse' },
  { id: 'lever', label: 'Lever' },
  { id: 'ashby', label: 'Ashby' },
  { id: 'workable', label: 'Workable' },
  { id: 'smartrecruiters', label: 'SmartRecruiters' },
  { id: 'recruitee', label: 'Recruitee' },
];

export const DEFAULT_REQUEST: RunRequest = {
  sourceIds: ['greenhouse', 'lever', 'ashby', 'workable', 'smartrecruiters', 'recruitee'],
  keywords: [],
  workType: 'remote',
  location: '',
  timeRange: '24h',
  pagesPerQuery: 1,
  scanBoards: true,
  scanLinkedIn: true,
};

export function SearchPanel({ config, onClose, onStarted, onBoardsChange, onLinkedInChange }: Props) {
  const [form, setForm] = useLocalStorage<RunRequest>('jr.searchForm', DEFAULT_REQUEST);
  const [keywordInput, setKeywordInput] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boardAts, setBoardAts] = useState<AtsId>('greenhouse');
  const [boardSlug, setBoardSlug] = useState('');
  const [boardFilter, setBoardFilter] = useState('');

  const set = <K extends keyof RunRequest>(key: K, value: RunRequest[K]) => setForm({ ...form, [key]: value });
  const hasProvider = !!config.provider;

  const addKeyword = (raw: string) => {
    const k = raw.trim().replace(/,$/, '');
    if (k && !form.keywords.includes(k)) set('keywords', [...form.keywords, k]);
    setKeywordInput('');
  };

  const queryCount = hasProvider ? form.sourceIds.length * Math.max(1, form.keywords.length) : 0;
  const maxCalls = queryCount * form.pagesPerQuery;
  const linkedinCount = form.scanLinkedIn ? config.linkedinSearches.filter((s) => s.enabled).length : 0;
  const extras = [form.scanBoards && `${config.boards.length} board scans`, linkedinCount && `${linkedinCount} LinkedIn searches`].filter(Boolean).join(' + ');
  const sampleKeyword = form.keywords[0];

  const toggleSource = (id: string) => set('sourceIds', form.sourceIds.includes(id) ? form.sourceIds.filter((s) => s !== id) : [...form.sourceIds, id]);
  const toggleGroup = (group: SourceGroup) => {
    const ids = config.sources.filter((s) => s.group === group).map((s) => s.id);
    const allOn = ids.every((id) => form.sourceIds.includes(id));
    set('sourceIds', allOn ? form.sourceIds.filter((id) => !ids.includes(id)) : [...new Set([...form.sourceIds, ...ids])]);
  };

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      const keywords = keywordInput.trim() ? [...form.keywords, keywordInput.trim()] : form.keywords;
      const run = await api.startRun({ ...form, keywords });
      if (keywordInput.trim()) addKeyword(keywordInput);
      onStarted(run);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  const addBoard = async () => {
    const slug = boardSlug.trim().replace(/^https?:\/\/[^/]+\//, '').split(/[/?#]/)[0];
    if (!slug) return;
    try {
      onBoardsChange(await api.addBoard(boardAts, slug));
      setBoardSlug('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const boards = useMemo(
    () =>
      config.boards
        .filter((b) => `${b.ats} ${b.slug} ${b.name ?? ''}`.toLowerCase().includes(boardFilter.toLowerCase()))
        .sort((a, b) => a.ats.localeCompare(b.ats) || a.slug.localeCompare(b.slug)),
    [config.boards, boardFilter],
  );

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 md:p-8" onClick={onClose}>
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Search className="size-5 text-indigo-600" /> New job search
            </h2>
            <p className="text-sm text-slate-500">Runs your saved LinkedIn and Google searches, opens every result, and classifies the jobs.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="size-5" />
          </button>
        </div>

        {!hasProvider && (
          <div className="mx-6 mt-4 flex gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <strong>No Google search API key configured.</strong> Add <code className="rounded bg-amber-100 px-1">SERPER_API_KEY</code> (or SerpAPI / Brave) to{' '}
              <code className="rounded bg-amber-100 px-1">.env</code> and restart the server to enable automated Google searches. LinkedIn searches and company board
              scans work without a key; use the “Google ↗” links to open bookmark searches manually.
            </div>
          </div>
        )}

        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1.15fr]">
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Keywords (role / stack)</label>
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 p-1.5 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                {form.keywords.map((k) => (
                  <span key={k} className="inline-flex items-center gap-1 rounded-md bg-indigo-50 py-0.5 pr-1 pl-2 text-sm text-indigo-700">
                    {k}
                    <button onClick={() => set('keywords', form.keywords.filter((x) => x !== k))} className="rounded hover:bg-indigo-100">
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
                <input
                  value={keywordInput}
                  onChange={(e) => (e.target.value.endsWith(',') ? addKeyword(e.target.value) : setKeywordInput(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addKeyword(keywordInput);
                    if (e.key === 'Backspace' && !keywordInput && form.keywords.length) set('keywords', form.keywords.slice(0, -1));
                  }}
                  placeholder={form.keywords.length ? 'Add another…' : 'e.g. react, "frontend engineer" — Enter to add'}
                  className="min-w-40 flex-1 px-1 py-0.5 text-sm outline-none"
                />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {SUGGESTED_KEYWORDS.filter((k) => !form.keywords.includes(k)).map((k) => (
                  <button key={k} onClick={() => addKeyword(k)} className="rounded-full px-2 py-0.5 text-xs text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-800">
                    + {k}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-400">Each keyword becomes its own query per source. Leave empty to run the bookmarks as saved.</p>
            </div>

            <div className="flex flex-wrap gap-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Work type</label>
                <Segmented<WorkType | 'any'>
                  value={form.workType}
                  onChange={(v) => set('workType', v)}
                  options={[
                    { value: 'remote', label: 'Remote' },
                    { value: 'hybrid', label: 'Hybrid' },
                    { value: 'onsite', label: 'On-site' },
                    { value: 'any', label: 'Any' },
                  ]}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Posted within</label>
                <Segmented<TimeRange>
                  value={form.timeRange}
                  onChange={(v) => set('timeRange', v)}
                  options={[
                    { value: '24h', label: '24h' },
                    { value: 'week', label: 'Week' },
                    { value: 'month', label: 'Month' },
                    { value: 'any', label: 'Any' },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Location (optional)</label>
                <input
                  value={form.location ?? ''}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder="e.g. United States, Europe, Germany"
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Pages / query</label>
                <Segmented<string>
                  value={String(form.pagesPerQuery)}
                  onChange={(v) => set('pagesPerQuery', Number(v))}
                  options={['1', '2', '3'].map((v) => ({ value: v, label: v }))}
                />
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <label className="flex cursor-pointer items-start gap-2.5">
                <Checkbox checked={form.scanBoards} onChange={() => set('scanBoards', !form.scanBoards)} className="mt-1" />
                <span>
                  <span className="block text-sm font-medium text-slate-800">Also scan saved company boards ({config.boards.length})</span>
                  <span className="block text-xs text-slate-500">
                    Free and keyless — reads Greenhouse / Lever / Ashby / Workable / SmartRecruiters / Recruitee boards directly and keeps jobs matching your keywords, work
                    type, location and date. Boards found via Google are added automatically.
                  </span>
                </span>
              </label>

              <div className="mt-3 flex gap-2">
                <select value={boardAts} onChange={(e) => setBoardAts(e.target.value as AtsId)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm">
                  {ATS_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input
                  value={boardSlug}
                  onChange={(e) => setBoardSlug(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addBoard()}
                  placeholder="company slug, e.g. stripe"
                  className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-indigo-400"
                />
                <button onClick={addBoard} className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">
                  <Plus className="size-3.5" /> Add
                </button>
              </div>
              <input
                value={boardFilter}
                onChange={(e) => setBoardFilter(e.target.value)}
                placeholder="Filter boards…"
                className="mt-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-400"
              />
              <ul className="scroll-thin mt-2 max-h-44 space-y-0.5 overflow-y-auto">
                {boards.map((b) => (
                  <li key={`${b.ats}:${b.slug}`} className="group flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-white">
                    <span className="w-24 shrink-0 text-slate-400">{ATS_OPTIONS.find((o) => o.id === b.ats)?.label}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{b.name ?? b.slug}</span>
                    {b.error ? (
                      <span className="truncate text-rose-500" title={b.error}>
                        error
                      </span>
                    ) : b.lastScannedAt ? (
                      <span className="text-slate-400" title={`Scanned ${relativeTime(b.lastScannedAt)}`}>
                        {b.lastJobCount} jobs
                      </span>
                    ) : (
                      <span className="text-slate-300">not scanned</span>
                    )}
                    <span className={cx('rounded px-1 text-[10px]', b.origin === 'discovered' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400')}>{b.origin}</span>
                    <button
                      onClick={async () => onBoardsChange(await api.removeBoard(b.ats, b.slug))}
                      className="text-slate-300 opacity-0 group-hover:opacity-100 hover:text-rose-500"
                      title="Remove board"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <LinkedInSearches
              searches={config.linkedinSearches}
              enabled={form.scanLinkedIn}
              onToggleEnabled={() => set('scanLinkedIn', !form.scanLinkedIn)}
              onChange={onLinkedInChange}
              onError={setError}
            />
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Google search sources (from your bookmarks)</label>
              <span className="text-xs text-slate-400">{form.sourceIds.length} selected</span>
            </div>
            <div className="scroll-thin max-h-[30rem] space-y-3 overflow-y-auto rounded-xl ring-1 ring-slate-200">
              {GROUPS.map((g) => {
                const sources = config.sources.filter((s) => s.group === g.id);
                const on = sources.filter((s) => form.sourceIds.includes(s.id)).length;
                return (
                  <div key={g.id}>
                    <label className="sticky top-0 z-[1] flex cursor-pointer items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                      <Checkbox checked={on === sources.length} indeterminate={on > 0} onChange={() => toggleGroup(g.id)} />
                      <span className="text-sm font-semibold text-slate-700">{g.label}</span>
                      <span className="flex-1 truncate text-xs text-slate-400">{g.hint}</span>
                      <span className="text-xs tabular-nums text-slate-400">
                        {on}/{sources.length}
                      </span>
                    </label>
                    <ul>
                      {sources.map((s) => {
                        const query = buildQuery({ source: s, keyword: sampleKeyword, workType: form.workType, location: form.location });
                        return (
                          <li key={s.id} className="flex items-center gap-2 px-3 py-1 hover:bg-slate-50">
                            <Checkbox checked={form.sourceIds.includes(s.id)} onChange={() => toggleSource(s.id)} />
                            <span className="w-32 shrink-0 truncate text-sm text-slate-700" onClick={() => toggleSource(s.id)}>
                              {s.label}
                            </span>
                            <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-400" title={query}>
                              {s.operator}
                            </code>
                            <a
                              href={googleSearchUrl(query, form.timeRange)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex shrink-0 items-center gap-0.5 text-xs text-indigo-600 hover:text-indigo-800"
                              title={`Open in Google: ${query}`}
                            >
                              Google <ExternalLink className="size-3" />
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="min-w-0 flex-1 text-sm text-slate-600">
            {hasProvider ? (
              <>
                <strong>{queryCount}</strong> queries × up to {form.pagesPerQuery} page{form.pagesPerQuery > 1 ? 's' : ''} = <strong>≤ {maxCalls}</strong> {config.provider!.label} calls
                {extras && <> + {extras}</>}
              </>
            ) : (
              <>Google search disabled · {extras ? `will run ${extras}` : 'enable LinkedIn searches or board scanning to run'}</>
            )}
            {error && <div className="mt-1 text-rose-600">{error}</div>}
          </div>
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
            Cancel
          </button>
          <button
            onClick={start}
            disabled={starting || (!queryCount && !form.scanBoards && !linkedinCount)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {starting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            Run search
          </button>
        </div>
      </div>
    </div>
  );
}
