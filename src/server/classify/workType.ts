import type { WorkType } from '@/shared/types';

const HYBRID = /\bhybrid\b/i;
const NOT_REMOTE = /\b(?:not|no|non)[- ]remote\b|\bremote\s*:\s*no\b/i;
const REMOTE = /\bremote\b|\bwork(?:ing)? from home\b|\bWFH\b|\btelecommut\w*|\bfully distributed\b|\bwork from anywhere\b/i;
const ONSITE = /\bon[- ]?site\b|\bin[- ]office\b|\bin the office\b|\boffice[- ]based\b|\bin[- ]person\b/i;

export function normalizeStructuredWorkType(value: unknown): WorkType | undefined {
  if (value === true) return 'remote';
  if (typeof value !== 'string') return undefined;
  const v = value.toLowerCase().replace(/[\s_-]/g, '');
  if (!v || v === 'unspecified' || v === 'unknown') return undefined;
  if (v.includes('hybrid')) return 'hybrid';
  if (v.includes('remote') || v.includes('telecommute')) return 'remote';
  if (v.includes('onsite') || v.includes('inoffice') || v.includes('office')) return 'onsite';
  return undefined;
}

function fromShortText(text: string): WorkType | undefined {
  if (HYBRID.test(text)) return 'hybrid';
  if (NOT_REMOTE.test(text)) return 'onsite';
  const remote = REMOTE.test(text);
  const onsite = ONSITE.test(text);
  if (remote && onsite) return 'hybrid';
  if (remote) return 'remote';
  if (onsite) return 'onsite';
  return undefined;
}

function fromLongText(text: string): WorkType | undefined {
  if (/\bhybrid (?:role|position|work|model|schedule|setup|working)\b|\bthis (?:role|position) is hybrid\b/i.test(text)) return 'hybrid';
  if (NOT_REMOTE.test(text)) return 'onsite';
  const count = (re: RegExp) => (text.match(new RegExp(re.source, 'gi')) ?? []).length;
  const remote = count(REMOTE);
  const onsite = count(ONSITE);
  const hybrid = count(HYBRID);
  if (hybrid && hybrid >= remote) return 'hybrid';
  if (remote > onsite) return 'remote';
  if (onsite > remote) return 'onsite';
  return remote ? 'remote' : undefined;
}

export interface WorkTypeInput {
  structured?: unknown[];
  location?: string[];
  title?: string;
  description?: string;
}

/** Structured ATS fields win, then location text, title, and finally the description body. */
export function detectWorkType({ structured = [], location = [], title = '', description = '' }: WorkTypeInput): WorkType {
  for (const value of structured) {
    const wt = normalizeStructuredWorkType(value);
    if (wt) return wt;
  }
  const fromLocation = fromShortText(location.join(' | '));
  if (fromLocation) return fromLocation;
  const fromTitle = fromShortText(title);
  if (fromTitle) return fromTitle;
  const fromBody = description ? fromLongText(description) : undefined;
  if (fromBody) return fromBody;
  return location.length ? 'onsite' : 'unknown';
}
