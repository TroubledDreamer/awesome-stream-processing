"use client";
import { useEffect, useState } from "react";

type Stat = {
  title: string;
  value: string;
  delta?: number;
  tone?: string;
  note?: string;
};

type HeaderDashProps = {
  selectedHousehold?: string | null;
  contextLabel?: string;
};

export default function HeaderDash({
  selectedHousehold,
  contextLabel,
}: HeaderDashProps) {
  const [stats, setStats] = useState<Stat[]>([
    {
      title: "Real-time Consumption (kWh)",
      value: "0",
      delta: 0,
      tone: "text-[#0b6b6b]",
    },
    {
      title: "Real-time Production (kWh)",
      value: "0",
      delta: 0,
      tone: "text-[#0b6b6b]",
    },
    {
      title: "Net Grid Flow (kWh)",
      value: "0",
      delta: 0,
      tone: "text-[#0b6b6b]",
    },
    {
      title: "Total Energy (kWh)",
      value: "0",
      delta: 0,
      tone: "text-[#0b6b6b]",
    },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [energyRes, metricsRes] = await Promise.all([
          fetch("/api/energy"),
          fetch("/api/metrics"),
        ]);

        const energyData = await energyRes.json();
        const metricsData = metricsRes.ok ? await metricsRes.json() : null;

        const gridStats: Stat[] = [];

        if (energyData.totals && energyData.totals.length > 0) {
          // Sum across all meters for grid-wide stats
          const totalConsumption = energyData.totals.reduce(
            (sum: number, row: any) => sum + (row.total_consumed || 0),
            0
          );
          const totalProduction = energyData.totals.reduce(
            (sum: number, row: any) => sum + (row.total_produced || 0),
            0
          );
          const totalEnergy = energyData.totals.reduce(
            (sum: number, row: any) => sum + (row.total_energy || 0),
            0
          );
          const netFlow = totalProduction - totalConsumption;

          gridStats.push(
            {
              title: "Total Consumption (kWh)",
              value: (Math.round(totalConsumption * 10) / 10).toLocaleString(),
              delta: 1.5,
              tone: "text-[#0b6b6b]",
            },
            {
              title: "Total Production (kWh)",
              value: (Math.round(totalProduction * 10) / 10).toLocaleString(),
              delta: -0.8,
              tone: "text-[#0b6b6b]",
            },
            {
              title: "Net Grid Flow (kWh)",
              value: (Math.round(netFlow * 10) / 10).toLocaleString(),
              delta: 2.1,
              tone: netFlow >= 0 ? "text-[#0b6b6b]" : "text-red-400",
            },
            {
              title: "Grid Deficit (kWh)",
              value: (Math.round(Math.abs(totalEnergy) * 10) / 10).toLocaleString(),
              delta: -5.0,
              tone: "text-red-400",
            }
          );
        }

        const metricCards: Stat[] = [];
        if (metricsData) {
          const currentTime = metricsData.currentTime
            ? new Date(metricsData.currentTime)
            : null;
          const monthLabel = currentTime
            ? currentTime.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })
            : "";
          const dayLabel = currentTime
            ? currentTime.toLocaleDateString()
            : "";
          const timeLabel = currentTime
            ? currentTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";

          metricCards.push(
            {
              title: "Net Consumption This Hour",
              value: `${(Math.round(metricsData.netConsumptionHour * 10) / 10).toLocaleString()} kWh`,
              note: timeLabel,
            },
            {
              title: "Net Consumption This Day",
              value: `${(Math.round(metricsData.netConsumptionDay * 10) / 10).toLocaleString()} kWh`,
              note: dayLabel,
            },
            {
              title: "Net Energy Consumption This Month",
              value: `${(Math.round(metricsData.netConsumptionMonth * 10) / 10).toLocaleString()} kWh`,
              note: monthLabel,
            },
            {
              title: "Average Energy Consumption per Day",
              value: `${(Math.round(metricsData.avgPerDay * 10) / 10).toLocaleString()} kWh`,
              note: "Current month average",
            }
          );
        }

        setStats([...gridStats, ...metricCards]);
      } catch (error) {
        console.error("Failed to fetch header stats:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="mx-auto w-full max-w-screen-2xl px-6 pb-6 pt-0">
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="flex flex-1 flex-col gap-2 rounded-xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.4)]"
          >
            <p className="text-sm font-medium">{stat.title}</p>
            <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
            {stat.note ? (
              <p className="text-xs text-[#4a5568]">{stat.note}</p>
            ) : stat.delta !== undefined ? (
              <p className={`text-sm font-medium ${stat.tone}`}>
                {stat.delta > 0 ? "+" : ""}
                {stat.delta.toFixed(1)}%
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
