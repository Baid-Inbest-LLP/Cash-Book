import { useState } from "react";
import {
	useExpenseHeadReport,
	useExportExpenseHeadsExcel,
} from "../../hooks/useReports";
import { getApiErrorMessage } from "../../lib/queryClient";
import {
	getCurrentFinancialYear,
	getFinancialYearOptions,
} from "../../utils/financialYear";
import { formatCurrency } from "../../utils/format";
import DataTable from "../../components/common/DataTable";
import PageBanner from "../../components/common/PageBanner";
import StatTiles from "./StatTiles";
import { buildSummaryStatItems } from "./summaryStatItems";
import {
	CompanySelect,
	FinancialYearSelect,
	MonthSelect,
} from "./ReportFilters";
import ShareBar from "./ShareBar";

export default function ExpenseHeadReportPage() {
	const [financialYear, setFinancialYear] = useState(getCurrentFinancialYear);
	const [month, setMonth] = useState("");
	const [company, setCompany] = useState("");
	const fyOptions = getFinancialYearOptions(1);

	const params = {
		financialYear,
		...(month && { month }),
		...(company && { company }),
	};

	const {
		data,
		isLoading,
		isError,
		error: queryError,
	} = useExpenseHeadReport(params);
	const rows = data?.expenseHeads ?? [];
	const error = isError
		? getApiErrorMessage(queryError, "Failed to fetch expense-head report")
		: null;

	const exportExcel = useExportExpenseHeadsExcel();

	const columns = [
		{
			key: "expenseHead",
			header: "Expense Head",
			render: (row) => row.expenseHead?.name || "-",
		},
		{
			key: "paymentAmount",
			header: "Payment Amount",
			align: "right",
			render: (row) => (
				<span className="text-red-600 font-semibold">
					{formatCurrency(row.paymentAmount)}
				</span>
			),
		},
		{
			key: "paymentCount",
			header: "Payments Count",
			align: "center",
			render: (row) => row.paymentCount,
		},
		{
			key: "percentage",
			header: "Share(%)",
			headerAlign: "center",
			width: "180px",
			render: (row) => <ShareBar percentage={row.percentage} />,
		},
	];

	return (
		<div>
			<PageBanner
				className="mb-4"
				title="Expense Head Report"
				subtitle={`FY ${financialYear} · Payment totals grouped by expense head`}
				action={[
					{
						onClick: () => exportExcel.mutate(params),
						label: exportExcel.isPending ? "Exporting..." : "Export to Excel",
						icon: "excel",
						iconOnly: true,
						disabled: exportExcel.isPending,
					},
					{
						label: "Export to PDF",
						icon: "pdf",
						iconOnly: true,
					},
				]}
			/>

			<div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
				<FinancialYearSelect
					value={financialYear}
					onChange={setFinancialYear}
					options={fyOptions}
				/>
				<MonthSelect value={month} onChange={setMonth} />
				<CompanySelect value={company} onChange={setCompany} />
			</div>

			{error && (
				<div className="card p-4 mb-4 company-error-alert">{error}</div>
			)}

			{isLoading ? (
				<StatTiles loading />
			) : (
				data && (
					<StatTiles
						items={buildSummaryStatItems(data.summary, { month })}
					/>
				)
			)}

			<DataTable
				columns={columns}
				data={rows}
				loading={isLoading}
				rowKey={(row, i) => row.expenseHead?.name ?? i}
				emptyTitle="No payments yet"
				emptyDescription="No payments recorded for the selected filters."
			/>
		</div>
	);
}
