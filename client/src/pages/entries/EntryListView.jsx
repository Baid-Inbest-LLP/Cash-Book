import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useMe } from '../../hooks/useAuth';
import { useCompanies } from '../../hooks/useCompanies';
import { useExpenseHeads } from '../../hooks/useExpenseHeads';
import {
  useDeleteEntriesPermanent,
  useEntries,
  useExcludeEntries,
  useExportEntries,
  useRestoreEntries,
} from '../../hooks/useEntries';
import { getApiErrorMessage } from '../../lib/queryClient';
import { DEFAULT_PAGE_SIZE } from '../../constants';
import { isSuperAdmin } from '../../constants/roles';
import { getCurrentFinancialYear } from '../../utils/financialYear';
import { formatCurrency, formatDate } from '../../utils/format';
import ConfirmModal from '../../components/common/ConfirmModal';
import DataTable from '../../components/common/DataTable';
import PageBanner from '../../components/common/PageBanner';
import RowActions from '../../components/common/RowActions';
import EntryFilterBar from './EntryFilterBar';
import EntryForm from './EntryForm';

const entryWord = (count) => (count === 1 ? 'entry' : 'entries');

const twoLineMessage = (line1, line2) => (
  <>
    {line1}
    <br />
    {line2}
  </>
);

const emptyFilters = () => ({
  type: '',
  financialYear: getCurrentFinancialYear(),
  month: '',
  company: '',
  expenseHead: '',
  fromDate: '',
  toDate: '',
  search: '',
});

