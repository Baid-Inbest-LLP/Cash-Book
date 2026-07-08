import { useForm } from 'react-hook-form';
import { notifications } from '@mantine/notifications';
import { useCreateExpenseHead, useUpdateExpenseHead } from '../../hooks/useExpenseHeads';
import { getApiErrorMessage } from '../../lib/queryClient';

export default function ExpenseHeadForm({ expenseHead, onClose }) {
  const isEdit = Boolean(expenseHead);
  const createExpenseHead = useCreateExpenseHead();
  const updateExpenseHead = useUpdateExpenseHead();
  const submitting = createExpenseHead.isPending || updateExpenseHead.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: expenseHead?.name || '',
      isActive: expenseHead ? expenseHead.isActive !== false : true,
    },
  });

  const onSubmit = async (data) => {
    const payload = { name: data.name.trim(), isActive: Boolean(data.isActive) };
    try {
      if (isEdit) {
        await updateExpenseHead.mutateAsync({ id: expenseHead._id, data: payload });
      } else {
        await createExpenseHead.mutateAsync(payload);
      }
      notifications.show({
        message: isEdit ? 'Expense head updated' : 'Expense head created',
        color: 'green',
      });
      onClose();
    } catch (err) {
      notifications.show({
        message: getApiErrorMessage(err, 'Something went wrong'),
        color: 'red',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="company-form-panel max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-head-form-title"
      >
        <div className="company-form-header">
          <div>
            <h2 id="expense-head-form-title" className="company-form-title">
              {isEdit ? 'Edit Expense Head' : 'Add Expense Head'}
            </h2>
            <p className="company-form-subtitle">
              {isEdit ? 'Update the expense head name or status' : 'Create a new expense head'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="company-form-close-btn"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="company-form-field-label">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              className={`input-field ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder="e.g. Rent"
              autoFocus
              {...register('name', {
                required: 'Expense head name is required',
                maxLength: { value: 100, message: 'Name must be at most 100 characters' },
              })}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="expenseHeadActive"
              className="rounded"
              {...register('isActive')}
            />
            <label htmlFor="expenseHeadActive" className="company-form-checkbox-label">
              Active
            </label>
          </div>

          <div className="company-form-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
