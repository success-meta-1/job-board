import { CheckCircle2, ChevronDown, Loader2, Square, X, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { RunProgress } from '@/shared/types';
import { api } from '@/lib/api';
import { cx } from './ui';

interface Props {
  runId: string;
  onProgress: (run: RunProgress) => void;
  onFinished: (run: RunProgress) => void;
  onDismiss: () => void;
}

export function RunPanel({ runId, onProgress, onFinished, onDismiss }: Props) {
  const [run, setRun] = useState<RunProgress | null>(null);
  const [showLog, setShowLog] = useState(false);
  const finishedRef = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finishedRef.current = false;
    let timer: number;
    let lastAdded = -1;
    const poll = async () => {
      try {
        const next = await api.run(runId);
        setRun(next);
        if (next.added + next.updated !== lastAdded) {
          lastAdded = next.added + next.updated;
          onProgress(next);
        }
        if (next.status !== 'running') {
          if (!finishedRef.current) onFinished(next);
          finishedRef.current = true;
          return;
        }
      } catch {
        // The run lived in a tab that was closed or reloaded.
        onDismiss();
        return;
      }
      timer = window.setTimeout(poll, 1200);
    };
    poll();
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  useEffect(() => {
    if (showLog && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [run?.log.length, showLog]);

  if (!run) return null;
  const running = run.status === 'running';
  const pct = run.totalQueries ? Math.round((run.doneQueries / run.totalQueries) * 100) : running ? 50 : 100;

  return (
    <div className="fixed right-4 bottom-4 z-30 w-[26rem] overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">
      <div className="flex items-center gap-2 px-4 py-3">
        {running ? (
          <Loader2 className="size-4 animate-spin text-indigo-600" />
        ) : run.status === 'done' ? (
          <CheckCircle2 className="size-4 text-emerald-600" />
        ) : (
          <XCircle className="size-4 text-rose-500" />
        )}
        <div className="flex-1 text-sm font-semibold text-slate-800">
          {running ? 'Searching…' : run.status === 'done' ? 'Search complete' : run.status === 'cancelled' ? 'Search cancelled' : 'Search failed'}
        </div>
        {running ? (
          <button onClick={() => api.cancelRun(run.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">
            <Square className="size-3" /> Stop
          </button>
        ) : (
          <button onClick={onDismiss} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="px-4 pb-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={cx('h-full rounded-full bg-indigo-600 transition-all', running && !run.totalQueries && 'animate-pulse')} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2 text-center">
          {[
            ['Queries', `${run.doneQueries}/${run.totalQueries}`],
            ['Results', run.resultsFound],
            ['New jobs', run.added],
            ['Updated', run.updated],
          ].map(([label, value]) => (
            <div key={label as string}>
              <div className="text-sm font-semibold tabular-nums text-slate-800">{value}</div>
              <div className="text-[11px] text-slate-400">{label}</div>
            </div>
          ))}
        </div>
        {run.errors.length > 0 && <p className="mt-2 truncate text-xs text-rose-600" title={run.errors.join('\n')}>{run.errors[run.errors.length - 1]}</p>}
      </div>

      <button onClick={() => setShowLog(!showLog)} className="flex w-full items-center gap-1 border-t border-slate-100 px-4 py-1.5 text-xs text-slate-500 hover:bg-slate-50">
        <ChevronDown className={cx('size-3.5 transition-transform', showLog && 'rotate-180')} />
        {showLog ? 'Hide' : 'Show'} activity log
      </button>
      {showLog && (
        <div ref={logRef} className="scroll-thin max-h-56 overflow-y-auto bg-slate-900 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-300">
          {run.log.map((line, i) => (
            <div key={i} className={line.includes('⚠') ? 'text-amber-300' : undefined}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
