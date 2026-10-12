import { ExternalLink, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FOUNDED_LABEL, foundedBucket, matchesMemberFilter, MEMBER_FILTERS, memberCount, type FoundedBucket } from '@/shared/company';
import type { AppConfig, CountryInfo, JobWithState, RegionId, RoleCategory, Seniority, WorkType } from '@/shared/types';
import { applyFilters, countBy, DEFAULT_FILTERS, type Facet, type Filters, type PostedWithin } from '@/lib/filters';
import { WORK_TYPE_LABEL } from '@/lib/format';
import { LocationTree } from './LocationTree';
import { Checkbox, cx, Section, Segmented } from './ui';

interface Props {
  jobs: JobWithState[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  config: AppConfig;
  countries: Map<string, CountryInfo>;
  regionOf: (code: string) => RegionId | undefined;
}

const WORK_TYPES: WorkType[] = ['remote', 'hybrid', 'onsite', 'unknown'];
const FOUNDED_ORDER: FoundedBucket[] = ['startup', 'before2020', 'unknown'];
const SENIORITY_ORDER: Seniority[] = ['Intern', 'Junior', 'Mid', 'Senior', 'Lead', 'Staff / Principal', 'Manager', 'Unspecified'];

function toggleIn<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function ChipList<T extends string>({ options, selected, onToggle }: { options: { value: T; label?: string; count: number }[]; selected: T[]; onToggle: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            className={cx(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition',
              active ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300',
              !o.count && !active && 'opacity-40',
            )}
          >
            {o.label ?? o.value}
            <span className={cx('tabular-nums', active ? 'text-indigo-100' : 'text-slate-400')}>{o.count}</span>
          </button>
        );
      })}
    </div>
  );
}

