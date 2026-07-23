import { Controller, useForm } from 'react-hook-form';
import { notifications } from '@mantine/notifications';
import { DatePickerInput } from '@mantine/dates';
import { useCreatePayment, useCreateReceipt, useUpdateEntry } from '../../hooks/useEntries';
import { getApiErrorMessage } from '../../lib/queryClient';
import CurrencyInput from '../../components/common/CurrencyInput';

const toDateInputValue = (date) => new Date(date).toISOString().slice(0, 10);
const todayInputValue = () => toDateInputValue(new Date());

const MAX_DATE = new Date();

export default function EntryForm({ entry, initialType, companies, expenseHeads, onClose }) {
  const isEdit = Boolean(entry);
  const createReceipt = useCreateReceipt();
  const createPayment = useCreatePayment();
  const updateEntry = useUpdateEntry();
  const submitting = createReceipt.isPending || createPayment.isPending || updateEntry.isPending;

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      type: entry?.type || initialType || 'receipt',
      date: entry?.date ? toDateInputValue(entry.date) : todayInputValue(),
      company: entry?.company?._id || '',
      expenseHead: entry?.expenseHead?._id || '',
      amount: entry?.amount ?? '',
      description: entry?.description || '',
    },
  });

  const type = watch('type');
  const isPayment = type === 'payment';

  const onSubmit = async (data) => {
    const base = {
      date: data.date,
      amount: Number(data.amount),
      description: data.description?.trim() || '',
    };

    try {
      if (isEdit) {
        await updateEntry.mutateAsync({
          id: entry._id,
          data: {
            ...base,
            type: data.type,
            company: isPayment ? data.company : data.company || null,
            expenseHead: isPayment ? data.expenseHead : null,
          },
        });
      } else if (isPayment) {
        await createPayment.mutateAsync({
          ...base,
          company: data.company,
          expenseHead: data.expenseHead,
        });
      } else {
        await createReceipt.mutateAsync({
          ...base,
          company: data.company || undefined,
        });
      }
      notifications.show({ message: isEdit ? 'Entry updated' : 'Entry created', color: 'green' });
      onClose();
    } catch (err) {
      notifications.show({
        message: getApiErrorMessage(err, 'Something went wrong'),
        color: 'red',
      });
    }
  };

  const inputCls = (err) => `input-field ${err ? 'border-red-400 focus:ring-red-400' : ''}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={submitting ? undefined : onClose}
    >
      <div
        className="company-form-panel max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-form-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="company-form-header">
          <div>
            <h2 id="entry-form-title" className="company-form-title">
              {isEdit ? 'Edit Entry' : isPayment ? 'Add Payment' : 'Add Receipt'}
            </h2>
            <p className="company-form-subtitle">
              {isEdit ? 'Update this cash book entry' : 'Record a new cash book entry'}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="company-form-field-label">
                Type <span className="text-red-500">*</span>
              </label>
              <select className="input-field" disabled={!isEdit} {...register('type')}>
                <option value="receipt">Receipt</option>
                <option value="payment">Payment</option>
              </select>
            </div>

            <div>
              <label className="company-form-field-label">
                Date <span className="text-red-500">*</span>
              </label>
              <Controller
                name="date"
                control={control}
                rules={{ required: 'Date is required' }}
                render={({ field }) => (
                  <DatePickerInput
                    placeholder="Select date"
                    valueFormat="DD MMM YYYY"
                    maxDate={MAX_DATE}
                    value={field.value || null}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    classNames={{ input: inputCls(errors.date) }}
                  />
                )}
              />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
            </div>

            {isPayment && (
              <div>
                <label className="company-form-field-label">
                  Company <span className="text-red-500">*</span>
                </label>
                <select
                  className={inputCls(errors.company)}
                  {...register('company', {
                    validate: (value) => !!value || 'Company is required for payments',
                  })}
                >
                  <option value="">Select company</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.company && (
                  <p className="text-red-500 text-xs mt-1">{errors.company.message}</p>
                )}
              </div>
            )}

            {isPayment && (
              <div>
                <label className="company-form-field-label">
                  Expense Head <span className="text-red-500">*</span>
                </label>
                <select
                  className={inputCls(errors.expenseHead)}
                  {...register('expenseHead', {
                    validate: (value) => !!value || 'Expense head is required',
                  })}
                >
                  <option value="">Select expense head</option>
                  {expenseHeads.map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.name}
                    </option>
                  ))}
                </select>
                {errors.expenseHead && (
                  <p className="text-red-500 text-xs mt-1">{errors.expenseHead.message}</p>
                )}
              </div>
            )}

            <div className="col-span-2">
              <label className="company-form-field-label">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  ₹
                </span>
                <Controller
                  name="amount"
                  control={control}
                  rules={{
                    required: 'Amount is required',
                    validate: (value) => Number(value) > 0 || 'Amount must be greater than 0',
                  }}
                  render={({ field }) => (
                    <CurrencyInput
                      {...field}
                      className={`${inputCls(errors.amount)} pl-7`}
                      placeholder="0.00"
                    />
                  )}
                />
              </div>
              {errors.amount && (
                <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="company-form-field-label">Description</label>
              <textarea
                rows={3}
                maxLength={200}
                className={inputCls(errors.description)}
                placeholder="Optional note about this entry"
                {...register('description', {
                  maxLength: { value: 200, message: 'Description must be at most 200 characters' },
                })}
              />
              {errors.description ? (
                <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
              ) : (
                <p className="company-form-section-hint mt-1">Max 200 characters</p>
              )}
            </div>
          </div>

          <div className="company-form-footer">
            <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving...' : isEdit ? 'Update Entry' : 'Create Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
