import { Bookmark, Briefcase, Building2, CheckCircle2, Clock, Home, MapPin, Shuffle, Timer } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import type { CountryInfo, JobWithState, RegionId, WorkType } from '@/shared/types';
import { countBy, type Filters } from '@/lib/filters';
import { expiryState } from '@/lib/format';
import { CountryFlag, cx } from './ui';

interface Props {
  all: JobWithState[];
  visible: JobWithState[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  countries: Map<string, CountryInfo>;
  regionLabel: (id: RegionId) => string;
}

function Card({ icon, label, value, sub, active, onClick, tone }: {
  icon: ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  active?: boolean;
  onClick?: () => void;
  tone: string;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={cx(
        'flex min-w-0 items-center gap-3 rounded-xl bg-white px-3.5 py-2.5 text-left ring-1 transition',
        active ? 'ring-2 ring-indigo-500' : 'ring-slate-200',
        onClick && 'hover:ring-slate-300',
      )}
    >
      <div className={cx('flex size-9 shrink-0 items-center justify-center rounded-lg', tone)}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xl leading-tight font-semibold tabular-nums text-slate-900">{value}</div>
        <div className="truncate text-xs text-slate-500">
          {label}
          {sub && <span className="text-slate-400"> · {sub}</span>}
        </div>
      </div>
    </Tag>
  );
}

function Bars({ title, items, onPick }: { title: string; items: { key: string; label: ReactNode; count: number; active?: boolean }[]; onPick: (key: string) => void }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="min-w-0 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{title}</h3>
      <div className="space-y-1">
        {items.map((i) => (
          <button key={i.key} onClick={() => onPick(i.key)} className="group flex w-full items-center gap-2 text-left text-xs">
            <span className={cx('flex w-32 min-w-0 shrink-0 items-center gap-1.5 truncate', i.active ? 'font-semibold text-indigo-700' : 'text-slate-600')}>{i.label}</span>
            <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <span
                className={cx('absolute inset-y-0 left-0 rounded-full transition-all', i.active ? 'bg-indigo-600' : 'bg-indigo-300 group-hover:bg-indigo-400')}
                style={{ width: `${(i.count / max) * 100}%` }}
              />
            </span>
            <span className="w-8 text-right tabular-nums text-slate-400">{i.count}</span>
          </button>
        ))}
        {!items.length && <p className="text-xs text-slate-400">No data yet.</p>}
      </div>
    </div>
  );
}

export function StatsBar({ all, visible, filters, setFilters, countries, regionLabel }: Props) {
  const stats = useMemo(() => {
    const now = Date.now();
    const work = countBy(visible, (j) => j.workType);
    return {
      work,
      fresh: visible.filter((j) => now - Date.parse(j.postedAt ?? j.firstSeenAt) < 864e5).length,
      expiring: visible.filter((j) => expiryState(j, now) === 'soon').length,
      saved: all.filter((j) => j.status === 'saved').length,
      applied: all.filter((j) => j.status === 'applied').length,
      companies: new Set(visible.map((j) => j.company)).size,
      regions: [...countBy(visible, (j) => (j.location.worldwide ? [...j.location.regions, 'ww' as const] : j.location.regions))].sort((a, b) => b[1] - a[1]),
      countries: [...countBy(visible, (j) => j.location.countries)].sort((a, b) => b[1] - a[1]).slice(0, 8),
      stacks: [...countBy(visible, (j) => j.stacks)].sort((a, b) => b[1] - a[1]).slice(0, 8),
    };
  }, [all, visible]);

  const toggleWork = (w: WorkType) =>
    setFilters({ ...filters, workTypes: filters.workTypes.length === 1 && filters.workTypes[0] === w ? [] : [w] });
  const toggleKey = <K extends 'locations' | 'stacks'>(key: K, value: string) =>
    setFilters({ ...filters, [key]: filters[key].includes(value) ? filters[key].filter((v) => v !== value) : [...filters[key], value] });
  const isOnly = (w: WorkType) => filters.workTypes.length === 1 && filters.workTypes[0] === w;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Card icon={<Briefcase className="size-4.5" />} tone="bg-indigo-50 text-indigo-600" label="Jobs in view" sub={`of ${all.length}`} value={visible.length} />
        <Card icon={<Building2 className="size-4.5" />} tone="bg-slate-100 text-slate-600" label="Companies" value={stats.companies} />
        <Card icon={<Home className="size-4.5" />} tone="bg-emerald-50 text-emerald-600" label="Remote" value={stats.work.get('remote') ?? 0} active={isOnly('remote')} onClick={() => toggleWork('remote')} />
        <Card icon={<Shuffle className="size-4.5" />} tone="bg-amber-50 text-amber-600" label="Hybrid" value={stats.work.get('hybrid') ?? 0} active={isOnly('hybrid')} onClick={() => toggleWork('hybrid')} />
        <Card icon={<MapPin className="size-4.5" />} tone="bg-sky-50 text-sky-600" label="On-site" value={stats.work.get('onsite') ?? 0} active={isOnly('onsite')} onClick={() => toggleWork('onsite')} />
        <Card
          icon={<Clock className="size-4.5" />}
          tone="bg-violet-50 text-violet-600"
          label="Posted in 24h"
          value={stats.fresh}
          active={filters.postedWithin === '24h'}
          onClick={() => setFilters({ ...filters, postedWithin: filters.postedWithin === '24h' ? 'any' : '24h' })}
        />
        <Card icon={<Timer className="size-4.5" />} tone="bg-rose-50 text-rose-600" label="Expiring ≤ 3 days" value={stats.expiring} />
        <Card
          icon={stats.applied ? <CheckCircle2 className="size-4.5" /> : <Bookmark className="size-4.5" />}
          tone="bg-teal-50 text-teal-600"
          label="Saved / Applied"
          value={`${stats.saved} / ${stats.applied}`}
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <Bars
          title="By region"
          items={stats.regions.map(([key, count]) => ({
            key: key === 'ww' ? 'ww' : `r:${key}`,
            label: key === 'ww' ? 'Worldwide' : regionLabel(key as RegionId),
            count,
            active: filters.locations.includes(key === 'ww' ? 'ww' : `r:${key}`),
          }))}
          onPick={(k) => toggleKey('locations', k)}
        />
        <Bars
          title="Top countries"
          items={stats.countries.map(([code, count]) => ({
            key: `c:${code}`,
            label: (
              <>
                <CountryFlag code={code} />
                <span className="truncate">{countries.get(code)?.name ?? code}</span>
              </>
            ),
            count,
            active: filters.locations.includes(`c:${code}`),
          }))}
          onPick={(k) => toggleKey('locations', k)}
        />
        <Bars
          title="Top stacks"
          items={stats.stacks.map(([name, count]) => ({ key: name, label: name, count, active: filters.stacks.includes(name) }))}
          onPick={(k) => toggleKey('stacks', k)}
        />
      </div>
    </div>
  );
}
