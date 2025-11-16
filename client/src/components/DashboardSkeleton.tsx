// ⚡ OTIMIZAÇÃO #14: Skeleton Loading para melhor UX
// Loading progressivo que mostra a estrutura da página enquanto carrega

import { memo } from 'react';

// ⚡ OTIMIZAÇÃO #22: React.memo para evitar re-renders desnecessários
export const DashboardSkeleton = memo(() => {
  return (
    <div className="min-h-screen bg-background p-4 space-y-6 animate-pulse">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-32 bg-muted rounded-lg border border-border"
          >
            <div className="p-4 space-y-3">
              <div className="h-4 bg-muted-foreground/20 rounded w-1/3"></div>
              <div className="h-8 bg-muted-foreground/20 rounded w-2/3"></div>
              <div className="h-3 bg-muted-foreground/10 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar Skeleton */}
      <div className="h-12 bg-muted rounded-lg border border-border"></div>

      {/* Filters Bar Skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="h-10 bg-muted rounded-md border border-border w-32"
          ></div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 border-b border-border">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className="h-4 bg-muted-foreground/20 rounded col-span-2"
            ></div>
          ))}
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="grid grid-cols-12 gap-4 p-4">
              {[1, 2, 3, 4, 5, 6].map(j => (
                <div
                  key={j}
                  className="h-4 bg-muted rounded col-span-2"
                ></div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info Skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-4 bg-muted rounded w-48"></div>
        <div className="h-4 bg-muted rounded w-32"></div>
      </div>
    </div>
  );
});

// ⚡ Variante mobile do skeleton
// ⚡ OTIMIZAÇÃO #22: React.memo para evitar re-renders desnecessários
export const DashboardSkeletonMobile = memo(() => {
  return (
    <div className="min-h-screen bg-background p-3 space-y-4 animate-pulse">
      {/* Stats Cards Mobile - Vertical */}
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-24 bg-muted rounded-lg border border-border p-3"
          >
            <div className="space-y-2">
              <div className="h-3 bg-muted-foreground/20 rounded w-1/3"></div>
              <div className="h-6 bg-muted-foreground/20 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar Mobile */}
      <div className="h-10 bg-muted rounded-lg border border-border"></div>

      {/* Cards List Mobile */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="h-32 bg-card rounded-lg border border-border p-3"
          >
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
              <div className="flex gap-2 mt-2">
                <div className="h-6 bg-muted rounded w-16"></div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
