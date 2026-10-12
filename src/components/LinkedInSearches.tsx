import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { describePostedWithin, parseLinkedInSearchUrl } from '@/shared/linkedin';
import type { LinkedInSearch } from '@/shared/types';
import { api } from '@/lib/api';
import { relativeTime, WORK_TYPE_LABEL } from '@/lib/format';
import { Checkbox, cx } from './ui';

interface Props {
  searches: LinkedInSearch[];
  enabled: boolean;
  onToggleEnabled: () => void;
  onChange: (searches: LinkedInSearch[]) => void;
  onError: (message: string) => void;
}

export function LinkedInBadge({ className }: { className?: string }) {
  return <span className={cx('inline-grid size-4 place-items-center rounded-[3px] bg-[#0a66c2] text-[10px] leading-none font-bold text-white', className)}>in</span>;
}

function summary(url: string): string {
  const q = parseLinkedInSearchUrl(url);
  if (!q) return 'invalid URL';
  const workTypes = q.workTypes.map((w) => WORK_TYPE_LABEL[w]).join(' / ') || 'any work type';
  return [q.keywords && `“${q.keywords}”`, workTypes, describePostedWithin(q.postedWithinSeconds)].filter(Boolean).join(' · ');
}

export function LinkedInSearches({ searches, enabled, onToggleEnabled, onChange, onError }: Props) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const active = searches.filter((s) => s.enabled).length;

  const run = async (action: () => Promise<LinkedInSearch[]>) => {
    try {
      onChange(await action());
    } catch (err: any) {
      onError(err.message);
    }
  };

  const add = () => {
    if (!url.trim()) return;
    run(async () => {
      const list = await api.addLinkedIn(label, url);
      setLabel('');
      setUrl('');
      return list;
    });
  };

  return (
    <div className="mb-4 rounded-xl bg-sky-50/60 p-4 ring-1 ring-sky-200">
      <label className="flex cursor-pointer items-start gap-2.5">
        <Checkbox checked={enabled} onChange={onToggleEnabled} className="mt-1" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
            <LinkedInBadge /> LinkedIn searches ({active}/{searches.length})
          </span>
          <span className="block text-xs text-slate-500">
            Keyless. Each saved search runs with the filters in its URL (location, work type, date), and every job is opened for its full description.
          </span>
        </span>
      </label>

      <ul className={cx('scroll-thin mt-3 max-h-56 space-y-0.5 overflow-y-auto', !enabled && 'opacity-50')}>
        {searches.map((s) => (
          <li key={s.id} className="group flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-white">
            <Checkbox checked={s.enabled} onChange={() => run(() => api.updateLinkedIn(s.id, { enabled: !s.enabled }))} />
            <span className="w-28 shrink-0 truncate font-medium text-slate-700" title={s.label}>
              {s.label}
            </span>
            <span className="min-w-0 flex-1 truncate text-slate-400" title={s.url}>
              {summary(s.url)}
            </span>
            {s.error ? (
              <span className="max-w-24 truncate text-rose-500" title={s.error}>
                error
              </span>
            ) : s.lastScannedAt ? (
              <span className="shrink-0 text-slate-400" title={`Ran ${relativeTime(s.lastScannedAt)}`}>
                {s.lastJobCount} jobs
              </span>
            ) : (
              <span className="shrink-0 text-slate-300">not run</span>
            )}
            <a href={s.url} target="_blank" rel="noreferrer" className="shrink-0 text-[#0a66c2] hover:text-sky-900" title="Open on LinkedIn">
              <ExternalLink className="size-3.5" />
            </a>
            <button
              onClick={() => run(() => api.removeLinkedIn(s.id))}
              className="shrink-0 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-rose-500"
              title="Remove search"
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label, e.g. Japan"
          className="w-28 shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-sky-400"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Paste a linkedin.com/jobs/search URL"
          className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-sky-400"
        />
        <button onClick={add} className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">
          <Plus className="size-3.5" /> Add
        </button>
      </div>
    </div>
  );
}
