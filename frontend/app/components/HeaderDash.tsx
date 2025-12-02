const stats = [
  { title: "Real-time Consumption (W)", value: "1,204", delta: "+1.5%", tone: "text-emerald-600" },
  { title: "Real-time Production (W)", value: "850", delta: "-0.8%", tone: "text-red-500" },
  { title: "Net Grid Flow (W)", value: "-354", delta: "+2.1%", tone: "text-emerald-600" },
  { title: "Today's Consumption (kWh)", value: "15.2", delta: "-5.0%", tone: "text-red-500" },
];

const history = [
  { ts: "2023-10-27 14:30:00", consumption: 1250, production: 840 },
  { ts: "2023-10-27 14:29:00", consumption: 1198, production: 855 },
  { ts: "2023-10-27 14:28:00", consumption: 1215, production: 862 },
  { ts: "2023-10-27 14:27:00", consumption: 1180, production: 870 },
  { ts: "2023-10-27 14:26:00", consumption: 1202, production: 865 },
];

export default function HeaderDash() {
  return (
    <section className="mx-auto w-full max-w-screen-2xl px-6 pb-8 pt-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
        <a className="transition hover:text-emerald-600" href="#">
          Dashboard
        </a>
        <span>/</span>
        <span className="text-zinc-700">Household #12</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-[#11221a] via-[#13281f] to-[#0c1c15] px-6 py-6 text-white shadow-sm">
        <div className="flex min-w-72 flex-col gap-2">
          <p className="text-3xl font-black leading-tight md:text-4xl">Household #12 Details</p>
          <p className="text-sm text-[#9db9ab]">
            Real-time energy consumption and production monitoring.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-[#3b5447] px-4 py-2">
          <div className="relative flex items-center">
            <span className="absolute h-2 w-2 rounded-full bg-emerald-400 opacity-80 animate-ping" />
            <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <span className="text-sm font-medium text-white">Live</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="flex flex-1 flex-col gap-2 rounded-xl border border-[#3b5447] bg-[#11221a] px-5 py-5 text-white"
          >
            <p className="text-sm font-medium">{stat.title}</p>
            <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
            <p className={`text-sm font-medium ${stat.tone}`}>{stat.delta}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-[#3b5447] bg-[#11221a] px-5 py-5 text-white shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold">Energy Usage Over Time</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {["Last Hour", "24 Hours", "7 Days", "30 Days", "Custom"].map((label, idx) => (
                <button
                  key={label}
                  className={`flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition ${
                    idx === 0
                      ? "bg-emerald-500 text-black"
                      : "bg-[#1a3327] text-white hover:bg-[#234132]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex h-80 w-full items-center justify-center rounded-xl border border-[#3b5447] bg-[#1a2c23]/60 text-center text-[#9db9ab]">
            <div>
              <div className="text-4xl">📈</div>
              <p className="mt-2 text-lg font-semibold">Interactive Time-Series Chart Area</p>
              <p className="text-sm">Data visualization would render here.</p>
            </div>
          </div>
        </div>


      </div>
    </section>
  );
}
