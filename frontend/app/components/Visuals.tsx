type TimePoint = { label: string; consumption: number; production: number };
type Count = { label: string; value: number };

const pricePlanBreakdown: Count[] = [
  { label: "Tier", value: 11 },
  { label: "Time of Use", value: 9 },
];

const timeSeries: TimePoint[] = [
  { label: "10:00", consumption: 900, production: 960 },
  { label: "10:10", consumption: 980, production: 940 },
  { label: "10:20", consumption: 1020, production: 970 },
  { label: "10:30", consumption: 990, production: 980 },
  { label: "10:40", consumption: 1010, production: 995 },
  { label: "10:50", consumption: 1030, production: 1005 },
  { label: "11:00", consumption: 1050, production: 1010 },
];

const netFlow = timeSeries.map((p) => ({
  label: p.label,
  value: p.production - p.consumption,
}));

const topHouseholds: Count[] = [
  { label: "HH-58231", value: 1250 },
  { label: "HH-79426", value: 1198 },
  { label: "HH-10853", value: 1215 },
  { label: "HH-93104", value: 1180 },
  { label: "HH-68310", value: 1202 },
];

const planPerformance = [
  { label: "Tier", consumption: 980, production: 1020 },
  { label: "Time of Use", consumption: 1015, production: 990 },
];

const billingImpact: Count[] = [
  { label: "HH-58231", value: 67.5 },
  { label: "HH-79426", value: 78 },
  { label: "HH-10853", value: 57 },
  { label: "HH-93104", value: 91.5 },
  { label: "HH-45227", value: 64.5 },
];

const cityCounts: Count[] = [
  { label: "Springfield", value: 4 },
  { label: "Shelbyville", value: 4 },
  { label: "Ogdenville", value: 4 },
  { label: "Capital City", value: 3 },
  { label: "North Haverbrook", value: 5 },
];

