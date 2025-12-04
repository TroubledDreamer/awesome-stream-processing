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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/metrics");
        const data = await res.json();
        setMetrics(data);
        setError(null);
      } catch (error) {
        console.error("Failed to fetch metrics:", error);
        setError("Unable to load metrics from the server.");
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

  const hourlyData = metrics.hourlyChart || [];
  const dailyData = metrics.dailyChart || [];

  return (
    <section className="mx-auto w-full max-w-screen-2xl px-6 pb-8">
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-[#0b1b33]">Detailed Metrics</h2>
        <p className="text-sm text-zinc-500">
          Live energy trends and recent performance
        </p>
      </div>

      {/* Hourly Chart */}
      <div className="mt-6 rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]">
        <h3 className="text-lg font-semibold mb-4">
          Hourly Energy Consumption (Last 24 Hours)
        </h3>
        <div className="overflow-x-auto pb-8">
          <div className="min-w-[800px] h-48 flex items-end gap-2">
            {hourlyData.length === 0 ? (
              <div className="w-full flex items-center justify-center text-sm text-zinc-500">
                No hourly data available
              </div>
            ) : (
              [...hourlyData].reverse().map((point, idx, arr) => {
                const maxValue = Math.max(
                  ...arr.map((p) => Math.abs(p.total_energy)),
                  1
                );
                const height = (Math.abs(point.total_energy) / maxValue) * 100;
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
                        title={`${Math.round(point.total_energy * 10) / 10} kWh`}
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
            {dailyData.length === 0 ? (
              <div className="w-full flex items-center justify-center text-sm text-zinc-500">
                No daily data available
              </div>
            ) : (
              dailyData.map((point, idx) => {
                const maxValue = Math.max(
                  ...dailyData.map((p) => Math.abs(p.total_energy)),
                  1
                );
                const height = (Math.abs(point.total_energy) / maxValue) * 100;
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
                        title={`${Math.round(point.total_energy * 10) / 10} kWh`}
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
    </section>
  );
}
