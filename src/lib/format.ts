import type { Job, WorkType } from '@/shared/types';

const DAY = 864e5;

export function relativeTime(iso: string | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const diff = now - Date.parse(iso);
  const future = diff < 0;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 6e4);
  const hours = Math.round(abs / 36e5);
  const days = Math.round(abs / DAY);
  const text =
    mins < 60 ? `${Math.max(mins, 1)}m` : hours < 24 ? `${hours}h` : days < 30 ? `${days}d` : days < 365 ? `${Math.round(days / 30)}mo` : `${Math.round(days / 365)}y`;
  return future ? `in ${text}` : `${text} ago`;
}

export function shortDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export type ExpiryState = 'expired' | 'stale' | 'soon' | 'open' | 'unknown';

/** `stale` = estimated expiry passed (employer published no end date). */
export function expiryState(job: Pick<Job, 'expiresAt' | 'expiresEstimated'>, now = Date.now()): ExpiryState {
  if (!job.expiresAt) return 'unknown';
  const left = Date.parse(job.expiresAt) - now;
  if (left < 0) return job.expiresEstimated ? 'stale' : 'expired';
  if (left < 3 * DAY) return 'soon';
  return 'open';
}

export const compactNumber = (n: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const WORK_TYPE_LABEL: Record<WorkType, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
  unknown: 'Unknown',
};

export const WORK_TYPE_STYLE: Record<WorkType, string> = {
  remote: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  hybrid: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  onsite: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  unknown: 'bg-slate-50 text-slate-500 ring-slate-500/20',
};

export const flagUrl = (code: string) => `https://flagcdn.com/${code.toLowerCase()}.svg`;

const AVATAR_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-violet-500', 'bg-teal-500', 'bg-fuchsia-500', 'bg-orange-500', 'bg-cyan-600'];

export function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';
