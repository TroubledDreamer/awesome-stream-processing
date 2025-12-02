"use client";

import { useEffect, useState } from "react";

interface MetricsData {
  currentTime: string;
  netConsumptionMonth: number;
  netConsumptionDay: number;
  netConsumptionHour: number;
  avgPerDay: number;
  avgPerHour: number;
  hourlyChart: Array<{ hour: string; total_energy: number }>;
  dailyChart: Array<{ day: string; total_energy: number }>;
}

export default function MetricsPanel() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/metrics");
        const data = await res.json();
        setMetrics(data);
      } catch (error) {
        console.error("Failed to fetch metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !metrics) {
    return (
      <section className="mx-auto w-full max-w-screen-2xl px-6 pb-8">
        <div className="text-center py-8 text-zinc-500">Loading metrics...</div>
      </section>
    );
  }

  const currentTime = new Date(metrics.currentTime);

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
            <div className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
              <h3 className="text-sm font-medium text-[#4a5568] mb-2">
                Current Time in Simulation
              </h3>
              <p className="text-3xl font-bold text-blue-600">
                {currentTime.toLocaleString()}
              </p>
            </div>

            {/* Net Consumption This Hour */}
            <div className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
              <h3 className="text-sm font-medium text-[#4a5568] mb-2">
                Net Consumption This Hour
              </h3>
              <p className="text-3xl font-bold text-green-600">
                {Math.round(metrics.netConsumptionHour * 10) / 10} kWh
              </p>
              <p className="text-xs text-[#4a5568] mt-1">
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {/* Net Consumption This Day */}
            <div className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
              <h3 className="text-sm font-medium text-[#4a5568] mb-2">
                Net Consumption This Day
              </h3>
              <p className="text-3xl font-bold text-green-600">
                {Math.round(metrics.netConsumptionDay * 10) / 10} kWh
              </p>
              <p className="text-xs text-[#4a5568] mt-1">
                {currentTime.toLocaleDateString()}
              </p>
            </div>

            {/* Net Consumption This Month */}
            <div className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
              <h3 className="text-sm font-medium text-[#4a5568] mb-2">
                Net Energy Consumption This Month
              </h3>
              <p className="text-3xl font-bold text-red-600">
                {Math.round(metrics.netConsumptionMonth * 10) / 10} kWh
              </p>
              <p className="text-xs text-[#4a5568] mt-1">
                {currentTime.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Average Per Day */}
            <div className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
              <h3 className="text-sm font-medium text-[#4a5568] mb-2">
                Average Energy Consumption per Day
              </h3>
              <p className="text-3xl font-bold text-[#0b6b6b]">
                {Math.round(metrics.avgPerDay * 10) / 10} kWh
              </p>
              <p className="text-xs text-[#4a5568] mt-1">
                Current month average
              </p>
            </div>

            {/* Average Per Hour */}
            <div className="rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
              <h3 className="text-sm font-medium text-[#4a5568] mb-2">
                Average Energy Consumption per Hour
              </h3>
              <p className="text-3xl font-bold text-[#0b6b6b]">
                {Math.round(metrics.avgPerHour * 10) / 10} kWh
              </p>
              <p className="text-xs text-[#4a5568] mt-1">Today's average</p>
            </div>
          </div>

          {/* Hourly Chart */}
          <div className="mt-6 rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
            <h3 className="text-lg font-semibold mb-4">
              Hourly Energy Consumption (Last 24 Hours)
            </h3>
            <div className="overflow-x-auto pb-8">
              <div className="min-w-[800px] h-48 flex items-end gap-2">
                {metrics.hourlyChart.length === 0 ? (
                  <div className="w-full flex items-center justify-center text-sm text-zinc-500">
                    No hourly data available
                  </div>
                ) : (
                  metrics.hourlyChart.reverse().map((point, idx) => {
                    const maxValue = Math.max(
                      ...metrics.hourlyChart.map((p) =>
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
          <div className="mt-6 rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
            <h3 className="text-lg font-semibold mb-4">
              Net Energy Consumption per Day (This Month)
            </h3>
            <div className="overflow-x-auto pb-4">
              <div className="min-w-[600px] h-48 flex items-end gap-2">
                {metrics.dailyChart.length === 0 ? (
                  <div className="w-full flex items-center justify-center text-sm text-zinc-500">
                    No daily data available
                  </div>
                ) : (
                  metrics.dailyChart.map((point, idx) => {
                    const maxValue = Math.max(
                      ...metrics.dailyChart.map((p) => Math.abs(p.total_energy))
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