export function FilterSidebar({ jobs, filters, setFilters, config, countries, regionOf }: Props) {
  const [stackQuery, setStackQuery] = useState('');
  const [showAllStacks, setShowAllStacks] = useState(false);

  const facetJobs = useMemo(() => {
    const facets: Facet[] = ['locations', 'workTypes', 'roles', 'seniorities', 'stacks', 'sources', 'companyMembers', 'founded'];
    return Object.fromEntries(facets.map((f) => [f, applyFilters(jobs, filters, regionOf, f)])) as Record<Facet, JobWithState[]>;
  }, [jobs, filters, regionOf]);

  const workCounts = useMemo(() => countBy(facetJobs.workTypes, (j) => j.workType), [facetJobs]);
  const roleCounts = useMemo(() => countBy(facetJobs.roles, (j) => j.roleCategory), [facetJobs]);
  const seniorityCounts = useMemo(() => countBy(facetJobs.seniorities, (j) => j.seniority), [facetJobs]);
  const stackCounts = useMemo(() => countBy(facetJobs.stacks, (j) => j.stacks), [facetJobs]);
  const sourceCounts = useMemo(() => countBy(facetJobs.sources, (j) => j.source), [facetJobs]);
  const foundedCounts = useMemo(() => countBy(facetJobs.founded, (j) => foundedBucket(j.companyInfo)), [facetJobs]);
  const memberOptions = useMemo(
    () =>
      MEMBER_FILTERS.filter((m) => m.value !== 'any').map((m) => ({
        value: m.value,
        label: m.label,
        count: facetJobs.companyMembers.filter((j) => matchesMemberFilter(j.companyInfo, m.value)).length,
      })),
    [facetJobs],
  );
  const withoutMembers = useMemo(() => facetJobs.companyMembers.filter((j) => memberCount(j.companyInfo) === undefined).length, [facetJobs]);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters({ ...filters, [key]: value });

  const stackOptions = [...stackCounts]
    .sort((a, b) => b[1] - a[1])
    .filter(([name]) => name.toLowerCase().includes(stackQuery.toLowerCase()));
  for (const s of filters.stacks) if (!stackCounts.has(s)) stackOptions.unshift([s, 0]);
  const visibleStacks = showAllStacks || stackQuery ? stackOptions : stackOptions.slice(0, 24);

  const roleOptions = [...roleCounts].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value: value as RoleCategory, count }));
  for (const r of filters.roles) if (!roleCounts.has(r)) roleOptions.push({ value: r, count: 0 });

  return (
    <aside className="scroll-thin flex h-full w-80 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.text}
            onChange={(e) => set('text', e.target.value)}
            placeholder="Search title, company, stack…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-8 pl-8 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
          {filters.text && (
            <button onClick={() => set('text', '')} className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X className="size-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setFilters({ ...DEFAULT_FILTERS, status: filters.status })}
          className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          Reset all filters
        </button>
      </div>

      <Section
        title="Location"
        action={
          filters.locations.length > 0 && (
            <button onClick={() => set('locations', [])} className="text-xs text-indigo-600 hover:text-indigo-800">
              Clear
            </button>
          )
        }
      >
        <LocationTree jobs={facetJobs.locations} regions={config.regions} countries={countries} selected={filters.locations} onChange={(v) => set('locations', v)} />
        <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs text-slate-500">
          <Checkbox checked={filters.includeBroad} onChange={() => set('includeBroad', !filters.includeBroad)} className="mt-0.5" />
          Country/region filters also include worldwide and region-wide jobs
        </label>
      </Section>

      <Section title="Work type">
        <ChipList
          options={WORK_TYPES.map((w) => ({ value: w, label: WORK_TYPE_LABEL[w], count: workCounts.get(w) ?? 0 }))}
          selected={filters.workTypes}
          onToggle={(v) => set('workTypes', toggleIn(filters.workTypes, v))}
        />
      </Section>

      <Section title="Role">
        <ChipList options={roleOptions} selected={filters.roles} onToggle={(v) => set('roles', toggleIn(filters.roles, v))} />
      </Section>

      <Section title="Seniority">
        <ChipList
          options={SENIORITY_ORDER.map((s) => ({ value: s, count: seniorityCounts.get(s) ?? 0 })).filter((o) => o.count || filters.seniorities.includes(o.value))}
          selected={filters.seniorities}
          onToggle={(v) => set('seniorities', toggleIn(filters.seniorities, v))}
        />
      </Section>

      <Section title="Company">
        <p className="mb-1.5 text-xs font-medium text-slate-500">Members on LinkedIn</p>
        <ChipList
          options={memberOptions}
          selected={[filters.companyMembers]}
          onToggle={(v) => set('companyMembers', filters.companyMembers === v ? 'any' : v)}
        />
        <p className="mt-3 mb-1.5 text-xs font-medium text-slate-500">Founded</p>
        <ChipList
          options={FOUNDED_ORDER.map((b) => ({ value: b, label: FOUNDED_LABEL[b], count: foundedCounts.get(b) ?? 0 }))}
          selected={filters.founded}
          onToggle={(v) => set('founded', toggleIn(filters.founded, v))}
        />
        {withoutMembers > 0 && (
          <p className="mt-2 text-[11px] text-slate-400">
            {withoutMembers} jobs have no member count yet — company profiles are looked up on LinkedIn during each search run.
          </p>
        )}
      </Section>

      <Section
        title="Tech stack"
        action={
          <Segmented
            size="sm"
            value={filters.stackMode}
            onChange={(v) => set('stackMode', v)}
            options={[
              { value: 'any', label: 'Any' },
              { value: 'all', label: 'All' },
            ]}
          />
        }
      >
        <input
          value={stackQuery}
          onChange={(e) => setStackQuery(e.target.value)}
          placeholder="Filter stacks…"
          className="mb-2 w-full rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-400"
        />
        <ChipList
          options={visibleStacks.map(([value, count]) => ({ value, count }))}
          selected={filters.stacks}
          onToggle={(v) => set('stacks', toggleIn(filters.stacks, v))}
        />
        {!stackQuery && stackOptions.length > 24 && (
          <button onClick={() => setShowAllStacks(!showAllStacks)} className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-800">
            {showAllStacks ? 'Show fewer' : `Show all ${stackOptions.length}`}
          </button>
        )}
      </Section>

      <Section title="Posted">
        <Segmented<PostedWithin>
          size="sm"
          value={filters.postedWithin}
          onChange={(v) => set('postedWithin', v)}
          options={[
            { value: 'any', label: 'Any' },
            { value: '24h', label: '24h' },
            { value: '3d', label: '3d' },
            { value: '7d', label: '7d' },
            { value: '30d', label: '30d' },
          ]}
        />
        <div className="mt-2.5 space-y-1.5 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={filters.hideExpired} onChange={() => set('hideExpired', !filters.hideExpired)} />
            Hide expired / stale postings
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={filters.onlySalary} onChange={() => set('onlySalary', !filters.onlySalary)} />
            Only jobs with salary
          </label>
        </div>
      </Section>

      <Section title="Source">
        <div className="space-y-0.5">
          {[...sourceCounts]
            .sort((a, b) => b[1] - a[1])
            .map(([source, count]) => (
              <label key={source} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-slate-100">
                <Checkbox checked={filters.sources.includes(source)} onChange={() => set('sources', toggleIn(filters.sources, source))} />
                <span className="flex-1 truncate">{source}</span>
                <span className="text-xs tabular-nums text-slate-400">{count}</span>
              </label>
            ))}
          {!sourceCounts.size && <p className="text-xs text-slate-400">No jobs yet.</p>}
        </div>
      </Section>

      <Section title="Bookmarked job boards">
        <ul className="space-y-1">
          {config.directBoards.map((b) => (
            <li key={b.id}>
              <a href={b.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-indigo-700">
                <ExternalLink className="size-3.5 text-slate-400" />
                {b.label}
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </aside>
  );
}
