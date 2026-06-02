export default function AdminLoading() {
  return (
    <div className="app-page">
      {/* Header skeleton */}
      <header className="app-header px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-8 w-48" />
            <div className="skeleton mt-1 h-4 w-72" />
          </div>
          <div className="skeleton h-11 w-40 rounded-md" />
        </div>
      </header>

      {/* Content skeleton */}
      <div className="px-4 py-5 sm:px-6 lg:px-8">
        {/* Metric cards */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-[var(--border-soft)] bg-white p-4">
              <div className="skeleton h-10 w-10 rounded-lg" />
              <div className="skeleton mt-3 h-7 w-16" />
              <div className="skeleton mt-1.5 h-4 w-28" />
              <div className="skeleton mt-2 h-3 w-40" />
            </div>
          ))}
        </div>

        {/* Two-column section */}
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-[var(--border-soft)] bg-white p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="skeleton h-5 w-36" />
                <div className="skeleton h-6 w-20 rounded-md" />
              </div>
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, cardIndex) => (
                  <div
                    key={cardIndex}
                    className="rounded-lg bg-[var(--cream)] p-3"
                  >
                    <div className="skeleton h-4 w-32" />
                    <div className="skeleton mt-1.5 h-3 w-48" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
