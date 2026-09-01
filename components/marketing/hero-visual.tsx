/* Editorial SVG illustration for hero surfaces (DESIGN.md §8, §6.2).
   Brand palette: ink core, lavender tints, orange brand accent. */

export function HeroVisual({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`relative ${className ?? ""}`}
      role="presentation"
    >
      <div className="relative overflow-hidden rounded-md border border-ink-700/60 bg-ink-900 shadow-2xl shadow-ink-950/50">
        {/* screen glow */}
        <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-ink-700/20 blur-3xl" />

        {/* window chrome */}
        <div className="relative flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-700/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-terracotta-500/70" />
          <span className="ml-3 h-5 flex-1 rounded-sm bg-white/10" />
        </div>

        {/* workspace */}
        <div className="relative flex gap-3 p-4">
          {/* sidebar */}
          <div className="hidden w-24 shrink-0 flex-col gap-2 sm:flex">
            {[0, 1, 2, 3].map((row) => (
              <div
                key={row}
                className={`h-2.5 rounded-full ${
                  row === 0 ? "w-4/5 bg-terracotta-500/80" : "w-3/4 bg-white/15"
                }`}
              />
            ))}
            <div className="mt-auto h-2.5 w-1/2 rounded-full bg-ink-700/50" />
          </div>

          {/* main board */}
          <div className="flex-1 rounded-md bg-ink-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="h-3 w-2/5 rounded-full bg-white/30" />
              <div className="hidden h-6 items-center rounded-full bg-terracotta-600 px-3 sm:inline-flex">
                <div className="h-1.5 w-12 rounded-full bg-white/80" />
              </div>
            </div>

            {/* roadmap path */}
            <svg className="mt-5 w-full" viewBox="0 0 420 120">
              <path
                d="M10 60 H 150 L 210 28 H 340 L 410 60"
                fill="none"
                stroke="var(--color-ink-700)"
                strokeOpacity="0.55"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <circle cx="10" cy="60" r="7" fill="var(--color-ink-950)" stroke="var(--color-ink-700)" strokeWidth="2" />
              <circle cx="210" cy="28" r="9" fill="var(--color-terracotta-600)" stroke="var(--color-terracotta-500)" strokeWidth="2" />
              <circle cx="340" cy="28" r="6" fill="var(--color-ink-950)" stroke="var(--color-ink-700)" strokeWidth="2" />
              <circle cx="410" cy="60" r="5" fill="var(--color-ink-950)" stroke="var(--color-lavender-200)" strokeWidth="2" />
            </svg>

            {/* rows */}
            <div className="mt-2 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 shrink-0 rounded-sm bg-terracotta-600/80" />
                <div className="h-2.5 w-3/4 rounded-full bg-white/25" />
              </div>
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 shrink-0 rounded-sm bg-white/12" />
                <div className="h-2.5 w-2/3 rounded-full bg-white/15" />
              </div>
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 shrink-0 rounded-sm bg-ink-700/40" />
                <div className="h-2.5 w-1/2 rounded-full bg-white/15" />
              </div>
            </div>

            {/* sparkline */}
            <svg className="mt-4 w-full" viewBox="0 0 420 44">
              <path
                d="M0 34 L80 30 L150 22 L230 24 L300 12 L420 6"
                fill="none"
                stroke="var(--color-terracotta-500)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* floating receipt chip */}
        <div className="relative flex items-center gap-3 border-t border-white/10 bg-ink-800/60 px-4 py-3">
          <span className="font-sans text-xs font-bold text-lavender-200">
            QL
          </span>
          <div className="h-2 w-24 rounded-full bg-white/20" />
          <div className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
            <span className="animate-soft-pulse h-1.5 w-1.5 rounded-full bg-success-600" />
            <span className="text-[10px] font-semibold text-lavender-200">
              verified
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}