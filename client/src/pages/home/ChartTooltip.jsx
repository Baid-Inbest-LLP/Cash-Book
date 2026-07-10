// Shared styled tooltip shell for the dashboard charts, matching the app's
// `.card` look instead of recharts' plain default box. Recharts renders custom
// tooltip content in its own floating wrapper with no opaque background of its
// own, so the surface color is set inline here — guaranteed to win the cascade
// rather than relying on `.card`'s bg utility to apply inside that wrapper.
export function ChartTooltipCard({ title, children }) {
  return (
    <div
      className="rounded-xl border shadow-lg px-3 py-2 min-w-[160px]"
      style={{ backgroundColor: 'var(--chart-surface)', borderColor: 'var(--chart-axis)' }}
    >
      {title && <p className="text-xs font-semibold text-gray-700 mb-1.5 dashboard-tooltip-title">{title}</p>}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

// A tooltip row keys its series with a short line (not a filled box) — the
// value is the strong, high-contrast element; the name is secondary.
export function ChartTooltipRow({ color, name, value }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {color && <span className="inline-block w-2.5 h-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />}
      <span className="text-gray-500 truncate dashboard-tooltip-label">{name}</span>
      <span className="ml-auto font-semibold text-gray-900 flex-shrink-0 dashboard-tooltip-value">{value}</span>
    </div>
  );
}
