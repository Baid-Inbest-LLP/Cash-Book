// Chart color tokens, defined as CSS custom properties in index.css so dark
// mode swaps via the existing [data-theme='dark'] convention with no JS-side
// theme detection — Recharts fill/stroke props accept `var(...)` directly.

export const CHART_PRIMARY = 'var(--chart-primary)';

// Fixed-order categorical palette for charts with named slices/bars (the
// expense-head doughnut and the per-company bars). Never cycled — an entry
// beyond this count folds into "Other" (OTHER_COLOR) instead of reusing or
// generating a hue.
const SERIES_COLORS = [
  'var(--chart-series-1)',
  'var(--chart-series-3)',
  'var(--chart-series-2)',
  'var(--chart-series-4)',
  'var(--chart-series-5)',
  'var(--chart-series-6)',
  'var(--chart-series-7)',
];

export const OTHER_COLOR = 'var(--chart-series-other)';

export const seriesColor = (index) => SERIES_COLORS[index];

export const MAX_SERIES_SLICES = SERIES_COLORS.length;

// Chart chrome (gridlines/axes/ticks) — recharts takes these as literal stroke/fill
// props, so they need CSS vars rather than Tailwind's dark: utility classes.
export const CHART_GRID = 'var(--chart-grid)';
export const CHART_AXIS = 'var(--chart-axis)';
export const CHART_TICK = 'var(--chart-tick)';
export const CHART_SURFACE = 'var(--chart-surface)';

export const CHART_ANIMATION_DURATION = 600;
export const CHART_ANIMATION_EASING = 'ease-out';
