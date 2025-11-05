import clsx from 'clsx';

const statusStyles: Record<string, string> = {
  PROVEN: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700 border-amber-300',
  HYPOTHETICAL: 'bg-blue-100 text-blue-700 border-blue-300',
  DISPROVEN: 'bg-rose-100 text-rose-700 border-rose-300',
  REVISED: 'bg-purple-100 text-purple-700 border-purple-300',
  PROBABILISTIC: 'bg-slate-100 text-slate-700 border-slate-300',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
        statusStyles[status] ?? 'bg-slate-100 text-slate-700 border-slate-300'
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
