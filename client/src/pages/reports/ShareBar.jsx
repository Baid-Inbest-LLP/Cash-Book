// Meter: fill carries the share of total, track is a lighter step of the same ramp.
export default function ShareBar({ percentage }) {
  const pct = Math.max(0, Math.min(100, Number(percentage) || 0));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-primary-100 overflow-hidden">
        <div className="h-full rounded-full bg-primary-600" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 [font-variant-numeric:tabular-nums] w-14 text-right flex-shrink-0">
        {pct.toFixed(2)}%
      </span>
    </div>
  );
}
