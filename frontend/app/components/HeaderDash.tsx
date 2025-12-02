const stats = [
  { title: "Real-time Consumption (W)", value: 1204, delta: 1.5, tone: "text-[#0b6b6b]" },
  { title: "Real-time Production (W)", value: 850, delta: -0.8, tone: "text-red-400" },
  { title: "Net Grid Flow (W)", value: -354, delta: 2.1, tone: "text-[#0b6b6b]" },
  { title: "Today's Consumption (kWh)", value: 15.2, delta: -5.0, tone: "text-red-400" },
];

function adjustStat(base: number, offset: number) {
  return Math.max(0, Math.round((base + offset) * 10) / 10);
}

type HeaderDashProps = {
  selectedHousehold?: string | null;
  contextLabel?: string;
};

export default function HeaderDash({ selectedHousehold, contextLabel }: HeaderDashProps) {
  const offset = selectedHousehold ? parseInt(selectedHousehold.replace(/\D/g, ""), 10) % 40 : 0;

  return (
    <section className="mx-auto w-full max-w-screen-2xl px-6 pb-6 pt-0">
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="flex flex-1 flex-col gap-2 rounded-xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.4)]"
          >
            <p className="text-sm font-medium">{stat.title}</p>
            <p className="text-3xl font-bold tracking-tight">
              {adjustStat(stat.value, offset).toLocaleString()}
            </p>
            <p className={`text-sm font-medium ${stat.tone}`}>
              {stat.delta + offset * 0.01 > 0 ? "+" : ""}
              {(stat.delta + offset * 0.01).toFixed(1)}%
            </p>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs font-medium text-[#4a5568]">{contextLabel || "All households"}</div>
    </section>
  );
}
