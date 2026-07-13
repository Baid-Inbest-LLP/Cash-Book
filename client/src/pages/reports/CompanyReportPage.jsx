import { useState } from 'react';
import {
  useCompanyReport,
  useExportCompaniesExcel,
  useExportCompaniesPdf,
} from '../../hooks/useReports';
import { getApiErrorMessage } from '../../lib/queryClient';
import { getCurrentFinancialYear, getFinancialYearOptions } from '../../utils/financialYear';
import { formatCurrency } from '../../utils/format';
import DataTable from '../../components/common/DataTable';
import PageBanner from '../../components/common/PageBanner';
import StatTiles from './StatTiles';
import { buildSummaryStatItems } from './summaryStatItems';
import { FinancialYearSelect, MonthSelect } from './ReportFilters';
import ShareBar from './ShareBar';

export default function CompanyReportPage() {
  const [financialYear, setFinancialYear] = useState(getCurrentFinancialYear);
  const [month, setMonth] = useState('');
  const fyOptions = getFinancialYearOptions(1);

  const params = { financialYear, ...(month && { month }) };

  const { data, isLoading, isError, error: queryError } = useCompanyReport(params);
  const rows = data?.companies ?? [];
  const error = isError ? getApiErrorMessage(queryError, 'Failed to fetch company report') : null;

  const exportExcel = useExportCompaniesExcel();
  const exportPdf = useExportCompaniesPdf();

  const columns = [
    { key: 'company', header: 'Company', render: (row) => row.company?.name || '-' },
    {
      key: 'paymentAmount',
      header: 'Payment Amount',
      align: 'right',
      render: (row) => <span className="text-red-600 font-semibold">{formatCurrency(row.paymentAmount)}</span>,
    },
    { key: 'paymentCount', header: 'Payments Count', align: 'center', render: (row) => row.paymentCount },
    {
      key: 'percentage',
      header: 'Share(%)',
      headerAlign: 'center',
      width: '180px',
      render: (row) => <ShareBar percentage={row.percentage} />,
    },
  ];

  return (
    <div>
      <PageBanner
        className="mb-4"
        title="Company Report"
        subtitle={`FY ${financialYear} · Payment totals grouped by company`}
        action={[
          {
            onClick: () => exportExcel.mutate(params),
            label: exportExcel.isPending ? 'Exporting...' : 'Export to Excel',
            icon: 'excel',
            iconOnly: true,
            disabled: exportExcel.isPending,
          },
          {
            onClick: () => exportPdf.mutate(params),
            label: exportPdf.isPending ? 'Exporting...' : 'Export to PDF',
            icon: 'pdf',
            iconOnly: true,
            disabled: exportPdf.isPending,
          },
        ]}
      />

      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <FinancialYearSelect value={financialYear} onChange={setFinancialYear} options={fyOptions} />
        <MonthSelect value={month} onChange={setMonth} />
      </div>

      {error && <div className="card p-4 mb-4 company-error-alert">{error}</div>}

      {isLoading ? (
        <StatTiles loading />
      ) : (
        data && <StatTiles items={buildSummaryStatItems(data.summary, { month })} />
      )}

      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        rowKey={(row, i) => row.company?.code ?? i}
        emptyTitle="No payments yet"
        emptyDescription="No payments recorded for the selected filters."
        serialNumber
      />
    </div>
  );
}
