"use client";
import { useEffect, useMemo, useState } from "react";
import { useEnergyStream } from "@/lib/useEnergyStream";
import { ConsumptionChart } from "./ConsumptionChart";

type TimePoint = { label: string; consumption: number; production: number };
type Count = { label: string; value: number };
type BillsData = { tiered: any[]; tou: any[] };
type VisualsProps = {
  selectedHousehold?: string | null;
  contextLabel?: string;
};

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

export default function Visuals({ contextLabel }: VisualsProps) {
  const { energy, connected, messageCount, lastMessageTs } = useEnergyStream(120);
  const [bills, setBills] = useState<BillsData>({ tiered: [], tou: [] });
  const [loadingBills, setLoadingBills] = useState(true);

  // Pull bills straight from the WebSocket stream; fallback to one fetch if absent
  useEffect(() => {
    if (energy?.bills) {
      setBills({
        tiered: energy.bills.tiered || [],
        tou: energy.bills.tou || [],
      });
      setLoadingBills(false);
      return;
    }

    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const res = await fetch("/api/bills");
        const billsData = await res.json();
        if (!cancelled) {
          setBills({
            tiered: billsData.tiered || [],
            tou: billsData.tou || [],
          });
          setLoadingBills(false);
        }
      } catch (error) {
        if (!cancelled) setLoadingBills(false);
        // eslint-disable-next-line no-console
        console.error("Failed to fetch bills data:", error);
      }
    };

    fetchOnce();
    return () => {
      cancelled = true;
    };
  }, [energy?.bills]);

  const totals = energy?.totals || [];
  const rawSeries = energy?.timeSeries || [];

  const latestSimTime = useMemo(() => {
    const ts = rawSeries[0]?.window_end;
    return ts ? new Date(ts) : null;
  }, [rawSeries]);

  const latestHeartbeat = useMemo(() => {
    return lastMessageTs ? new Date(lastMessageTs) : null;
  }, [lastMessageTs]);

  const timeSeries = useMemo<TimePoint[]>(
    () =>
      rawSeries
        .slice(0, 20)
        .reverse()
        .map((row: any) => {
          const time = new Date(row.window_end);
          return {
            label: time.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            consumption: Number(row.energy_consumed || 0),
            production: Number(row.energy_produced || 0),
          };
        }),
    [rawSeries]
  );

  const topHouseholds = useMemo<Count[]>(
    () =>
      totals
        .slice()
        .sort((a: any, b: any) => (b.total_consumed || 0) - (a.total_consumed || 0))
        .slice(0, 5)
        .map((row: any) => ({
          label: String(row.meter_id),
          value: Math.round(Number(row.total_consumed || 0) * 10) / 10,
        })),
    [totals]
  );

  const planPerformance = useMemo(
    () => {
      const tieredMeters = new Set(bills.tiered.map((r: any) => r.meter_id));
      const touMeters = new Set(bills.tou.map((r: any) => r.meter_id));

      const aggregate = (meterSet: Set<any>) =>
        totals
          .filter((r: any) => meterSet.has(r.meter_id))
          .reduce(
            (acc: any, r: any) => ({
              consumption: acc.consumption + Number(r.total_consumed || 0),
              production: acc.production + Number(r.total_produced || 0),
              count: acc.count + 1,
            }),
            { consumption: 0, production: 0, count: 0 }
          );

      const tieredTotals = aggregate(tieredMeters);
      const touTotals = aggregate(touMeters);

      return [
        {
          label: "Tier",
          consumption:
            tieredTotals.count > 0
              ? Math.round((tieredTotals.consumption / tieredTotals.count) * 10) /
                10
              : 0,
          production:
            tieredTotals.count > 0
              ? Math.round((tieredTotals.production / tieredTotals.count) * 10) /
                10
              : 0,
        },
        {
          label: "Time of Use",
          consumption:
            touTotals.count > 0
              ? Math.round((touTotals.consumption / touTotals.count) * 10) / 10
              : 0,
          production:
            touTotals.count > 0
              ? Math.round((touTotals.production / touTotals.count) * 10) / 10
              : 0,
        },
      ];
    },
    [bills, totals]
  );

  const billingImpact = useMemo<Count[]>(() => {
    const allBills = [...bills.tiered, ...bills.tou];
    return allBills
      .slice()
      .sort(
        (a: any, b: any) =>
          Number(b.current_bill || b.monthly_cost || 0) -
          Number(a.current_bill || a.monthly_cost || 0)
      )
      .slice(0, 7)
      .map((row: any) => ({
        label: String(row.meter_id),
        value:
          Math.round(Number(row.current_bill || row.monthly_cost || 0) * 100) /
          100,
      }));
  }, [bills]);

  const planCostStats = useMemo(() => {
    const avg = (arr: any[], key: string) =>
      arr.length > 0
        ? arr.reduce((sum, r) => sum + Number(r[key] || 0), 0) / arr.length
        : 0;

    const tierCurrent = avg(bills.tiered, "current_bill");
    const tierEst = avg(bills.tiered, "estimated_total_bill");
    const touCurrent = avg(bills.tou, "monthly_cost");
    const touEst = avg(bills.tou, "estimated_monthly_bill");

    const stats = [
      {
        label: "Tier",
        current: tierCurrent,
        estimated: tierEst,
        deltaPct: tierCurrent
          ? Number((((tierEst - tierCurrent) / Math.abs(tierCurrent)) * 100).toFixed(1))
          : 0,
      },
      {
        label: "Time of Use",
        current: touCurrent,
        estimated: touEst,
        deltaPct: touCurrent
          ? Number((((touEst - touCurrent) / Math.abs(touCurrent)) * 100).toFixed(1))
          : 0,
      },
    ];

    const cheapest = stats.reduce((best, s) => (s.current < best.current ? s : best), stats[0]);
    return { stats, cheapestLabel: cheapest.label };
  }, [bills]);

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

  const netMax = Math.max(...netFlow.map((n) => Math.abs(n.value)), 1);

  const loading = loadingBills && !totals.length && !rawSeries.length;

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
        <div
          className="col-span-1 rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]"
          title="Average current vs estimated bills by plan"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Plan Cost Comparison</h2>
            <span className="text-xs text-[#4a5568]">Cheapest: {planCostStats.cheapestLabel}</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm">
            {planCostStats.stats.map((p) => (
              <div
                key={p.label}
                className="rounded-lg border border-[#e6edf5] bg-[#f7fbff] px-3 py-3"
                title={`Current: $${p.current.toFixed(2)} • Estimated: $${p.estimated.toFixed(2)}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.label}</span>
                  <span className={`text-xs font-semibold ${p.deltaPct <= 0 ? "text-[#0b6b6b]" : "text-red-500"}`}>
                    {p.deltaPct >= 0 ? "+" : ""}{p.deltaPct}%
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#4a5568]">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide">Current</p>
                    <p className="text-base font-semibold text-[#0b1b33]">${p.current.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide">Estimated</p>
                    <p className="text-base font-semibold text-[#0b1b33]">${p.estimated.toFixed(2)}</p>
                  </div>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[#e6edf5]">
                  <div
                    className={`h-2 rounded-full ${p.deltaPct <= 0 ? "bg-[#0b6b6b]" : "bg-red-400"}`}
                    style={{ width: `${Math.min(100, Math.abs(p.deltaPct))}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-[#4a5568]">
                  {p.deltaPct === 0
                    ? "No change vs estimate"
                    : p.deltaPct < 0
                    ? `${Math.abs(p.deltaPct)}% under estimate`
                    : `${p.deltaPct}% over estimate`}
                </p>
              </div>
            ))}
          </div>
        </div>

        <ConsumptionChart
          timeSeries={timeSeries}
          tooltip="Live consumption vs production trend"
        />

        <div
          className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]"
          title="Latest simulated timestamp from the stream"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Simulated Time</h2>
            <span className="text-xs text-[#4a5568]">Live</span>
          </div>
          <div className="mt-4">
            {latestSimTime ? (
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-[#4a5568]">Simulation</p>
                  <p className="text-2xl font-semibold">{latestSimTime.toLocaleString()}</p>
                  <p className="text-xs text-[#4a5568] mt-1">
                    {latestSimTime.toLocaleDateString(undefined, { weekday: "long" })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-16 flex items-center text-sm text-zinc-500">
                Waiting for stream...
              </div>
            )}
          </div>
        </div>

        <div
          className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]"
          title="Net grid flow per interval (production minus consumption)"
        >
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

        <div
          className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]"
          title="Top consuming households (live kWh)"
        >
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

        <div
          className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]"
          title="Average consumption vs production by plan type"
        >
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

        <div
          className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]"
          title="Highest current bills across households"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Billing Impact</h2>
            <span className="text-xs text-[#4a5568]">Live USD</span>
          </div>
          <div className="mt-4">
            <BarList data={billingImpact} color="#0f3a4f" suffix=" $" />
          </div>
        </div>

        <div
          className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]"
          title="Household counts by city"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Households by City</h2>
            <span className="text-xs text-[#4a5568]">Count</span>
          </div>
          <div className="mt-4">
            <BarList data={cityCounts} color="#0b1b33" />
          </div>
        </div>
      </div>
      <div className="mt-3 text-xs text-[#4a5568]">
        {contextLabel || "All households"} • {connected ? "Live via WebSocket" : "Reconnecting to WebSocket"} • Messages received: {messageCount}
        {latestSimTime ? ` • Simulated time: ${latestSimTime.toLocaleString()}` : ""}
      </div>
    </section>
  );
}
