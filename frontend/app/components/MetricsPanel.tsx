"use client";

import { useMemo, useState } from "react";
import { useEnergyStream } from "@/lib/useEnergyStream";

export default function MetricsPanel() {
  const { energy, lastMessageTs } = useEnergyStream(200);
  const [isExpanded, setIsExpanded] = useState(false);

  const derived = useMemo(() => {
    const ts = energy?.timeSeries || [];
    const totals = energy?.totals || [];

    const latestTs = ts[0]?.window_end ? new Date(ts[0].window_end) : new Date();
    const now = lastMessageTs ? new Date(lastMessageTs) : latestTs;

    // Group by hour/day (based on timeSeries)
    const hourlyChart = ts.map((row: any) => ({
      hour: row.window_end,
      total_energy: Number(row.total_energy || 0),
    }));

    const dailyMap = new Map<string, number>();
    ts.forEach((row: any) => {
      const dayKey = new Date(row.window_end).toISOString().slice(0, 10);
      const prev = dailyMap.get(dayKey) || 0;
      dailyMap.set(dayKey, prev + Number(row.total_energy || 0));
    });
    const dailyChart = Array.from(dailyMap.entries()).map(([day, total_energy]) => ({
      day,
      total_energy,
    }));

    const netConsumptionHour = hourlyChart
      .filter((p) => new Date(p.hour).getHours() === now.getHours())
      .reduce((sum, p) => sum + p.total_energy, 0);

    const netConsumptionDay = dailyMap.get(now.toISOString().slice(0, 10)) || 0;
    const netConsumptionMonth = totals.reduce(
      (sum: number, row: any) => sum + Number(row.total_energy || 0),
      0
    );

    const avgPerDay =
      dailyChart.length > 0
        ? dailyChart.reduce((sum, p) => sum + p.total_energy, 0) / dailyChart.length
        : 0;
    const avgPerHour =
      hourlyChart.length > 0
        ? hourlyChart.reduce((sum, p) => sum + p.total_energy, 0) / hourlyChart.length
        : 0;

    return {
      currentTime: now,
      netConsumptionHour,
      netConsumptionDay,
      netConsumptionMonth,
      avgPerDay,
      avgPerHour,
      hourlyChart,
      dailyChart,
    };
  }, [energy, lastMessageTs]);

  const currentTime = derived.currentTime;

  if (!energy?.timeSeries?.length && !energy?.totals?.length) {
    return (
      <section className="mx-auto w-full max-w-screen-2xl px-6 pb-8">
        <div className="text-center py-8 text-zinc-500">Waiting for live metrics...</div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-screen-2xl px-6 pb-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between rounded-xl border border-[#dbe5f0] bg-white px-6 py-4 text-[#0b1b33] shadow-sm hover:shadow-md transition-shadow mb-6"
      >
        <h2 className="text-2xl font-bold">Detailed Metrics</h2>
        <svg
          className={`w-6 h-6 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {!isExpanded && (
        <div className="text-center text-sm text-zinc-500 mb-6">
          Click above to view detailed hourly and daily metrics
        </div>
      )}

      {isExpanded && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Current Time in Simulation */}
            <div
              className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]"
              title="Latest simulated timestamp"
            >
              <h3 className="text-sm font-medium text-[#4a5568] mb-2">
                Current Time in Simulation
              </h3>
              <p className="text-3xl font-bold text-blue-600">
                {currentTime.toLocaleString()}
              </p>
            </div>

            {/* Net Consumption This Hour */}
            <div
              className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]"
              title="Net consumption accumulated in the current hour"
            >
              <h3 className="text-sm font-medium text-[#4a5568] mb-2">
                Net Consumption This Hour
              </h3>
              <p className="text-3xl font-bold text-green-600">
                {Math.round(derived.netConsumptionHour * 10) / 10} kWh
              </p>
              <p className="text-xs text-[#4a5568] mt-1">
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {/* Net Consumption This Day */}
            <div
              className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]"
              title="Net consumption accumulated today"
            >
              <h3 className="text-sm font-medium text-[#4a5568] mb-2">
                Net Consumption This Day
              </h3>
              <p className="text-3xl font-bold text-green-600">
                {Math.round(derived.netConsumptionDay * 10) / 10} kWh
              </p>
              <p className="text-xs text-[#4a5568] mt-1">
                {currentTime.toLocaleDateString()}
              </p>
            </div>

            {/* Net Consumption This Month */}
            <div
              className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]"
              title="Net energy consumption accumulated this month"
            >
              <h3 className="text-sm font-medium text-[#4a5568] mb-2">
                Net Energy Consumption This Month
              </h3>
              <p className="text-3xl font-bold text-red-600">
                {Math.round(derived.netConsumptionMonth * 10) / 10} kWh
              </p>
              <p className="text-xs text-[#4a5568] mt-1">
                {currentTime.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Average Per Day */}
            <div
              className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]"
              title="Average daily consumption for the current month"
            >
              <h3 className="text-sm font-medium text-[#4a5568] mb-2">
                Average Energy Consumption per Day
              </h3>
              <p className="text-3xl font-bold text-[#0b6b6b]">
                {Math.round(derived.avgPerDay * 10) / 10} kWh
              </p>
              <p className="text-xs text-[#4a5568] mt-1">
                Current month average
              </p>
            </div>

            {/* Average Per Hour */}
            <div
              className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]"
              title="Average hourly consumption for today"
            >
              <h3 className="text-sm font-medium text-[#4a5568] mb-2">
                Average Energy Consumption per Hour
              </h3>
              <p className="text-3xl font-bold text-[#0b6b6b]">
                {Math.round(derived.avgPerHour * 10) / 10} kWh
              </p>
              <p className="text-xs text-[#4a5568] mt-1">Today's average</p>
            </div>
          </div>

          {/* Hourly Chart */}
          <div
            className="mt-6 rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]"
            title="Last 24 hours of hourly consumption"
          >
            <h3 className="text-lg font-semibold mb-4">
              Hourly Energy Consumption (Last 24 Hours)
            </h3>
            <div className="overflow-x-auto pb-8">
              <div className="min-w-[800px] h-48 flex items-end gap-2">
                {derived.hourlyChart.length === 0 ? (
                  <div className="w-full flex items-center justify-center text-sm text-zinc-500">
                    No hourly data available
                  </div>
                ) : (
                  derived.hourlyChart
                    .slice()
                    .reverse()
                    .map((point, idx) => {
                    const maxValue = Math.max(
                      ...derived.hourlyChart.map((p) =>
                        Math.abs(p.total_energy)
                      )
                    );
                    const height =
                      (Math.abs(point.total_energy) / maxValue) * 100;
                    const time = new Date(point.hour);

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1 min-w-[30px]"
                      >
                        <div
                          className="w-full bg-[#e6edf5] rounded-t relative"
                          style={{ height: "140px" }}
                        >
                          <div
                            className="absolute bottom-0 w-full rounded-t bg-[#0b6b6b]"
                            style={{ height: `${height}%` }}
                            title={`${
                              Math.round(point.total_energy * 10) / 10
                            } kWh`}
                          />
                        </div>
                        <span className="text-[10px] text-[#4a5568] whitespace-nowrap mt-1">
                          {time.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Daily Chart */}
          <div
            className="mt-6 rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]"
            title="Daily consumption totals for the current month"
          >
            <h3 className="text-lg font-semibold mb-4">
              Net Energy Consumption per Day (This Month)
            </h3>
            <div className="overflow-x-auto pb-4">
              <div className="min-w-[600px] h-48 flex items-end gap-2">
                {derived.dailyChart.length === 0 ? (
                  <div className="w-full flex items-center justify-center text-sm text-zinc-500">
                    No daily data available
                  </div>
                ) : (
                  derived.dailyChart.map((point, idx) => {
                    const maxValue = Math.max(
                      ...derived.dailyChart.map((p) => Math.abs(p.total_energy))
                    );
                    const height =
                      (Math.abs(point.total_energy) / maxValue) * 100;
                    const date = new Date(point.day);

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1 min-w-[20px]"
                      >
                        <div
                          className="w-full bg-[#e6edf5] rounded-t relative"
                          style={{ height: "140px" }}
                        >
                          <div
                            className="absolute bottom-0 w-full rounded-t bg-[#0f3a4f]"
                            style={{ height: `${height}%` }}
                            title={`${
                              Math.round(point.total_energy * 10) / 10
                            } kWh`}
                          />
                        </div>
                        <span className="text-xs text-[#4a5568]">
                          {date.getDate()}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
