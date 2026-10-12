import { ChevronRight, Globe2, Inbox } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import type { CountryInfo, JobStatus, JobWithState, RegionId } from '@/shared/types';
import type { GroupKey } from '@/lib/filters';
import { JobRow } from './JobRow';
import { CompanyAvatar, CountryFlag, cx } from './ui';

interface Props {
  jobs: JobWithState[];
  groupBy: GroupKey;
  countries: Map<string, CountryInfo>;
  regionLabel: (id: RegionId) => string;
  onOpen: (job: JobWithState) => void;
  onStatus: (job: JobWithState, status: JobStatus) => void;
  onApply: (job: JobWithState) => void;
}

interface Group {
  key: string;
  label: ReactNode;
  jobs: JobWithState[];
  children?: Group[];
}

function groupBy(jobs: JobWithState[], keyOf: (j: JobWithState) => string): Map<string, JobWithState[]> {
  const map = new Map<string, JobWithState[]>();
  for (const job of jobs) {
    const key = keyOf(job);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(job);
  }
  return map;
}

const bySize = (a: [string, JobWithState[]], b: [string, JobWithState[]]) => b[1].length - a[1].length || a[0].localeCompare(b[0]);

function buildGroups(jobs: JobWithState[], mode: GroupKey, countries: Map<string, CountryInfo>, regionLabel: (id: RegionId) => string): Group[] {
  if (mode === 'company') {
    return [...groupBy(jobs, (j) => j.company)].sort(bySize).map(([company, list]) => ({
      key: company,
      label: (
        <span className="flex items-center gap-2">
          <CompanyAvatar name={company} size="sm" />
          {company}
        </span>
      ),
      jobs: list,
    }));
  }
  if (mode === 'role') return [...groupBy(jobs, (j) => j.roleCategory)].sort(bySize).map(([k, list]) => ({ key: k, label: k, jobs: list }));
  if (mode === 'source') return [...groupBy(jobs, (j) => j.source)].sort(bySize).map(([k, list]) => ({ key: k, label: k, jobs: list }));

  // Location: Region → Country, using each job's primary location.
  const regionKey = (j: JobWithState) => {
    const first = j.location.countries[0];
    if (first) return countries.get(first)?.region ?? 'none';
    if (j.location.regions[0]) return j.location.regions[0];
    return j.location.worldwide ? 'ww' : 'none';
  };
  return [...groupBy(jobs, regionKey)].sort(bySize).map(([region, list]) => {
    if (region === 'ww' || region === 'none') {
      return {
        key: region,
        label: region === 'ww' ? (
          <span className="flex items-center gap-2">
            <Globe2 className="size-4 text-indigo-500" /> Worldwide / Anywhere
          </span>
        ) : (
          'Unspecified location'
        ),
        jobs: list,
      };
    }
    const children = [...groupBy(list, (j) => j.location.countries[0] ?? '*')].sort(bySize).map(([code, cl]) => ({
      key: `${region}:${code}`,
      label:
        code === '*' ? (
          <span className="italic">Anywhere in {regionLabel(region as RegionId)}</span>
        ) : (
          <span className="flex items-center gap-2">
            <CountryFlag code={code} /> {countries.get(code)?.name ?? code}
          </span>
        ),
      jobs: cl,
    }));
    return { key: region, label: regionLabel(region as RegionId), jobs: list, children };
  });
}

const PAGE = 60;

function Rows({ jobs, rowProps, hideCompany }: { jobs: JobWithState[]; rowProps: Omit<Props, 'jobs' | 'groupBy' | 'regionLabel'>; hideCompany?: boolean }) {
  const [limit, setLimit] = useState(PAGE);
  return (
    <>
      {jobs.slice(0, limit).map((job) => (
        <JobRow key={job.id} job={job} hideCompany={hideCompany} {...rowProps} />
      ))}
      {jobs.length > limit && (
        <button onClick={() => setLimit(limit + PAGE * 2)} className="w-full py-2.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50">
          Show {Math.min(PAGE * 2, jobs.length - limit)} more of {jobs.length - limit} remaining
        </button>
      )}
    </>
  );
}

function GroupBlock({ group, depth, rowProps, hideCompany }: { group: Group; depth: number; rowProps: Omit<Props, 'jobs' | 'groupBy' | 'regionLabel'>; hideCompany?: boolean }) {
  const [open, setOpen] = useState(depth > 0 || group.jobs.length <= 40);
  return (
    <div className={cx(depth === 0 && 'border-b border-slate-200 last:border-0')}>
      <button
        onClick={() => setOpen(!open)}
        className={cx(
          'sticky z-[1] flex w-full items-center gap-2 border-b border-slate-100 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100',
          depth === 0 ? 'top-0 bg-slate-50 px-4 py-2' : 'top-9 bg-white py-1.5 pr-4 pl-9 text-[13px]',
        )}
      >
        <ChevronRight className={cx('size-4 text-slate-400 transition-transform', open && 'rotate-90')} />
        <span className="min-w-0 flex-1 truncate">{group.label}</span>
        <span className="rounded-full bg-slate-200 px-2 text-xs font-medium tabular-nums text-slate-600">{group.jobs.length}</span>
      </button>
      {open &&
        (group.children ? (
          group.children.map((child) => <GroupBlock key={child.key} group={child} depth={depth + 1} rowProps={rowProps} />)
        ) : (
          <Rows jobs={group.jobs} rowProps={rowProps} hideCompany={hideCompany} />
        ))}
    </div>
  );
}

export function JobList({ jobs, groupBy: mode, countries, regionLabel, onOpen, onStatus, onApply }: Props) {
  const rowProps = { countries, onOpen, onStatus, onApply };
  const groups = useMemo(() => (mode === 'none' ? [] : buildGroups(jobs, mode, countries, regionLabel)), [jobs, mode, countries, regionLabel]);

  if (!jobs.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-center text-slate-400">
        <Inbox className="size-10" />
        <p className="text-sm font-medium text-slate-500">No jobs match these filters</p>
        <p className="text-xs">Loosen the filters, or run a new search to pull fresh postings.</p>
      </div>
    );
  }

  if (mode === 'none') return <Rows key={jobs.length} jobs={jobs} rowProps={rowProps} />;

  return (
    <div>
      {groups.map((g) => (
        <GroupBlock key={`${mode}:${g.key}`} group={g} depth={0} rowProps={rowProps} hideCompany={mode === 'company'} />
      ))}
    </div>
  );
}
