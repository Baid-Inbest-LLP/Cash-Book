import Skeleton from '../../components/common/Skeleton';

function StatTile({ label, value, valueClassName = 'text-gray-900', icon, iconClassName = 'bg-primary-50 text-primary-600' }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      {icon && (
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 [&>svg]:w-5 [&>svg]:h-5 ${iconClassName}`}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className={`text-2xl font-semibold mt-1 ${valueClassName}`}>{value}</p>
      </div>
    </div>
  );
}

function StatTileSkeleton() {
  return (
    <div className="card p-4 flex items-start gap-3">
      <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-6 w-4/5 mt-2" />
      </div>
    </div>
  );
}

export default function StatTiles({ items, loading = false, skeletonCount = 5 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {loading
        ? Array.from({ length: skeletonCount }).map((_, i) => <StatTileSkeleton key={i} />)
        : items.map((item) => <StatTile key={item.label} {...item} />)}
    </div>
  );
}
