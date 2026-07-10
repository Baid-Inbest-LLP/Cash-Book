import Skeleton from '../../components/common/Skeleton';

export function ChartCardHeader({ icon, badgeClassName, title, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h3 className="flex items-center gap-2.5 text-lg font-semibold text-gray-700">
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${badgeClassName}`}>
          {icon}
        </span>
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function ChartCardState({ isLoading, error, isEmpty, emptyMessage }) {
  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="rounded-lg border px-4 py-3 company-error-alert">{error}</p>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="company-empty-desc">{emptyMessage}</p>
      </div>
    );
  }

  return null;
}
