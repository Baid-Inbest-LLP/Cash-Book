import { formatCurrency } from '../../utils/format';
import { paymentsIcon, receiptsIcon, trendDownIcon, trendUpIcon, walletIcon } from './reportIcons';

export const buildSummaryStatItems = (summary) => [
  { label: 'Opening balance', value: formatCurrency(summary.fyOpeningBalance), icon: walletIcon },
  {
    label: 'Total receipts',
    value: formatCurrency(summary.totalReceipts),
    valueClassName: 'text-emerald-700',
    icon: receiptsIcon,
    iconClassName: 'bg-emerald-50 text-emerald-600',
  },
  {
    label: 'Total payments',
    value: formatCurrency(summary.totalPayments),
    valueClassName: 'text-red-600',
    icon: paymentsIcon,
    iconClassName: 'bg-red-50 text-red-600',
  },
  {
    label: 'Net movement',
    value: formatCurrency(summary.netMovement),
    valueClassName: summary.netMovement >= 0 ? 'text-emerald-700' : 'text-red-600',
    icon: summary.netMovement >= 0 ? trendUpIcon : trendDownIcon,
    iconClassName: summary.netMovement >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600',
  },
  {
    label: 'Closing balance',
    value: formatCurrency(summary.fyClosingBalance),
    icon: walletIcon,
    iconClassName: 'bg-slate-100 text-slate-600',
  },
];
