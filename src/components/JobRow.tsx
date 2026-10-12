import { Bookmark, Check, EyeOff, Globe2, Undo2, Users } from 'lucide-react';
import { foundedBucket, memberCount } from '@/shared/company';
import type { CountryInfo, JobStatus, JobWithState } from '@/shared/types';
import { compactNumber, expiryState, relativeTime, shortDate, WORK_TYPE_LABEL, WORK_TYPE_STYLE } from '@/lib/format';
import { Badge, CompanyAvatar, CountryFlag, cx } from './ui';

interface Props {
  job: JobWithState;
  countries: Map<string, CountryInfo>;
  onOpen: (job: JobWithState) => void;
  onStatus: (job: JobWithState, status: JobStatus) => void;
  onApply: (job: JobWithState) => void;
  hideCompany?: boolean;
}

const EXPIRY_STYLE = {
  expired: 'text-rose-600',
  stale: 'text-slate-400',
  soon: 'text-amber-600 font-medium',
  open: 'text-slate-500',
  unknown: 'text-slate-400',
};

export function ExpiryLabel({ job }: { job: JobWithState }) {
  const state = expiryState(job);
  if (state === 'unknown') return <span className="text-slate-400">No expiry</span>;
  const prefix = job.expiresEstimated ? '~' : '';
  const text =
    state === 'expired' ? `Expired ${relativeTime(job.expiresAt)}` : state === 'stale' ? 'Likely stale' : `${prefix}Expires ${relativeTime(job.expiresAt)}`;
  return (
    <span className={EXPIRY_STYLE[state]} title={`${job.expiresEstimated ? 'Estimated (posted + 30 days)' : 'Published by employer'}: ${shortDate(job.expiresAt)}`}>
      {text}
    </span>
  );
}

export function LocationLabel({ job, countries, max = 3 }: { job: JobWithState; countries: Map<string, CountryInfo>; max?: number }) {
  const { location } = job;
  const shown = location.countries.slice(0, max);
  return (
    <div className="flex min-w-0 items-center gap-1.5" title={location.raw.join('\n') || location.label}>
      {location.worldwide && <Globe2 className="size-3.5 shrink-0 text-indigo-500" />}
      {shown.map((c) => (
        <CountryFlag key={c} code={c} />
      ))}
      {location.countries.length > max && <span className="text-[11px] text-slate-400">+{location.countries.length - max}</span>}
      <span className="truncate text-xs text-slate-600">
        {location.raw.length ? location.label : shown.map((c) => countries.get(c)?.name ?? c).join(', ') || location.label}
      </span>
    </div>
  );
}

/** Member count and founding year, e.g. "👥 11 · Startup 2021". */
export function CompanyFacts({ job }: { job: JobWithState }) {
  const info = job.companyInfo;
  if (!info) return null;
  const members = memberCount(info);
  const startup = foundedBucket(info) === 'startup';
  return (
    <>
      {members !== undefined && (
        <span className="inline-flex items-center gap-0.5 text-slate-400" title={`${info.members?.toLocaleString() ?? '?'} members on LinkedIn · ${info.sizeRange ?? 'size not stated'}`}>
          <Users className="size-3" />
          {compactNumber(members)}
        </span>
      )}
      {info.founded &&
        (startup ? (
          <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Startup {info.founded}</Badge>
        ) : (
          <span className="text-slate-400">est. {info.founded}</span>
        ))}
    </>
  );
}

export function JobRow({ job, countries, onOpen, onStatus, onApply, hideCompany }: Props) {
  const isNew = Date.now() - Date.parse(job.firstSeenAt) < 864e5 && job.status === 'new';
  return (
    <div
      className={cx(
        'group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-slate-100 px-4 py-2.5 hover:bg-indigo-50/40 lg:grid-cols-[auto_minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.6fr)_7.5rem_auto]',
        job.status === 'hidden' && 'opacity-50',
      )}
    >
      {hideCompany ? <div className="w-0" /> : <CompanyAvatar name={job.company} />}

      <div className="min-w-0">
        <button onClick={() => onOpen(job)} className="block max-w-full truncate text-left text-sm font-semibold text-slate-900 hover:text-indigo-700">
          {job.title}
        </button>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
          {!hideCompany && <span className="truncate font-medium text-slate-600">{job.company}</span>}
          <CompanyFacts job={job} />
          <Badge className={WORK_TYPE_STYLE[job.workType]}>{WORK_TYPE_LABEL[job.workType]}</Badge>
          {job.seniority !== 'Unspecified' && <span>{job.seniority}</span>}
          <span className="text-slate-400">{job.roleCategory}</span>
          {isNew && <Badge className="bg-indigo-600 text-white ring-indigo-600">NEW</Badge>}
          {job.status === 'saved' && <Badge className="bg-amber-50 text-amber-700 ring-amber-600/20">Saved</Badge>}
          {job.status === 'applied' && <Badge className="bg-teal-50 text-teal-700 ring-teal-600/20">Applied</Badge>}
        </div>
      </div>

      <div className="col-span-3 col-start-2 row-start-2 min-w-0 lg:col-span-1 lg:col-start-auto lg:row-start-auto">
        <LocationLabel job={job} countries={countries} />
        <div className="truncate text-[11px] text-slate-400">
          {job.source}
          {job.salary && <span className="text-emerald-600"> · {job.salary}</span>}
        </div>
      </div>

      <div className="col-span-3 col-start-2 row-start-3 flex min-w-0 flex-wrap gap-1 lg:col-span-1 lg:col-start-auto lg:row-start-auto">
        {job.stacks.slice(0, 6).map((s) => (
          <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
            {s}
          </span>
        ))}
        {job.stacks.length > 6 && <span className="px-1 text-[11px] text-slate-400">+{job.stacks.length - 6}</span>}
      </div>

      <div className="hidden text-xs lg:block">
        <div className="text-slate-700" title={job.postedAt ? shortDate(job.postedAt) : `First seen ${shortDate(job.firstSeenAt)}`}>
          {job.postedAt ? `Posted ${relativeTime(job.postedAt)}` : `Seen ${relativeTime(job.firstSeenAt)}`}
        </div>
        <ExpiryLabel job={job} />
      </div>

      <div className="col-start-3 row-start-1 flex items-center gap-1 lg:col-start-auto lg:row-start-auto">
        <button
          title={job.status === 'saved' ? 'Unsave' : 'Save'}
          onClick={() => onStatus(job, job.status === 'saved' ? 'new' : 'saved')}
          className={cx('rounded-md p-1.5 hover:bg-slate-200', job.status === 'saved' ? 'text-amber-500' : 'text-slate-400 hover:text-slate-700')}
        >
          <Bookmark className={cx('size-4', job.status === 'saved' && 'fill-current')} />
        </button>
        <button
          title={job.status === 'applied' ? 'Unmark applied' : 'Mark as applied'}
          onClick={() => onStatus(job, job.status === 'applied' ? 'new' : 'applied')}
          className={cx('rounded-md p-1.5 hover:bg-slate-200', job.status === 'applied' ? 'text-teal-600' : 'text-slate-400 hover:text-slate-700')}
        >
          <Check className="size-4" />
        </button>
        <button
          title={job.status === 'hidden' ? 'Unhide' : 'Hide'}
          onClick={() => onStatus(job, job.status === 'hidden' ? 'new' : 'hidden')}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
        >
          {job.status === 'hidden' ? <Undo2 className="size-4" /> : <EyeOff className="size-4" />}
        </button>
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => onApply(job)}
          className="ml-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          Apply
        </a>
      </div>
    </div>
  );
}
