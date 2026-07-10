import { useEntries } from '../../hooks/useEntries';
import { getApiErrorMessage } from '../../lib/queryClient';
import { formatCurrency, formatDate } from '../../utils/format';
import DataTable from '../../components/common/DataTable';
import { recentEntriesIcon } from './dashboardIcons';

const RECENT_LIMIT = 5;

export default function RecentEntriesTable() {
  const {
    data: response,
    isLoading,
    isError,
    error: queryError,
  } = useEntries({ page: 1, limit: RECENT_LIMIT });
  const error = isError ? getApiErrorMessage(queryError, 'Failed to load recent entries') : null;
  const entries = response?.entries ?? [];

  const columns = [
    { key: 'date', header: 'Date', render: (e) => formatDate(e.date) },
    {
      key: 'type',
      header: 'Type',
      align: 'center',
      render: (e) => (
        <span className={e.type === 'receipt' ? 'company-status-active' : 'badge-rejected'}>
          {e.type === 'receipt' ? 'Receipt' : 'Payment'}
        </span>
      ),
    },
    { key: 'company', header: 'Company', align: 'center', render: (e) => e.company?.code || '-' },
    {
      key: 'expenseHead',
      header: 'Expense Head',
      align: 'center',
      render: (e) => (e.expenseHead?.name ? <span className="badge-payment-pending">{e.expenseHead.name}</span> : '-'),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (e) => (
        <span className={e.type === 'receipt' ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
          {formatCurrency(e.amount)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="card p-4 mb-4">
        <h3 className="flex items-center gap-2.5 text-lg font-semibold text-gray-700 dashboard-heading">
          <span className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
            {recentEntriesIcon}
          </span>
          Recent Entries
        </h3>
      </div>

      {error && <div className="card p-4 mb-4 company-error-alert">{error}</div>}

      <div className="flex-1">
        <DataTable
          className="h-full"
          columns={columns}
          data={entries}
          loading={isLoading}
          rowKey={(row, i) => row._id ?? i}
          emptyTitle="No entries yet"
          emptyDescription="Add a receipt or payment to get started"
        />
      </div>
    </div>
  );
}
