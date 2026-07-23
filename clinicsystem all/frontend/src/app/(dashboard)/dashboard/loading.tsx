export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* KPI skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="h-72 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        <div className="h-72 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
      </div>
    </div>
  )
}
