"use client";
import { useEffect, useState } from "react";

type TimePoint = { label: string; consumption: number; production: number };
type Count = { label: string; value: number };

function linePath(
  points: TimePoint[],
  key: "consumption" | "production",
  width: number,
  height: number
) {
  const max = Math.max(
    ...points.map((p) => Math.max(p.consumption, p.production))
  );
  const min = Math.min(
    ...points.map((p) => Math.min(p.consumption, p.production))
  );
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
    acc.push({
      start,
      value,
      label: slice.label,
      color: colors[idx % colors.length],
    });
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

function BarList({
  data,
  color = "#0b6b6b",
  suffix = "",
}: {
  data: Count[];
  color?: string;
  suffix?: string;
}) {
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
  const [timeSeries, setTimeSeries] = useState<TimePoint[]>([]);
  const [topHouseholds, setTopHouseholds] = useState<Count[]>([]);
  const [billingImpact, setBillingImpact] = useState<Count[]>([]);
  const [pricePlanBreakdown, setPricePlanBreakdown] = useState<Count[]>([]);
  const [planPerformance, setPlanPerformance] = useState<
    Array<{ label: string; consumption: number; production: number }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [energyRes, billsRes] = await Promise.all([
          fetch("/api/energy"),
          fetch("/api/bills"),
        ]);

        const energyData = await energyRes.json();
        const billsData = await billsRes.json();

        // Build time series from API data
        const series: TimePoint[] = (energyData.timeSeries || [])
          .slice(0, 7)
          .reverse()
          .map((row: any) => {
            const time = new Date(row.window_end);
            return {
              label: time.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              consumption: row.energy_consumed || 0,
              production: row.energy_produced || 0,
            };
          });
        setTimeSeries(series);

        // Top households by consumption from aggregated totals
        const topMeters = (energyData.totals || [])
          .sort((a: any, b: any) => b.total_consumed - a.total_consumed)
          .slice(0, 5)
          .map((row: any) => ({
            label: String(row.meter_id),
            value: Math.round(row.total_consumed * 10) / 10,
          }));
        setTopHouseholds(topMeters);

        // Billing impact
        const allBills = [
          ...(billsData.tiered || []),
          ...(billsData.tou || []),
        ];
        const topBills = allBills
          .sort(
            (a: any, b: any) =>
              (b.current_bill || b.monthly_cost || 0) -
              (a.current_bill || a.monthly_cost || 0)
          )
          .slice(0, 5)
          .map((row: any) => ({
            label: String(row.meter_id),
            value:
              Math.round((row.current_bill || row.monthly_cost || 0) * 100) /
              100,
          }));
        setBillingImpact(topBills);

        // Price plan breakdown - count unique meters
        const uniqueTiered = new Set(
          billsData.tiered?.map((r: any) => r.meter_id) || []
        );
        const uniqueTou = new Set(
          billsData.tou?.map((r: any) => r.meter_id) || []
        );
        setPricePlanBreakdown([
          { label: "Tier", value: uniqueTiered.size },
          { label: "Time of Use", value: uniqueTou.size },
        ]);

        // Plan Performance - calculate avg consumption/production by plan type
        const tieredMeters = new Set(
          billsData.tiered?.map((r: any) => r.meter_id) || []
        );
        const touMeters = new Set(
          billsData.tou?.map((r: any) => r.meter_id) || []
        );

        const tieredTotals = (energyData.totals || [])
          .filter((r: any) => tieredMeters.has(r.meter_id))
          .reduce(
            (acc: any, r: any) => ({
              consumption: acc.consumption + (r.total_consumed || 0),
              production: acc.production + (r.total_produced || 0),
              count: acc.count + 1,
            }),
            { consumption: 0, production: 0, count: 0 }
          );

        const touTotals = (energyData.totals || [])
          .filter((r: any) => touMeters.has(r.meter_id))
          .reduce(
            (acc: any, r: any) => ({
              consumption: acc.consumption + (r.total_consumed || 0),
              production: acc.production + (r.total_produced || 0),
              count: acc.count + 1,
            }),
            { consumption: 0, production: 0, count: 0 }
          );

        setPlanPerformance([
          {
            label: "Tier",
            consumption:
              tieredTotals.count > 0
                ? Math.round(
                    (tieredTotals.consumption / tieredTotals.count) * 10
                  ) / 10
                : 0,
            production:
              tieredTotals.count > 0
                ? Math.round(
                    (tieredTotals.production / tieredTotals.count) * 10
                  ) / 10
                : 0,
          },
          {
            label: "Time of Use",
            consumption:
              touTotals.count > 0
                ? Math.round((touTotals.consumption / touTotals.count) * 10) /
                  10
                : 0,
            production:
              touTotals.count > 0
                ? Math.round((touTotals.production / touTotals.count) * 10) / 10
                : 0,
          },
        ]);

        console.log("Time series data:", series);
        console.log("Time series length:", series.length);
        if (series.length > 0) {
          console.log("Sample data point:", series[0]);
          console.log(
            "Consumption range:",
            Math.min(...series.map((s) => s.consumption)),
            "-",
            Math.max(...series.map((s) => s.consumption))
          );
          console.log(
            "Production range:",
            Math.min(...series.map((s) => s.production)),
            "-",
            Math.max(...series.map((s) => s.production))
          );
        }

        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch visuals data:", error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const netFlow = timeSeries.map((p) => ({
    label: p.label,
    value: p.production - p.consumption,
  }));

  const cityCounts: Count[] = [
    { label: "Springfield", value: 4 },
    { label: "Shelbyville", value: 4 },
    { label: "Ogdenville", value: 4 },
    { label: "Capital City", value: 3 },
    { label: "North Haverbrook", value: 5 },
  ];

  const consumptionPath = timeSeries.length
    ? linePath(timeSeries, "consumption", 300, 140)
    : "";
  const productionPath = timeSeries.length
    ? linePath(timeSeries, "production", 300, 140)
    : "";
  const netMax = Math.max(...netFlow.map((n) => Math.abs(n.value)), 1);

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-screen-2xl px-6 pb-8">
        <div className="text-center py-8 text-zinc-500">
          Loading live data from RisingWave...
        </div>
      </section>
    );
  }

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
                    style={{
                      background: ["#0b6b6b", "#0f3a4f", "#0b1b33", "#0c777a"][
                        idx % 4
                      ],
                    }}
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
            <span className="text-xs text-[#4a5568]">Live from RisingWave</span>
          </div>
          <div className="mt-4">
            {timeSeries.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-zinc-500">
                No time series data available (waiting for data to
                accumulate...)
              </div>
            ) : (
              <>
                <svg viewBox="0 0 320 180" className="h-48 w-full">
                  <defs>
                    <linearGradient
                      id="consumptionGradient"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#0b6b6b" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#0b6b6b" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient
                      id="productionGradient"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#0f3a4f"
                        stopOpacity="0.25"
                      />
                      <stop offset="100%" stopColor="#0f3a4f" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {consumptionPath && (
                    <polyline
                      fill="none"
                      stroke="#0b6b6b"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={consumptionPath}
                    />
                  )}
                  {productionPath && (
                    <polyline
                      fill="none"
                      stroke="#0f3a4f"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={productionPath}
                    />
                  )}
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
                  <span className="ml-auto text-xs">
                    {timeSeries.length} data points
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Net Grid Flow</h2>
            <span className="text-xs text-[#4a5568]">
              Production − Consumption
            </span>
          </div>
          <div className="mt-4">
            {netFlow.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-sm text-zinc-500">
                No net flow data available
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-3">
                {netFlow.slice(0, 7).map((n) => {
                  const height = (Math.abs(n.value) / netMax) * 100;
                  const positive = n.value >= 0;
                  return (
                    <div
                      key={n.label}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className="relative h-24 w-10 rounded bg-[#e6edf5]">
                        <div
                          className={`absolute bottom-0 w-full rounded ${
                            positive ? "bg-[#0b6b6b]" : "bg-[#f56565]"
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#4a5568]">{n.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Top Households by Consumption
            </h2>
            <span className="text-xs text-[#4a5568]">Live kWh</span>
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
              <div
                key={p.label}
                className="space-y-2 rounded-lg bg-[#f7fbff] px-3 py-3"
              >
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{p.label}</span>
                  <span className="text-xs text-[#4a5568]">
                    Consumption vs Production
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-[#4a5568]">
                    <span>Consumption</span>
                    <span>{p.consumption.toFixed(1)} kWh</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#e6edf5]">
                    <div
                      className="h-2 rounded-full bg-[#0b6b6b]"
                      style={{
                        width: `${Math.min(
                          100,
                          (p.consumption /
                            Math.max(
                              ...planPerformance.map((x) =>
                                Math.max(x.consumption, x.production)
                              )
                            )) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-[#4a5568]">
                    <span>Production</span>
                    <span>{p.production.toFixed(1)} kWh</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#e6edf5]">
                    <div
                      className="h-2 rounded-full bg-[#0f3a4f]"
                      style={{
                        width: `${Math.min(
                          100,
                          (p.production /
                            Math.max(
                              ...planPerformance.map((x) =>
                                Math.max(x.consumption, x.production)
                              )
                            )) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Billing Impact</h2>
            <span className="text-xs text-[#4a5568]">Live USD</span>
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