function linePath(points: TimePoint[], key: "consumption" | "production", width: number, height: number) {
  const max = Math.max(...points.map((p) => Math.max(p.consumption, p.production)));
  const min = Math.min(...points.map((p) => Math.min(p.consumption, p.production)));
  const range = max - min || 1;
  return points
    .map((p, idx) => {
      const x = (idx / (points.length - 1 || 1)) * width;
      const y = height - ((p[key] - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

function Donut({ data }: { data: Count[] }) {
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  const colors = ["#0b6b6b", "#0f3a4f", "#0b1b33", "#0c777a"];
  const slices = data.reduce<
    { start: number; value: number; label: string; color: string }[]
  >((acc, slice, idx) => {
    const value = (slice.value / total) * 100;
    const start = idx === 0 ? 0 : acc[idx - 1].start + acc[idx - 1].value;
    acc.push({ start, value, label: slice.label, color: colors[idx % colors.length] });
    return acc;
  }, []);
  return (
    <div className="relative h-40 w-40">
      <svg viewBox="0 0 42 42" className="h-40 w-40 -rotate-90">
        {slices.map((slice) => (
          <circle
            key={slice.label}
            cx="21"
            cy="21"
            r="15.915"
            fill="transparent"
            stroke={slice.color}
            strokeWidth="6"
            strokeDasharray={`${slice.value} ${100 - slice.value}`}
            strokeDashoffset={-slice.start}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-sm text-[#0b1b33]">
          <p className="font-semibold text-lg">{total}</p>
          <p className="text-xs text-[#4a5568]">Households</p>
        </div>
      </div>
    </div>
  );
}

function BarList({ data, color = "#0b6b6b", suffix = "" }: { data: Count[]; color?: string; suffix?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => (
        <div key={d.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm text-[#0b1b33]">
            <span className="font-medium">{d.label}</span>
            <span className="text-xs text-[#4a5568]">
              {d.value}
              {suffix}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-[#e6edf5]">
            <div
              className="h-2 rounded-full"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Visuals() {
  const consumptionPath = linePath(timeSeries, "consumption", 300, 140);
  const productionPath = linePath(timeSeries, "production", 300, 140);

  const netMax = Math.max(...netFlow.map((n) => Math.abs(n.value)), 1);

  return (
    <section className="mx-auto w-full max-w-screen-2xl px-6 pb-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="col-span-1 rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Price Plan Mix</h2>
            <span className="text-xs text-[#4a5568]">Households</span>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <Donut data={pricePlanBreakdown} />
            <div className="space-y-3 text-sm text-[#0b1b33]">
              {pricePlanBreakdown.map((d, idx) => (
                <div key={d.label} className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: ["#0b6b6b", "#0f3a4f", "#0b1b33", "#0c777a"][idx % 4] }}
                  />
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{d.label}</span>
                    <span className="text-xs text-[#4a5568]">{d.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2 rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Consumption vs Production</h2>
            <span className="text-xs text-[#4a5568]">Dummy last hour</span>
          </div>
          <div className="mt-4">
            <svg viewBox="0 0 320 180" className="h-48 w-full">
              <defs>
                <linearGradient id="consumptionGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#0b6b6b" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#0b6b6b" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="productionGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#0f3a4f" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0f3a4f" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline
                fill="none"
                stroke="#0b6b6b"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={consumptionPath}
              />
              <polyline
                fill="none"
                stroke="#0f3a4f"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={productionPath}
              />
            </svg>
            <div className="mt-2 flex items-center gap-4 text-xs text-[#4a5568]">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#0b6b6b]" />
                Consumption
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#0f3a4f]" />
                Production
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Net Grid Flow</h2>
            <span className="text-xs text-[#4a5568]">Production − Consumption</span>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-3">
            {netFlow.map((n) => {
              const height = Math.abs(n.value) / netMax * 100;
              const positive = n.value >= 0;
              return (
                <div key={n.label} className="flex flex-col items-center gap-2">
                  <div className="relative h-24 w-10 rounded bg-[#e6edf5]">
                    <div
                      className={`absolute bottom-0 w-full rounded ${positive ? "bg-[#0b6b6b]" : "bg-[#f56565]"}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-xs text-[#4a5568]">{n.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Top Households by Consumption</h2>
            <span className="text-xs text-[#4a5568]">Dummy kWh</span>
          </div>
          <div className="mt-4">
            <BarList data={topHouseholds} color="#0b6b6b" suffix=" kWh" />
          </div>
        </div>

        <div className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Plan Performance</h2>
            <span className="text-xs text-[#4a5568]">Avg kWh</span>
          </div>
          <div className="mt-4 space-y-3">
            {planPerformance.map((p) => (
              <div key={p.label} className="space-y-2 rounded-lg bg-[#f7fbff] px-3 py-3">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{p.label}</span>
                  <span className="text-xs text-[#4a5568]">Consumption vs Production</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-[#4a5568]">
                    <span>Consumption</span>
                    <span>{p.consumption} kWh</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#e6edf5]">
                    <div className="h-2 rounded-full bg-[#0b6b6b]" style={{ width: `${(p.consumption / 1200) * 100}%` }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-[#4a5568]">
                    <span>Production</span>
                    <span>{p.production} kWh</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#e6edf5]">
                    <div className="h-2 rounded-full bg-[#0f3a4f]" style={{ width: `${(p.production / 1200) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Billing Impact</h2>
            <span className="text-xs text-[#4a5568]">USD (dummy)</span>
          </div>
          <div className="mt-4">
            <BarList data={billingImpact} color="#0f3a4f" suffix=" $" />
          </div>
        </div>

        <div className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Households by City</h2>
            <span className="text-xs text-[#4a5568]">Count</span>
          </div>
          <div className="mt-4">
            <BarList data={cityCounts} color="#0b1b33" />
          </div>
        </div>
      </div>
    </section>
  );
}
