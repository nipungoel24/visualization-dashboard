import { Suspense } from "react";

import { Dashboard } from "@/components/dashboard/Dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Providers } from "./providers";

function DashboardFallback() {
  return (
    <div className="min-h-dvh" aria-label="Loading dashboard">
      <div className="h-14 border-b border-border" />
      <div className="mx-auto flex max-w-[1400px] items-start">
        <div className="hidden w-68 shrink-0 px-4 py-4 lg:block">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="mt-3 h-8 w-full" />
          <Skeleton className="mt-3 h-8 w-full" />
        </div>
        <div className="min-w-0 flex-1 space-y-4 px-3 py-4 sm:px-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Providers>
      <Suspense fallback={<DashboardFallback />}>
        <Dashboard />
      </Suspense>
    </Providers>
  );
}
