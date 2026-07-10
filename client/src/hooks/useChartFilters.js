import { useState } from 'react';
import { getCurrentFinancialYear, getFinancialYearOptions } from '../utils/financialYear';

// FY (+ optional month) filter state shared by the dashboard chart cards —
// each chart owns its own instance, so filters stay independent per card.
export const useChartFilters = () => {
  const [financialYear, setFinancialYear] = useState(getCurrentFinancialYear);
  const [month, setMonth] = useState('');
  const fyOptions = getFinancialYearOptions(1);

  return { financialYear, setFinancialYear, month, setMonth, fyOptions };
};
