"use client";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

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

export default function HeaderDash({ selectedHousehold }: HeaderDashProps) {
  const [stats, setStats] = useState<Stat[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = io("http://localhost:3002");
    setSocket(s);

    console.log("Connecting to socket server…");

    // 🔥 RECEIVE REAL-TIME ENERGY DATA
    s.on("energyUpdate", (energyData) => {
      console.log("Received energy data:", energyData);

      const totalConsumption = energyData.totalConsumption || 0;
      const totalProduction = energyData.totalProduction || 0;
      const totalEnergy = energyData.totalEnergy || 0;

      const netFlow = totalProduction - totalConsumption;

      const formatNumber = (num: number) =>
        num.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });

      const gridStats: Stat[] = [
        {
          title: "Total Consumption (kWh)",
          value: formatNumber(totalConsumption),
          delta: 1.5,
          tone: "text-[#0b6b6b]",
        },
        {
          title: "Total Production (kWh)",
          value: formatNumber(totalProduction),
          delta: -0.8,
          tone: "text-[#0b6b6b]",
        },
        {
          title: "Net Grid Flow (kWh)",
          value: formatNumber(netFlow),
          delta: 2.1,
          tone: netFlow >= 0 ? "text-[#0b6b6b]" : "text-red-400",
        },
        {
          title: "Grid Deficit (kWh)",
          value: formatNumber(Math.abs(totalEnergy)),
          delta: -5.0,
          tone: "text-red-400",
        },
      ];

      setStats((prev) => [...gridStats, ...prev.slice(4)]);
    });

    // 🔥 RECEIVE REAL-TIME METRIC DATA
    // s.on("metricUpdate", (metricsData) => {
    //   console.log("Received metrics:", metricsData);

    //   const formatNumber = (num: number) =>
    //     num.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });

    //   const metricCards: Stat[] = [
    //     {
    //       title: "Net Consumption This Hour",
    //       value: `${formatNumber(metricsData.netConsumptionHour)} kWh`,
    //     },
    //     {
    //       title: "Net Consumption This Day",
    //       value: `${formatNumber(metricsData.netConsumptionDay)} kWh`,
    //     },
    //     {
    //       title: "Net Energy Consumption This Month",
    //       value: `${formatNumber(metricsData.netConsumptionMonth)} kWh`,
    //     },
    //     {
    //       title: "Average Energy Consumption per Day",
    //       value: `${formatNumber(metricsData.avgPerDay)} kWh`,
    //       note: "Current month avg",
    //     },
    //   ];

    //   setStats((prev) => [...prev.slice(0, 4), ...metricCards]);
    // });

    // Cleanup listeners
    return () => {
      s.disconnect();
    };
  }, [selectedHousehold]);

  return (
    <section className="mx-auto w-full max-w-screen-2xl px-6 pb-6 pt-0">
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="flex flex-col gap-2 rounded-xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.4)]"
          >
            <p className="text-sm font-medium">{stat.title}</p>
            <p className="text-3xl font-bold tracking-tight">{stat.value}</p>

            {stat.note ? (
              <p className="text-xs text-[#4a5568]">{stat.note}</p>
            ) : stat.delta !== undefined ? (
              <p className={`text-sm font-medium ${stat.tone}`}>
                {stat.delta > 0 ? "+" : ""}
                {stat.delta.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}%
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