export default function EntryListView({ isExcluded }) {
  const { data: user } = useMe();
  const canDeletePermanently = isSuperAdmin(user?.role);

  const [filters, setFilters] = useState(emptyFilters);
  const [debouncedSearch] = useDebouncedValue(filters.search.trim(), 300);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('receipt');
  const [editEntry, setEditEntry] = useState(null);
  const [confirmExclude, setConfirmExclude] = useState(false);
  const [confirmDeletePermanent, setConfirmDeletePermanent] = useState(false);
  const [singleExcludeId, setSingleExcludeId] = useState(null);
  const [singleDeleteId, setSingleDeleteId] = useState(null);

  useEffect(() => setPage(1), [debouncedSearch, filters, isExcluded]);
  useEffect(() => setSelected(new Set()), [page, isExcluded]);

  const queryParams = {
    page,
    limit: DEFAULT_PAGE_SIZE,
    isExcluded,
    ...(filters.type && { type: filters.type }),
    ...(filters.financialYear && { financialYear: filters.financialYear }),
    ...(filters.month && { month: filters.month }),
    ...(filters.company && { company: filters.company }),
    ...(filters.expenseHead && { expenseHead: filters.expenseHead }),
    ...(filters.fromDate && { fromDate: filters.fromDate }),
    ...(filters.toDate && { toDate: filters.toDate }),
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isLoading, isError, error: queryError } = useEntries(queryParams);
  const entries = data?.entries ?? [];
  const pagination = data?.pagination ?? { page: 1, pages: 1, total: 0 };
  const error = isError ? getApiErrorMessage(queryError, 'Failed to fetch entries') : null;

  const { data: companiesData } = useCompanies({ isActive: true, limit: 100 });
  const { data: expenseHeadsData } = useExpenseHeads({ activeOnly: true, limit: 100 });
  const companies = companiesData?.companies ?? [];
  const expenseHeads = expenseHeadsData?.expenseHeads ?? [];

  const excludeEntries = useExcludeEntries();
  const restoreEntries = useRestoreEntries();
  const deletePermanent = useDeleteEntriesPermanent();
  const exportEntries = useExportEntries();

  const selectedIds = Array.from(selected);
  const selectedCount = selected.size;

  const runBulkAction = (mutation, ids, { successMessage, errorMessage, afterSettled }) => {
    mutation.mutate(ids, {
      onSuccess: (res) =>
        notifications.show({ message: res?.message || successMessage, color: 'green' }),
      onError: (err) =>
        notifications.show({ message: getApiErrorMessage(err, errorMessage), color: 'red' }),
      onSettled: () => {
        setSelected(new Set());
        afterSettled?.();
      },
    });
  };

  const handleExclude = () =>
    runBulkAction(excludeEntries, singleExcludeId ? [singleExcludeId] : selectedIds, {
      successMessage: 'Entries excluded',
      errorMessage: 'Exclude failed',
      afterSettled: () => {
        setConfirmExclude(false);
        setSingleExcludeId(null);
      },
    });

  const handleRestore = (ids = selectedIds) =>
    runBulkAction(restoreEntries, ids, {
      successMessage: 'Entries restored',
      errorMessage: 'Restore failed',
    });

  const handleDeletePermanent = () =>
    runBulkAction(deletePermanent, singleDeleteId ? [singleDeleteId] : selectedIds, {
      successMessage: 'Entries deleted',
      errorMessage: 'Delete failed',
      afterSettled: () => {
        setConfirmDeletePermanent(false);
        setSingleDeleteId(null);
      },
    });

  const requestExclude = (entry) => {
    setSingleExcludeId(entry._id);
    setConfirmExclude(true);
  };

  const requestDeletePermanent = (entry) => {
    setSingleDeleteId(entry._id);
    setConfirmDeletePermanent(true);
  };

  const handleExport = () => exportEntries.mutate(queryParams);

  const openCreate = (type) => {
    setFormType(type);
    setEditEntry(null);
    setShowForm(true);
  };

  const handleEdit = (entry) => {
    setEditEntry(entry);
    setFormType(entry.type);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditEntry(null);
  };

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
      render: (e) =>
        e.expenseHead?.name ? (
          <span className="badge-payment-pending">{e.expenseHead.name}</span>
        ) : (
          '-'
        ),
    },
    {
      key: 'description',
      header: 'Description',
      align: 'center',
      width: '220px',
      className: 'break-words',
      render: (e) => e.description || '-',
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
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (e) =>
        isExcluded ? (
          <RowActions
            onRestore={() => handleRestore([e._id])}
            restoreProps={{ ariaLabel: 'Restore entry' }}
            onDelete={canDeletePermanently ? () => requestDeletePermanent(e) : undefined}
            deleteProps={{ title: 'Delete permanently', ariaLabel: 'Delete entry permanently' }}
          />
        ) : (
          <RowActions
            onEdit={() => handleEdit(e)}
            onDelete={() => requestExclude(e)}
            editProps={{ ariaLabel: 'Edit entry' }}
            deleteProps={{ title: 'Exclude', ariaLabel: 'Exclude entry' }}
          />
        ),
    },
  ];

  return (
    <div>
      <PageBanner
        className="mb-4"
        title={isExcluded ? 'Excluded Entries' : 'Cashbook Entries'}
        subtitle={
          isExcluded
            ? `Recycle bin · ${pagination.total} excluded ${entryWord(pagination.total)}`
            : `Receipts and payments · ${pagination.total} ${entryWord(pagination.total)}`
        }
        action={[
          ...(isExcluded
            ? []
            : [
                { onClick: () => openCreate('receipt'), label: 'Add Receipt', variant: 'receipt' },
                { onClick: () => openCreate('payment'), label: 'Add Payment', variant: 'payment' },
              ]),
          {
            onClick: handleExport,
            label: exportEntries.isPending ? 'Exporting...' : 'Export to Excel',
            icon: 'excel',
            iconOnly: true,
            disabled: exportEntries.isPending,
          },
          {
            label: 'Export to PDF',
            icon: 'pdf',
            iconOnly: true,
          },
        ]}
      />

      <EntryFilterBar
        filters={filters}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        companies={companies}
        expenseHeads={expenseHeads}
      />

      {selectedCount > 0 && (
        <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
          {!isExcluded && (
            <button type="button" className="btn-danger text-sm" onClick={() => setConfirmExclude(true)}>
              Exclude Selected ({selectedCount})
            </button>
          )}
          {isExcluded && (
            <>
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={restoreEntries.isPending}
                onClick={() => handleRestore()}
              >
                {restoreEntries.isPending ? 'Restoring...' : `Restore Selected (${selectedCount})`}
              </button>
              {canDeletePermanently && (
                <button
                  type="button"
                  className="btn-danger text-sm"
                  onClick={() => setConfirmDeletePermanent(true)}
                >
                  Delete Permanently ({selectedCount})
                </button>
              )}
            </>
          )}
        </div>
      )}

      {error && <div className="card p-4 mb-4 company-error-alert">{error}</div>}

      <DataTable
        columns={columns}
        data={entries}
        loading={isLoading}
        emptyTitle={isExcluded ? 'No excluded entries' : 'No entries yet'}
        emptyDescription={
          isExcluded ? 'Entries you exclude will show up here' : 'Add a receipt or payment to get started'
        }
        selection={{ selectedIds: selected, onChange: setSelected }}
        pagination={{ ...pagination, onPageChange: setPage }}
      />

      {showForm && (
        <EntryForm
          entry={editEntry}
          initialType={formType}
          companies={companies}
          expenseHeads={expenseHeads}
          onClose={handleFormClose}
        />
      )}

      <ConfirmModal
        open={confirmExclude}
        title="Exclude Entries"
        message={
          singleExcludeId
            ? twoLineMessage('Move this entry to Excluded Entries?', 'You can restore it later.')
            : twoLineMessage(
                `Move ${selectedCount} selected ${entryWord(selectedCount)} to Excluded Entries?`,
                'You can restore them later.',
              )
        }
        confirmLabel="Exclude"
        variant="warning"
        loading={excludeEntries.isPending}
        onConfirm={handleExclude}
        onCancel={() => {
          setConfirmExclude(false);
          setSingleExcludeId(null);
        }}
      />

      <ConfirmModal
        open={confirmDeletePermanent}
        title="Delete Permanently"
        message={
          singleDeleteId
            ? twoLineMessage('Permanently delete this entry?', 'This cannot be restored.')
            : twoLineMessage(
                `Permanently delete ${selectedCount} selected ${entryWord(selectedCount)}?`,
                'This cannot be restored.',
              )
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deletePermanent.isPending}
        onConfirm={handleDeletePermanent}
        onCancel={() => {
          setConfirmDeletePermanent(false);
          setSingleDeleteId(null);
        }}
      />
    </div>
  );
}
