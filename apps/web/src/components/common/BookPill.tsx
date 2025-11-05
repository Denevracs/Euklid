import clsx from 'clsx';

const bookColors: Record<string, string> = {
  Mathematics: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  Physics: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  Chemistry: 'bg-orange-100 text-orange-700 border-orange-300',
  Biology: 'bg-green-100 text-green-700 border-green-300',
  'Information Systems': 'bg-blue-100 text-blue-700 border-blue-300',
  'Social Systems': 'bg-rose-100 text-rose-700 border-rose-300',
  'Philosophy of Mind': 'bg-purple-100 text-purple-700 border-purple-300',
};

export function BookPill({ title }: { title: string }) {
  const classes = bookColors[title] ?? 'bg-slate-100 text-slate-700 border-slate-300';
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        classes
      )}
    >
      {title}
    </span>
  );
}
