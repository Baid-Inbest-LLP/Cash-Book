import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useExpenseByMonth } from '../../hooks/useDashboard';
import { useChartFilters } from '../../hooks/useChartFilters';
import { getApiErrorMessage } from '../../lib/queryClient';
import { FY_MONTH_ORDER, MONTHS } from '../../constants';
import { formatCompactCurrency, formatCurrency } from '../../utils/format';
import { FinancialYearSelect } from '../reports/ReportFilters';
import {
  CHART_ANIMATION_DURATION,
  CHART_ANIMATION_EASING,
  CHART_AXIS,
  CHART_GRID,
  CHART_PRIMARY,
  CHART_SURFACE,
  CHART_TICK,
} from './chartColors';
import { ChartCardHeader, ChartCardState } from './ChartCard';
import { ChartTooltipCard, ChartTooltipRow } from './ChartTooltip';
import { monthlyTrendIcon } from '../../components/icons/dashboardIcons';

const monthLabel = (month) => MONTHS[month - 1]?.slice(0, 3) ?? month;

// The API only returns months elapsed so far in the current FY; pad the rest
// of the FY's months in with zero so the X-axis always shows all 12.
const fillAllMonths = (rows) => {
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  return FY_MONTH_ORDER.map((month) => byMonth.get(month) ?? { month, amount: 0, percentage: 0 });
};

function MonthTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <ChartTooltipCard title={MONTHS[row.month - 1]}>
      <ChartTooltipRow color={CHART_PRIMARY} name={`${row.percentage}% of FY total`} value={formatCurrency(row.amount)} />
    </ChartTooltipCard>
  );
}

// Single series over time (total payments per month) — one hue, no legend needed.
export default function ExpenseByMonthChart() {
  const { financialYear, setFinancialYear, fyOptions } = useChartFilters();

  const {
    data: response,
    isLoading,
    isError,
    error: queryError,
  } = useExpenseByMonth({ financialYear });
  const error = isError ? getApiErrorMessage(queryError, 'Failed to load this chart') : null;
  const rows = response?.data ?? [];
  const data = fillAllMonths(rows);

  return (
    <div className="card p-4">
      <ChartCardHeader icon={monthlyTrendIcon} badgeClassName="bg-emerald-50 text-emerald-600" title="Monthly Spend Analysis">
        <FinancialYearSelect value={financialYear} onChange={setFinancialYear} options={fyOptions} />
      </ChartCardHeader>

      {error || isLoading || rows.length === 0 ? (
        <ChartCardState
          isLoading={isLoading}
          error={error}
          isEmpty={rows.length === 0}
          emptyMessage="No payment data for the selected financial year."
        />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={CHART_GRID} />
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
              tick={{ fontSize: 12, fill: CHART_TICK }}
              axisLine={{ stroke: CHART_AXIS }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatCompactCurrency}
              tick={{ fontSize: 12, fill: CHART_TICK }}
              axisLine={{ stroke: CHART_AXIS }}
              tickLine={false}
              width={64}
            />
            <Tooltip
              content={<MonthTooltip />}
              cursor={{ stroke: CHART_AXIS, strokeDasharray: '3 3' }}
              wrapperStyle={{ zIndex: 20 }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke={CHART_PRIMARY}
              strokeWidth={2}
              fill={CHART_PRIMARY}
              fillOpacity={0.12}
              activeDot={{ r: 4, stroke: CHART_SURFACE, strokeWidth: 2 }}
              animationBegin={0}
              animationDuration={CHART_ANIMATION_DURATION}
              animationEasing={CHART_ANIMATION_EASING}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
