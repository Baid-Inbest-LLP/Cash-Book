import { useDashboardStats } from '../../hooks/useDashboard';
import { getApiErrorMessage } from '../../lib/queryClient';
import { buildLocationBreakdownStatItems, buildSummaryStatItems } from '../reports/summaryStatItems';
import StatTiles from '../reports/StatTiles';

export default function DashboardStats() {
  const {
    data: response,
    isLoading,
    isError,
    error: queryError,
  } = useDashboardStats();
  const error = isError ? getApiErrorMessage(queryError, 'Failed to load dashboard stats') : null;
  const data = response?.data;
  const perLocation = Array.isArray(data) ? data : null;

  const items = perLocation
    ? buildLocationBreakdownStatItems(perLocation)
    : data
      ? buildSummaryStatItems(data)
      : [];

  return (
    <div className="mb-4">
      {error && <div className="card p-4 mb-4 company-error-alert">{error}</div>}

      <StatTiles items={items} loading={isLoading} />
    </div>
  );
}
