import { useState } from 'react';
import {
  useExportMonthwiseExcel,
  useExportMonthwisePdf,
  useMonthwiseReport,
} from '../../hooks/useReports';
import { requireCompanySelected } from '../../utils/download';
import { getApiErrorMessage } from '../../lib/queryClient';
import { getCurrentFinancialYear, getFinancialYearOptions } from '../../utils/financialYear';
import { formatCurrency } from '../../utils/format';
import { MONTHS } from '../../constants';
import DataTable from '../../components/common/DataTable';
import PageBanner from '../../components/common/PageBanner';
import StatTiles from './StatTiles';
import { buildSummaryStatItems } from './summaryStatItems';
import { CompanySelect, FinancialYearSelect } from './ReportFilters';

export default function MonthwiseReportPage() {
  const [financialYear, setFinancialYear] = useState(getCurrentFinancialYear);
  const [company, setCompany] = useState('');
  const fyOptions = getFinancialYearOptions(1);

  const params = { financialYear, ...(company && { company }) };

  const { data, isLoading, isError, error: queryError } = useMonthwiseReport(params);
  const months = data?.months ?? [];
  const summary = data?.summary;
  const error = isError ? getApiErrorMessage(queryError, 'Failed to fetch monthwise report') : null;

  const exportExcel = useExportMonthwiseExcel();
  const exportPdf = useExportMonthwisePdf();

  const handleExportExcel = () => {
    if (requireCompanySelected(company)) exportExcel.mutate(params);
  };
  const handleExportPdf = () => {
    if (requireCompanySelected(company)) exportPdf.mutate(params);
  };

  const columns = [
    { key: 'month', header: 'Month', render: (row) => MONTHS[row.month - 1] },
    {
      key: 'openingBalance',
      header: 'Opening Balance',
      align: 'right',
      render: (row) => formatCurrency(row.openingBalance),
    },
    {
      key: 'receipts',
      header: 'Receipts',
      align: 'right',
      render: (row) => <span className="text-emerald-700 font-semibold">{formatCurrency(row.receipts)}</span>,
    },
    {
      key: 'payments',
      header: 'Payments',
      align: 'right',
      render: (row) => <span className="text-red-600 font-semibold">{formatCurrency(row.payments)}</span>,
    },
    {
      key: 'netMovement',
      header: 'Net Movement',
      align: 'right',
      render: (row) => (
        <span className={row.netMovement >= 0 ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
          {formatCurrency(row.netMovement)}
        </span>
      ),
    },
    {
      key: 'closingBalance',
      header: 'Closing Balance',
      align: 'right',
      render: (row) => <span className="font-semibold">{formatCurrency(row.closingBalance)}</span>,
    },
  ];

  return (
    <div>
      <PageBanner
        className="mb-4"
        title="Monthwise Ledger"
        subtitle={`FY ${financialYear} · Opening to closing balance by month`}
        action={[
          {
            onClick: handleExportExcel,
            label: exportExcel.isPending ? 'Exporting...' : 'Export to Excel',
            icon: 'excel',
            iconOnly: true,
            disabled: exportExcel.isPending,
          },
          {
            onClick: handleExportPdf,
            label: exportPdf.isPending ? 'Exporting...' : 'Export to PDF',
            icon: 'pdf',
            iconOnly: true,
            disabled: exportPdf.isPending,
          },
        ]}
      />

      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <FinancialYearSelect value={financialYear} onChange={setFinancialYear} options={fyOptions} />
        <CompanySelect value={company} onChange={setCompany} />
      </div>

      {error && <div className="card p-4 mb-4 company-error-alert">{error}</div>}

      {isLoading ? (
        <StatTiles loading />
      ) : (
        summary && <StatTiles items={buildSummaryStatItems(summary)} />
      )}

      <DataTable
        columns={columns}
        data={months}
        loading={isLoading}
        rowKey={(row) => row.month}
        emptyTitle="No data yet"
        emptyDescription="This financial year has no recorded entries yet."
        serialNumber
      />
    </div>
  );
}
