import { formatCurrency } from "../../utils/format";
import {
	paymentsIcon,
	receiptsIcon,
	trendDownIcon,
	trendUpIcon,
	walletIcon,
} from "../../components/icons/reportIcons";

// One row of 5 cards (same metrics as buildSummaryStatItems), each showing a stacked
// per-location breakdown instead of a single combined number.
export const buildLocationBreakdownStatItems = (rows) => {
	const metrics = [
		{ key: "openingBalance", label: "Opening Balance", valueClassName: "text-primary-600", icon: walletIcon },
		{
			key: "totalReceipts",
			label: "Total Receipts",
			valueClassName: "text-emerald-700",
			icon: receiptsIcon,
			iconClassName: "bg-emerald-50 text-emerald-600",
		},
		{
			key: "totalPayments",
			label: "Total Payments",
			valueClassName: "text-red-600",
			icon: paymentsIcon,
			iconClassName: "bg-red-50 text-red-600",
		},
		{ key: "netMovement", label: "Net Movement", icon: trendUpIcon },
		{
			key: "closingBalance",
			label: "Closing Balance",
			icon: walletIcon,
			iconClassName: "bg-slate-100 text-slate-600",
		},
	];

	return metrics.map((metric) => ({
		label: metric.label,
		valueClassName: metric.valueClassName || "text-gray-900",
		icon: metric.icon,
		iconClassName: metric.iconClassName,
		breakdown: rows.map((row) => ({
			label: row.location.name,
			value: formatCurrency(row[metric.key]),
			valueClassName:
				metric.key === "netMovement"
					? row[metric.key] >= 0
						? "text-emerald-700"
						: "text-red-600"
					: undefined,
		})),
	}));
};

export const buildSummaryStatItems = (summary, { month } = {}) => {
	const label = (text) => (month ? text : `FY ${text}`);

	return [
		{
			label: label("Opening Balance"),
			value: formatCurrency(summary.openingBalance),
			valueClassName: "text-primary-600",
			icon: walletIcon,
		},
		{
			label: label("Total Receipts"),
			value: formatCurrency(summary.totalReceipts),
			valueClassName: "text-emerald-700",
			icon: receiptsIcon,
			iconClassName: "bg-emerald-50 text-emerald-600",
		},
		{
			label: label("Total Payments"),
			value: formatCurrency(summary.totalPayments),
			valueClassName: "text-red-600",
			icon: paymentsIcon,
			iconClassName: "bg-red-50 text-red-600",
		},
		{
			label: label("Net Movement"),
			value: formatCurrency(summary.netMovement),
			valueClassName:
				summary.netMovement >= 0 ? "text-emerald-700" : "text-red-600",
			icon: summary.netMovement >= 0 ? trendUpIcon : trendDownIcon,
			iconClassName:
				summary.netMovement >= 0
					? "bg-emerald-50 text-emerald-600"
					: "bg-red-50 text-red-600",
		},
		{
			label: label("Closing Balance"),
			value: formatCurrency(summary.closingBalance),
			icon: walletIcon,
			iconClassName: "bg-slate-100 text-slate-600",
		},
	];
};
