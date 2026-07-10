import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useExpenseByExpenseHead } from '../../hooks/useDashboard';
import { useChartFilters } from '../../hooks/useChartFilters';
import { getApiErrorMessage } from '../../lib/queryClient';
import { formatCompactCurrency, formatCurrency } from '../../utils/format';
import { FinancialYearSelect, MonthSelect } from '../reports/ReportFilters';
import {
  CHART_ANIMATION_DURATION,
  CHART_ANIMATION_EASING,
  MAX_SERIES_SLICES,
  OTHER_COLOR,
  seriesColor,
} from './chartColors';
import { ChartCardHeader, ChartCardState } from './ChartCard';
import { ChartTooltipCard, ChartTooltipRow } from './ChartTooltip';
import { pieChartIcon } from '../../components/icons/dashboardIcons';

// Past the fixed categorical slot count, fold the tail into a single neutral
// "Other" slice rather than generating/reusing a hue for it.
const buildSlices = (rows) => {
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const top = rows.slice(0, MAX_SERIES_SLICES);
  const rest = rows.slice(MAX_SERIES_SLICES);

  const slices = top.map((r, i) => ({
    name: r.expenseHead,
    amount: r.amount,
    percentage: r.percentage,
    color: seriesColor(i),
  }));

  if (rest.length > 0) {
    const otherAmount = rest.reduce((sum, r) => sum + r.amount, 0);
    slices.push({
      name: 'Other',
      amount: otherAmount,
      percentage: total > 0 ? Math.round((otherAmount / total) * 10000) / 100 : 0,
      color: OTHER_COLOR,
    });
  }

  return { slices, total };
};

function ExpenseHeadTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload;
  return (
    <ChartTooltipCard title={slice.name}>
      <ChartTooltipRow color={slice.color} name="Amount" value={formatCurrency(slice.amount)} />
    </ChartTooltipCard>
  );
}

function SliceLegend({ slices }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
      {slices.map((s) => (
        <li key={s.name} className="flex items-center gap-2 whitespace-nowrap">
          <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
          <span className="text-gray-600 dashboard-legend-name">{s.name}</span>
          <span className="text-gray-400 dashboard-legend-sep">·</span>
          <span className="font-semibold text-gray-900 dashboard-legend-value">{s.percentage}%</span>
        </li>
      ))}
    </ul>
  );
}

export default function ExpenseByExpenseHeadChart() {
  const { financialYear, setFinancialYear, month, setMonth, fyOptions } = useChartFilters();

  const {
    data: response,
    isLoading,
    isError,
    error: queryError,
  } = useExpenseByExpenseHead({ financialYear, ...(month && { month }) });
  const error = isError ? getApiErrorMessage(queryError, 'Failed to load this chart') : null;
  const rows = response?.data ?? [];
  const { slices, total } = buildSlices(rows);

  return (
    <div className="card p-4">
      <ChartCardHeader icon={pieChartIcon} badgeClassName="bg-violet-50 text-violet-600" title="Split of Expenses">
        <FinancialYearSelect value={financialYear} onChange={setFinancialYear} options={fyOptions} />
        <MonthSelect value={month} onChange={setMonth} />
      </ChartCardHeader>

      {error || isLoading || slices.length === 0 ? (
        <ChartCardState
          isLoading={isLoading}
          error={error}
          isEmpty={slices.length === 0}
          emptyMessage="No payment data for the selected filters."
        />
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-56 flex-shrink-0">
            <ResponsiveContainer width="100%" height={224}>
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius={64}
                  outerRadius={96}
                  paddingAngle={2}
                  stroke="none"
                  animationBegin={0}
                  animationDuration={CHART_ANIMATION_DURATION}
                  animationEasing={CHART_ANIMATION_EASING}
                >
                  {slices.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip content={<ExpenseHeadTooltip />} wrapperStyle={{ zIndex: 20 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-gray-500 dashboard-total-label">Total</span>
              <span className="text-lg font-semibold text-gray-900 dashboard-total-value">{formatCompactCurrency(total)}</span>
            </div>
          </div>
          <SliceLegend slices={slices} />
        </div>
      )}
    </div>
  );
}
