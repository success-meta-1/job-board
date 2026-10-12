import { ChevronRight, Globe2, HelpCircle } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import type { CountryInfo, JobWithState, RegionId } from '@/shared/types';
import { Checkbox, CountryFlag, cx } from './ui';

interface Props {
  jobs: JobWithState[];
  regions: { id: RegionId; label: string }[];
  countries: Map<string, CountryInfo>;
  selected: string[];
  onChange: (keys: string[]) => void;
}

function Row({ checked, indeterminate, onToggle, label, count, icon, indent, muted }: {
  checked: boolean;
  indeterminate?: boolean;
  onToggle: () => void;
  label: ReactNode;
  count: number;
  icon?: ReactNode;
  indent?: boolean;
  muted?: boolean;
}) {
  return (
    <label className={cx('flex cursor-pointer items-center gap-2 rounded-md py-1 pr-1 text-sm hover:bg-slate-100', indent ? 'pl-7' : 'pl-1', muted && 'opacity-50')}>
      <Checkbox checked={checked} indeterminate={indeterminate} onChange={onToggle} />
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-xs tabular-nums text-slate-400">{count}</span>
    </label>
  );
}

interface RegionNode {
  id: RegionId;
  label: string;
  count: number;
  regionWide: number;
  countries: { code: string; name: string; count: number }[];
}

export function LocationTree({ jobs, regions, countries, selected, onChange }: Props) {
  const [expanded, setExpanded] = useState<Set<RegionId>>(new Set());

  const { nodes, worldwide, unspecified } = useMemo(() => {
    const nodes: RegionNode[] = regions.map((r) => {
      const inRegion = jobs.filter((j) => j.location.regions.includes(r.id));
      const counts = new Map<string, number>();
      for (const j of inRegion) {
        for (const c of j.location.countries) if (countries.get(c)?.region === r.id) counts.set(c, (counts.get(c) ?? 0) + 1);
      }
      for (const key of selected) {
        if (key.startsWith('c:') && countries.get(key.slice(2))?.region === r.id && !counts.has(key.slice(2))) counts.set(key.slice(2), 0);
      }
      return {
        ...r,
        count: inRegion.length,
        regionWide: inRegion.filter((j) => j.location.regionWide.includes(r.id)).length,
        countries: [...counts]
          .map(([code, count]) => ({ code, count, name: countries.get(code)?.name ?? code }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      };
    });
    return {
      nodes,
      worldwide: jobs.filter((j) => j.location.worldwide).length,
      unspecified: jobs.filter((j) => !j.location.worldwide && !j.location.countries.length && !j.location.regions.length).length,
    };
  }, [jobs, regions, countries, selected]);

  const has = (key: string) => selected.includes(key);
  const toggle = (key: string) => onChange(has(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  const childKeys = (n: RegionNode) => [...(n.regionWide ? [`rw:${n.id}`] : []), ...n.countries.map((c) => `c:${c.code}`)];

  const toggleRegion = (n: RegionNode) => {
    const children = new Set(childKeys(n));
    const rest = selected.filter((k) => !children.has(k) && k !== `r:${n.id}`);
    onChange(has(`r:${n.id}`) ? rest : [...rest, `r:${n.id}`]);
  };

  /** Unchecking one child of a fully-selected region keeps its siblings selected. */
  const toggleChild = (n: RegionNode, key: string) => {
    if (has(`r:${n.id}`)) {
      onChange([...selected.filter((k) => k !== `r:${n.id}`), ...childKeys(n).filter((k) => k !== key)]);
    } else {
      toggle(key);
    }
  };

  const toggleExpand = (id: RegionId) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-0.5">
      <Row checked={has('ww')} onToggle={() => toggle('ww')} label="Worldwide / Anywhere" count={worldwide} icon={<Globe2 className="size-3.5 text-indigo-500" />} muted={!worldwide} />
      {nodes.map((n) => {
        const regionChecked = has(`r:${n.id}`);
        const partial = childKeys(n).some(has);
        const open = expanded.has(n.id) || partial;
        return (
          <div key={n.id}>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => toggleExpand(n.id)}
                className={cx('-ml-1 rounded p-0.5 text-slate-400 hover:text-slate-700', !n.countries.length && !n.regionWide && 'invisible')}
                aria-label={open ? 'Collapse' : 'Expand'}
              >
                <ChevronRight className={cx('size-3.5 transition-transform', open && 'rotate-90')} />
              </button>
              <div className="flex-1">
                <Row
                  checked={regionChecked}
                  indeterminate={partial}
                  onToggle={() => toggleRegion(n)}
                  label={<span className="font-medium">{n.label}</span>}
                  count={n.count}
                  muted={!n.count}
                />
              </div>
            </div>
            {open && (
              <div className="ml-1 border-l border-slate-200">
                {n.regionWide > 0 && (
                  <Row
                    indent
                    checked={regionChecked || has(`rw:${n.id}`)}
                    onToggle={() => toggleChild(n, `rw:${n.id}`)}
                    label={<span className="italic text-slate-600">Anywhere in {n.label}</span>}
                    count={n.regionWide}
                  />
                )}
                {n.countries.map((c) => (
                  <Row
                    key={c.code}
                    indent
                    checked={regionChecked || has(`c:${c.code}`)}
                    onToggle={() => toggleChild(n, `c:${c.code}`)}
                    label={c.name}
                    count={c.count}
                    icon={<CountryFlag code={c.code} />}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
      <Row checked={has('none')} onToggle={() => toggle('none')} label="Unspecified location" count={unspecified} icon={<HelpCircle className="size-3.5 text-slate-400" />} muted={!unspecified} />
    </div>
  );
}
