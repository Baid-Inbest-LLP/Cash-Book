import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useDeleteExpenseHead, useExpenseHeads } from '../../hooks/useExpenseHeads';
import { getApiErrorMessage } from '../../lib/queryClient';
import ExpenseHeadForm from './ExpenseHeadForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import DataTable from '../../components/common/DataTable';
import PageBanner from '../../components/common/PageBanner';
import RowActions from '../../components/common/RowActions';
import { DEFAULT_PAGE_SIZE } from '../../constants';

export default function ExpenseHeadManagementPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search.trim(), 300);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editHead, setEditHead] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => setPage(1), [debouncedSearch]);

  const {
    data,
    isLoading: loading,
    isError,
    error: queryError,
  } = useExpenseHeads({
    activeOnly: false,
    page,
    limit: DEFAULT_PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });
  const expenseHeads = data?.expenseHeads ?? [];
  const pagination = data?.pagination ?? { page: 1, pages: 1, total: 0 };
  const error = isError ? getApiErrorMessage(queryError, 'Failed to fetch expense heads') : null;

  const deleteExpenseHead = useDeleteExpenseHead();

  const handleDelete = () => {
    if (!confirmDelete) return;
    deleteExpenseHead.mutate(confirmDelete._id, {
      onSuccess: () => notifications.show({ message: 'Expense head deleted', color: 'green' }),
      onError: (err) =>
        notifications.show({
          message: getApiErrorMessage(err, 'Delete failed'),
          color: 'red',
        }),
      onSettled: () => setConfirmDelete(null),
    });
  };

  const handleEdit = (head) => {
    setEditHead(head);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditHead(null);
  };

  const columns = [
    { key: 'name', header: 'Name', className: 'settings-user-name' },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (head) => (
        <span className={head.isActive ? 'company-status-active' : 'company-status-inactive'}>
          {head.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (head) => (
        <RowActions
          onEdit={() => handleEdit(head)}
          onDelete={() => setConfirmDelete({ _id: head._id, name: head.name })}
          editProps={{ title: 'Edit', ariaLabel: `Edit ${head.name}` }}
          deleteProps={{ title: 'Delete', ariaLabel: `Delete ${head.name}` }}
        />
      ),
    },
  ];

  return (
    <div>
      <PageBanner
        className="mb-4"
        title="Expense Heads"
        subtitle={`Categories used to classify payments · ${pagination.total} head${
          pagination.total !== 1 ? 's' : ''
        }`}
        action={{ onClick: () => setShowForm(true), label: 'Add Expense Head' }}
      />

      <div className="card p-4 mb-4 flex justify-end">
        <input
          className="input-field max-w-sm"
          placeholder="Search expense heads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="card p-4 mb-4 company-error-alert">{error}</div>}

      <DataTable
        columns={columns}
        data={expenseHeads}
        loading={loading}
        emptyTitle={debouncedSearch ? 'No matching expense heads' : 'No expense heads yet'}
        emptyDescription={
          debouncedSearch ? 'Try a different search term' : 'Add your first expense head to get started'
        }
        emptyAction={
          !debouncedSearch ? { label: 'Add Expense Head', onClick: () => setShowForm(true) } : undefined
        }
        pagination={{ ...pagination, onPageChange: setPage }}
      />

      {showForm && <ExpenseHeadForm expenseHead={editHead} onClose={handleClose} />}

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Expense Head"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This cannot be restored.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
