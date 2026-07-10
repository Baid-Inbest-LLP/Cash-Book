import { DatePickerInput } from '@mantine/dates';
import { FY_MONTH_ORDER, MONTHS } from '../../constants';
import { getFinancialYearOptions } from '../../utils/financialYear';

const EMPTY_FILTERS = {
  type: '',
  month: '',
  company: '',
  expenseHead: '',
  fromDate: '',
  toDate: '',
  search: '',
};

// Hoisted so the reference is stable across renders — a fresh `new Date()` every
// render was resetting the calendar's in-progress range selection after one click.
const MAX_DATE = new Date();

export default function EntryFilterBar({ filters, onChange, companies, expenseHeads }) {
  const fyOptions = getFinancialYearOptions(1);

  const set = (patch) => onChange(patch);
  const reset = () => onChange({ ...EMPTY_FILTERS, financialYear: filters.financialYear });

  // @mantine/dates normalizes range values to "YYYY-MM-DD" strings — the same
  // format the filter state and the backend API already use, no conversion needed.
  const handleDateRangeChange = (value) => {
    const [from, to] = value || [];
    set({ fromDate: from || '', toDate: to || '' });
  };

  return (
    <div className="card p-4 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="input-field grow basis-[130px] min-w-[130px] cursor-pointer"
          value={filters.type}
          onChange={(e) => set({ type: e.target.value })}
        >
          <option value="">All Types</option>
          <option value="receipt">Receipt</option>
          <option value="payment">Payment</option>
        </select>

        <select
          className="input-field grow basis-[130px] min-w-[130px] cursor-pointer"
          value={filters.financialYear}
          onChange={(e) => set({ financialYear: e.target.value })}
        >
          {fyOptions.map((fy) => (
            <option key={fy} value={fy}>
              FY {fy}
            </option>
          ))}
        </select>

        <select
          className="input-field grow basis-[130px] min-w-[130px] cursor-pointer"
          value={filters.month}
          onChange={(e) => set({ month: e.target.value })}
        >
          <option value="">All Months</option>
          {FY_MONTH_ORDER.map((num) => (
            <option key={num} value={num}>
              {MONTHS[num - 1]}
            </option>
          ))}
        </select>

        <select
          className="input-field grow basis-[150px] min-w-[150px] cursor-pointer"
          value={filters.company}
          onChange={(e) => set({ company: e.target.value })}
        >
          <option value="">All Companies</option>
          {companies.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="input-field grow basis-[150px] min-w-[150px] cursor-pointer"
          value={filters.expenseHead}
          onChange={(e) => set({ expenseHead: e.target.value })}
        >
          <option value="">All Expense Heads</option>
          {expenseHeads.map((h) => (
            <option key={h._id} value={h._id}>
              {h.name}
            </option>
          ))}
        </select>

        <DatePickerInput
          type="range"
          placeholder="Select date range"
          valueFormat="DD MMM YYYY"
          maxDate={MAX_DATE}
          allowSingleDateInRange
          clearable
          value={[filters.fromDate || null, filters.toDate || null]}
          onChange={handleDateRangeChange}
          className="grow basis-[190px] min-w-[190px]"
          classNames={{ input: 'input-field' }}
        />

        <input
          className="input-field grow basis-[180px] min-w-[180px]"
          placeholder="Search by description..."
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
        />
      </div>

      <div className="flex justify-end mt-3">
        <button type="button" onClick={reset} className="btn-secondary text-xs py-1.5 px-3">
          Reset Filters
        </button>
      </div>
    </div>
  );
}
