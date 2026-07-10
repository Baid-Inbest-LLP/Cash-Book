import { useTopExpenseHeads } from '../../hooks/useDashboard';
import { useChartFilters } from '../../hooks/useChartFilters';
import { getApiErrorMessage } from '../../lib/queryClient';
import { formatCurrency } from '../../utils/format';
import DataTable from '../../components/common/DataTable';
import { FinancialYearSelect, MonthSelect } from '../reports/ReportFilters';
import { topRankIcon } from './dashboardIcons';

const TOP_LIMIT = 5;

export default function TopExpenseHeadsTable() {
  const { financialYear, setFinancialYear, month, setMonth, fyOptions } = useChartFilters();

  const {
    data: response,
    isLoading,
    isError,
    error: queryError,
  } = useTopExpenseHeads({ financialYear, ...(month && { month }), limit: TOP_LIMIT });
  const error = isError ? getApiErrorMessage(queryError, 'Failed to load top expense heads') : null;
  const rows = response?.data ?? [];

  const columns = [
    { key: 'rank', header: '#', align: 'center', width: '48px', render: (_row, i) => i + 1 },
    { key: 'expenseHead', header: 'Expense Head', render: (row) => row.expenseHead },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => <span className="text-red-600 font-semibold">{formatCurrency(row.amount)}</span>,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="card p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2.5 text-lg font-semibold text-gray-700 dashboard-heading">
          <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            {topRankIcon}
          </span>
          Top 5 Expense Heads
        </h3>
        <div className="flex flex-wrap gap-2">
          <FinancialYearSelect value={financialYear} onChange={setFinancialYear} options={fyOptions} />
          <MonthSelect value={month} onChange={setMonth} />
        </div>
      </div>

      {error && <div className="card p-4 mb-4 company-error-alert">{error}</div>}

      <div className="flex-1">
        <DataTable
          className="h-full"
          columns={columns}
          data={rows}
          loading={isLoading}
          rowKey={(row, i) => row.expenseHead ?? i}
          emptyTitle="No payments yet"
          emptyDescription="No payments recorded for the selected filters."
        />
      </div>
    </div>
  );
}
