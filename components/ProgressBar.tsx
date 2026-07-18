type Props = {
  checked: number;
  total: number;
};

export function ProgressBar({ checked, total }: Props) {
  const pct = total === 0 ? 0 : Math.round((checked / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {checked} / {total} checked
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
