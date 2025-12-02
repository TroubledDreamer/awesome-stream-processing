export default function Header() {
  return (
    <section className="mx-auto w-full max-w-screen-2xl px-6 pb-4 pt-4">


      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-[#11221a] via-[#13281f] to-[#0c1c15] px-6 py-6 text-white shadow-sm">
        <div className="flex min-w-72 flex-col gap-2">
          <p className="text-3xl font-black leading-tight md:text-4xl">RisingWave Energy Grid</p>
          <p className="text-sm text-[#9db9ab]">
            Real-time energy consumption and production monitoring.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-[#3b5447] px-4 py-2">
          <div className="relative flex items-center">
            <span className="absolute h-2 w-2 rounded-full bg-emerald-400 opacity-80 animate-ping" />
            <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <span className="text-sm font-medium text-white">Alert</span>

          <span className="text-sm font-medium text-white">Live</span>
        </div>
      </div>
    </section>
  );
}
