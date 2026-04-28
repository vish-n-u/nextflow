/**
 * Shown by Next.js while the dashboard JS chunk is loading or during
 * server-side data fetching. Keeps the layout stable and prevents a flash
 * of blank content.
 */
export default function DashboardLoading() {
  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] overflow-hidden">
      {/* TopBar skeleton */}
      <div className="h-12 shrink-0 flex items-center justify-between px-3 bg-zinc-950 border-b border-zinc-800 gap-2">
        <div className="w-24 h-5 bg-zinc-800 rounded-md animate-pulse" />
        <div className="w-40 h-5 bg-zinc-800 rounded-md animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="w-16 h-7 bg-zinc-800 rounded-full animate-pulse" />
          <div className="w-16 h-7 bg-zinc-800 rounded-full animate-pulse" />
          <div className="w-16 h-7 bg-zinc-800 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Main area skeleton */}
      <div className="flex flex-1 overflow-hidden">
        {/* LeftBar skeleton — hidden on mobile */}
        <div className="hidden md:flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 p-3 gap-3">
          <div className="h-7 bg-zinc-800 rounded-lg animate-pulse" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-zinc-800/60 rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Canvas skeleton */}
        <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
        </div>

        {/* RightBar skeleton — hidden on mobile */}
        <div className="hidden md:flex w-64 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950 p-3 gap-3">
          <div className="h-8 bg-zinc-800 rounded-lg animate-pulse" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-zinc-800/60 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
