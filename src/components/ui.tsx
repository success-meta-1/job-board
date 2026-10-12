import { useEffect, useRef, useState, type ReactNode } from 'react';
import { avatarColor, flagUrl, initials } from '@/lib/format';

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap', className)}>
      {children}
    </span>
  );
}

export function Checkbox({
  checked,
  indeterminate,
  onChange,
  className,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={cx('size-3.5 shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600', className)}
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 ring-1 ring-slate-200">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-md font-medium transition',
            size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
            value === o.value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CountryFlag({ code, className }: { code: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className={cx('text-[10px] font-semibold text-slate-500', className)}>{code}</span>;
  return (
    <img
      src={flagUrl(code)}
      alt={code}
      title={code}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cx('inline-block h-3 w-[18px] shrink-0 rounded-[2px] object-cover ring-1 ring-black/10', className)}
    />
  );
}

export function CompanyAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <div
      className={cx(
        'flex shrink-0 items-center justify-center rounded-lg font-semibold text-white',
        avatarColor(name),
        size === 'sm' ? 'size-6 text-[10px]' : 'size-9 text-xs',
      )}
    >
      {initials(name)}
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-slate-200 px-4 py-3 last:border-0">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
