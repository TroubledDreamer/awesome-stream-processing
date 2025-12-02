import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 text-zinc-900 transition hover:opacity-90"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-lg font-semibold text-white shadow-sm">
            EG
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-semibold">RisingWave Energy Grid</span>
            <span className="text-xs text-zinc-500">Live stream processing dashboard</span>
          </div>
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium text-zinc-700">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-emerald-100">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
          <a
            href="https://nextjs.org"
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-900 transition hover:bg-zinc-900 hover:text-white sm:inline-flex"
          >
            View Stack
          </a>
        </nav>
      </div>
    </header>
  );
}
