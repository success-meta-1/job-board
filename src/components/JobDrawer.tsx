import { Bookmark, Check, ExternalLink, EyeOff, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { foundedBucket } from '@/shared/company';
import type { CountryInfo, JobStatus, JobWithState, RegionId } from '@/shared/types';
import { relativeTime, shortDate, WORK_TYPE_LABEL, WORK_TYPE_STYLE } from '@/lib/format';
import { ExpiryLabel } from './JobRow';
import { Badge, CompanyAvatar, CountryFlag, cx } from './ui';

interface Props {
  job: JobWithState;
  countries: Map<string, CountryInfo>;
  regionLabel: (id: RegionId) => string;
  onClose: () => void;
  onStatus: (job: JobWithState, status: JobStatus) => void;
  onApply: (job: JobWithState) => void;
}

const ENRICHED_LABEL = {
  'ats-api': 'Full details from the ATS API',
  'json-ld': 'Details from the posting page (JobPosting metadata)',
  linkedin: 'From LinkedIn’s public job page — Apply opens LinkedIn (sign in to apply or reach the company site)',
  'search-snippet': 'Only the Google snippet was available — open the posting for full details',
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-700">{children}</dd>
    </div>
  );
}

export function JobDrawer({ job, countries, regionLabel, onClose, onStatus, onApply }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const loc = job.location;
  const info = job.companyInfo;
  const statusButton = (status: JobStatus, label: string, icon: ReactNode, activeClass: string) => (
    <button
      onClick={() => onStatus(job, job.status === status ? 'new' : status)}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset',
        job.status === status ? activeClass : 'text-slate-600 ring-slate-200 hover:bg-slate-50',
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onClick={onClose}>
      <div className="animate-slide-in flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 border-b border-slate-200 p-5">
          <CompanyAvatar name={job.company} />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg leading-snug font-semibold text-slate-900">{job.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="font-medium text-slate-700">{job.company}</span>
              <Badge className={WORK_TYPE_STYLE[job.workType]}>{WORK_TYPE_LABEL[job.workType]}</Badge>
              <span>{job.roleCategory}</span>
              {job.seniority !== 'Unspecified' && <span>· {job.seniority}</span>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => onApply(job)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Apply now <ExternalLink className="size-3.5" />
          </a>
          {job.applyUrl !== job.url && (
            <a href={job.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 ring-inset hover:bg-slate-50">
              View posting <ExternalLink className="size-3.5" />
            </a>
          )}
          <div className="flex-1" />
          {statusButton('saved', 'Save', <Bookmark className="size-4" />, 'bg-amber-50 text-amber-700 ring-amber-300')}
          {statusButton('applied', 'Applied', <Check className="size-4" />, 'bg-teal-50 text-teal-700 ring-teal-300')}
          {statusButton('hidden', 'Hide', <EyeOff className="size-4" />, 'bg-slate-100 text-slate-700 ring-slate-300')}
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto p-5">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Location">
              <div className="space-y-1">
                {loc.raw.length ? loc.raw.map((r) => <div key={r}>{r}</div>) : <div>{loc.label}</div>}
              </div>
            </Field>
            <Field label="Countries & regions">
              <div className="flex flex-wrap gap-1.5">
                {loc.worldwide && <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-600/20">Worldwide</Badge>}
                {loc.countries.map((c) => (
                  <Badge key={c} className="bg-white text-slate-700 ring-slate-200">
                    <CountryFlag code={c} /> {countries.get(c)?.name ?? c}
                  </Badge>
                ))}
                {loc.regionWide.map((r) => (
                  <Badge key={r} className="bg-slate-50 text-slate-600 ring-slate-200">
                    Anywhere in {regionLabel(r)}
                  </Badge>
                ))}
                {!loc.worldwide && !loc.countries.length && !loc.regionWide.length && <span className="text-slate-400">Unspecified</span>}
              </div>
            </Field>
            <Field label="Posted">{job.postedAt ? `${shortDate(job.postedAt)} (${relativeTime(job.postedAt)})` : 'Unknown'}</Field>
            <Field label="Expires">
              <ExpiryLabel job={job} />
              {job.expiresAt && <span className="text-slate-400"> · {shortDate(job.expiresAt)}</span>}
            </Field>
            <Field label="Employment type">{job.employmentType || '—'}</Field>
            <Field label="Salary">{job.salary || '—'}</Field>
            <Field label="Source">
              {job.source} <span className="text-slate-400">({job.sourceGroup})</span>
            </Field>
            <Field label="First seen">{relativeTime(job.firstSeenAt)}</Field>
            <Field label="Company members">
              {info?.members !== undefined ? `${info.members.toLocaleString()} on LinkedIn` : '—'}
              {info?.sizeRange && <div className="text-xs text-slate-400">Declared size: {info.sizeRange}</div>}
            </Field>
            <Field label="Founded">
              {info?.founded ? (
                <>
                  {info.founded}{' '}
                  {foundedBucket(info) === 'startup' && <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Startup</Badge>}
                </>
              ) : (
                '—'
              )}
              {info && (
                <a href={info.linkedinUrl} target="_blank" rel="noreferrer" className="mt-0.5 flex items-center gap-1 text-xs text-[#0a66c2] hover:underline">
                  {info.industry ?? 'Company page'} <ExternalLink className="size-3" />
                </a>
              )}
            </Field>
          </dl>

          {job.stacks.length > 0 && (
            <div className="mt-5">
              <h3 className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Tech stack</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {job.stacks.map((s) => (
                  <span key={s} className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5">
            <h3 className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Description</h3>
            <p className="mt-0.5 text-[11px] text-slate-400">{ENRICHED_LABEL[job.enrichedBy]}</p>
            <div className="mt-2 text-sm leading-relaxed whitespace-pre-line text-slate-700">{job.description || job.snippet || 'No description available.'}</div>
          </div>

          {job.queries.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Found by</h3>
              <ul className="mt-1 space-y-0.5">
                {job.queries.map((q) => (
                  <li key={q} className="font-mono text-xs text-slate-500">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
