const stats = [
  { title: "Real-time Consumption (W)", value: "1,204", delta: "+1.5%", tone: "text-[#E1FFBB]" },
  { title: "Real-time Production (W)", value: "850", delta: "-0.8%", tone: "text-red-400" },
  { title: "Net Grid Flow (W)", value: "-354", delta: "+2.1%", tone: "text-[#E1FFBB]" },
  { title: "Today's Consumption (kWh)", value: "15.2", delta: "-5.0%", tone: "text-red-400" },
];

export default function HeaderDash() {
  return (
    <section className="mx-auto w-full max-w-screen-2xl px-6 pb-6 pt-0">
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="flex flex-1 flex-col gap-2 rounded-xl border border-[#0b6b6b] bg-gradient-to-br from-[#0b1b33] via-[#0f304a] to-[#0b5155] px-5 py-5 text-white shadow-[0_12px_30px_-12px_rgba(0,48,92,0.5)]"
          >
            <p className="text-sm font-medium">{stat.title}</p>
            <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
            <p className={`text-sm font-medium ${stat.tone}`}>{stat.delta}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
