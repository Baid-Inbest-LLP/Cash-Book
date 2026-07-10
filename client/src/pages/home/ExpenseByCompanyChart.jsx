import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useExpenseByCompany } from '../../hooks/useDashboard';
import { useChartFilters } from '../../hooks/useChartFilters';
import { getApiErrorMessage } from '../../lib/queryClient';
import { formatCompactCurrency, formatCurrency } from '../../utils/format';
import { FinancialYearSelect, MonthSelect } from '../reports/ReportFilters';
import {
  CHART_ANIMATION_DURATION,
  CHART_ANIMATION_EASING,
  CHART_AXIS,
  CHART_GRID,
  CHART_TICK,
  MAX_SERIES_SLICES,
  OTHER_COLOR,
  seriesColor,
} from './chartColors';
import { ChartCardHeader, ChartCardState } from './ChartCard';
import { ChartTooltipCard, ChartTooltipRow } from './ChartTooltip';
import { companyIcon } from '../../components/icons/dashboardIcons';

const truncate = (text, max = 12) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

// Each bar gets its own categorical hue; past the fixed slot count the rest
// share the neutral "Other" color rather than generating a new hue.
const withColors = (rows) =>
  rows.map((row, i) => ({ ...row, color: i < MAX_SERIES_SLICES ? seriesColor(i) : OTHER_COLOR }));

function CompanyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <ChartTooltipCard title={row.company}>
      <ChartTooltipRow color={row.color} name={`${row.percentage}% of total`} value={formatCurrency(row.amount)} />
    </ChartTooltipCard>
  );
}

// The hover highlight behind the active bar — tinted with that bar's own
// color instead of a fixed color, so it stays consistent with each bar's hue.
function CompanyCursor({ x, y, width, height, payload }) {
  const color = payload?.[0]?.payload?.color;
  if (color == null) return null;
  return <rect x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.1} />;
}

export default function ExpenseByCompanyChart() {
  const { financialYear, setFinancialYear, month, setMonth, fyOptions } = useChartFilters();

  const {
    data: response,
    isLoading,
    isError,
    error: queryError,
  } = useExpenseByCompany({ financialYear, ...(month && { month }) });
  const error = isError ? getApiErrorMessage(queryError, 'Failed to load this chart') : null;
  const data = withColors(response?.data ?? []);

  return (
    <div className="card p-4 flex flex-col">
      <ChartCardHeader icon={companyIcon} badgeClassName="bg-primary-50 text-primary-600" title="Expense by Company">
        <FinancialYearSelect value={financialYear} onChange={setFinancialYear} options={fyOptions} />
        <MonthSelect value={month} onChange={setMonth} />
      </ChartCardHeader>

      {error || isLoading || data.length === 0 ? (
        <ChartCardState
          isLoading={isLoading}
          error={error}
          isEmpty={data.length === 0}
          emptyMessage="No payment data for the selected filters."
        />
      ) : (
        // Fills whatever height the grid stretches this card to (matching its
        // taller sibling) instead of a fixed pixel height that leaves a gap.
        <div className="flex-1 min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 16, right: 8, left: 4, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={CHART_GRID} />
              <XAxis
                dataKey="code"
                tickFormatter={(code, index) => code || truncate(data[index]?.company ?? '')}
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
              <Tooltip content={<CompanyTooltip />} cursor={<CompanyCursor />} wrapperStyle={{ zIndex: 20 }} />
              <Bar
                dataKey="amount"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
                animationBegin={0}
                animationDuration={CHART_ANIMATION_DURATION}
                animationEasing={CHART_ANIMATION_EASING}
              >
                {data.map((row) => (
                  <Cell key={row.company} fill={row.color} />
                ))}
                <LabelList dataKey="amount" position="top" formatter={formatCompactCurrency} fill={CHART_TICK} fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
