import { formatCurrency } from "../../utils/format";
import {
	paymentsIcon,
	receiptsIcon,
	trendDownIcon,
	trendUpIcon,
	walletIcon,
} from "./reportIcons";

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
