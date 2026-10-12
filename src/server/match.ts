import { RANGE_MS } from '@/shared/run';
import type { Job, RunRequest } from '@/shared/types';
import { classifyLocation } from './classify/location';

/** Board scans return every open job, so apply the run's filters before sending them to the browser. */
export function matchesRequest(job: Job, req: RunRequest, target: ReturnType<typeof classifyLocation> | null): boolean {
  if (req.keywords.length) {
    const title = job.title.toLowerCase();
    const stacks = job.stacks.map((s) => s.toLowerCase());
    const hit = req.keywords.some((k) => {
      const clean = k.replace(/["()]/g, '').toLowerCase();
      if (stacks.includes(clean)) return true;
      return clean
        .split(/\s+or\s+/)
        .some((alt) => alt.split(/\s+/).filter(Boolean).every((token) => title.includes(token)));
    });
    if (!hit) return false;
  }
  if (req.workType !== 'any' && job.workType !== req.workType) return false;
  if (target) {
    const loc = job.location;
    const resolved = target.countries.length || target.regions.length;
    const ok = resolved
      ? loc.worldwide ||
        loc.countries.some((c) => target.countries.includes(c)) ||
        loc.regionWide.some((r) => target.regions.includes(r)) ||
        loc.regions.some((r) => target.regionWide.includes(r))
      : loc.label.toLowerCase().includes(req.location!.toLowerCase());
    if (!ok) return false;
  }
  if (job.postedAt && Date.now() - Date.parse(job.postedAt) > RANGE_MS[req.timeRange]) return false;
  return true;
}
