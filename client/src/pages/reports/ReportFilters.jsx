import { useCompanies } from '../../hooks/useCompanies';
import { FY_MONTH_ORDER, MONTHS } from '../../constants';

export function FinancialYearSelect({ value, onChange, options }) {
  return (
    <select
      className="input-field grow basis-[130px] min-w-[130px]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((fy) => (
        <option key={fy} value={fy}>
          FY {fy}
        </option>
      ))}
    </select>
  );
}

export function MonthSelect({ value, onChange }) {
  return (
    <select
      className="input-field grow basis-[130px] min-w-[130px]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">All Months</option>
      {FY_MONTH_ORDER.map((num) => (
        <option key={num} value={num}>
          {MONTHS[num - 1]}
        </option>
      ))}
    </select>
  );
}

export function CompanySelect({ value, onChange }) {
  const { data: companiesData } = useCompanies({ isActive: true, limit: 100 });
  const companies = companiesData?.companies ?? [];

  return (
    <select
      className="input-field grow basis-[150px] min-w-[150px]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">All Companies</option>
      {companies.map((c) => (
        <option key={c._id} value={c._id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
