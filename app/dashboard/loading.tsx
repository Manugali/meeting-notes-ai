export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          {/* Header skeleton */}
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          
          {/* Cards skeleton */}
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          
          {/* Meetings skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

