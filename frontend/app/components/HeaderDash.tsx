"use client";
import { useEffect, useRef, useState } from "react";

type Stat = {
  title: string;
  value: number;
  delta: number;
  tone: string;
  isUpdated?: boolean;
};

type HeaderDashProps = {
  selectedHousehold?: string | null;
  contextLabel?: string;
};

const DEFAULT_STATS: Stat[] = [
  { title: "Total Consumption (kWh)", value: 0, delta: 0, tone: "text-[#0b6b6b]" },
  { title: "Total Production (kWh)", value: 0, delta: 0, tone: "text-[#0b6b6b]" },
  { title: "Net Grid Flow (kWh)", value: 0, delta: 0, tone: "text-[#0b6b6b]" },
  { title: "Grid Deficit (kWh)", value: 0, delta: 0, tone: "text-red-400" },
];

export default function HeaderDash({ contextLabel }: HeaderDashProps) {
  const [stats, setStats] = useState<Stat[]>(DEFAULT_STATS);
  const [messageCount, setMessageCount] = useState(0);
  const [flashingStats, setFlashingStats] = useState<Set<string>>(new Set());

  const wsRef = useRef<WebSocket | null>(null);
  const prevValuesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const WS_URL = "ws://10.14.124.165:8080";

    let unmounted = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function calcPctChange(key: string, newValue: number) {
      const prev = prevValuesRef.current[key] ?? 0;
      if (prev === 0) return 0;
      return Number((((newValue - prev) / Math.abs(prev)) * 100).toFixed(3));
    }

    function applyUpdate(data: any) {
      const totalConsumption = Number(data.total_consumed || 0);
      const totalProduction = Number(data.total_produced || 0);
      const netFlow = totalProduction - totalConsumption;
      const deficit = Math.abs(netFlow);

      const updatedTitles = new Set<string>();
      
      // Check which values changed
      if (prevValuesRef.current["Total Consumption (kWh)"] !== totalConsumption) updatedTitles.add("Total Consumption (kWh)");
      if (prevValuesRef.current["Total Production (kWh)"] !== totalProduction) updatedTitles.add("Total Production (kWh)");
      if (prevValuesRef.current["Net Grid Flow (kWh)"] !== netFlow) updatedTitles.add("Net Grid Flow (kWh)");
      if (prevValuesRef.current["Grid Deficit (kWh)"] !== deficit) updatedTitles.add("Grid Deficit (kWh)");

      const newStats: Stat[] = [
        {
          title: "Total Consumption (kWh)",
          value: Number(totalConsumption.toFixed(6)),
          delta: calcPctChange("Total Consumption (kWh)", totalConsumption),
          tone: "text-[#0b6b6b]",
          isUpdated: updatedTitles.has("Total Consumption (kWh)")
        },
        {
          title: "Total Production (kWh)",
          value: Number(totalProduction.toFixed(6)),
          delta: calcPctChange("Total Production (kWh)", totalProduction),
          tone: "text-[#0b6b6b]",
          isUpdated: updatedTitles.has("Total Production (kWh)")
        },
        {
          title: "Net Grid Flow (kWh)",
          value: Number(netFlow.toFixed(6)),
          delta: calcPctChange("Net Grid Flow (kWh)", netFlow),
          tone: netFlow >= 0 ? "text-[#0b6b6b]" : "text-red-400",
          isUpdated: updatedTitles.has("Net Grid Flow (kWh)")
        },
        {
          title: "Grid Deficit (kWh)",
          value: Number(deficit.toFixed(6)),
          delta: calcPctChange("Grid Deficit (kWh)", deficit),
          tone: "text-red-400",
          isUpdated: updatedTitles.has("Grid Deficit (kWh)")
        },
      ];

      prevValuesRef.current["Total Consumption (kWh)"] = totalConsumption;
      prevValuesRef.current["Total Production (kWh)"] = totalProduction;
      prevValuesRef.current["Net Grid Flow (kWh)"] = netFlow;
      prevValuesRef.current["Grid Deficit (kWh)"] = deficit;

      setStats(newStats);
      setFlashingStats(updatedTitles);
      
      // Clear flash after 300ms
      setTimeout(() => setFlashingStats(new Set()), 300);
    }



    function handleMessage(raw: any) {
      try {
        const msg = JSON.parse(raw);

        if (msg?.type === "energy_update" && msg.data) {
          setMessageCount((c) => c + 1);
          const totals = msg.data.totals || [];
          const totalConsumption = totals.reduce((sum: number, row: any) => sum + (Number(row.total_consumed) || 0), 0);
          const totalProduction = totals.reduce((sum: number, row: any) => sum + (Number(row.total_produced) || 0), 0);
          
          applyUpdate({
            total_consumed: totalConsumption,
            total_produced: totalProduction
          });
        } else if (msg?.type === "ping") {
          // Ignore heartbeat messages
          return;
        }
      } catch (err) {
        // Silent error handling for performance
      }
    }

    function connect() {
      if (unmounted) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[HeaderDash] Connected:", WS_URL);
      };

      ws.onmessage = (ev) => {
        const raw = typeof ev.data === "string" ? ev.data : JSON.stringify(ev.data);
        handleMessage(raw);
      };

      ws.onclose = () => {
        if (unmounted) return;
        const delay = 1000;
        reconnectTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-screen-2xl px-6 pb-6 pt-0">
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="flex flex-1 flex-col gap-2 rounded-xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33]"
          >
            <p className={`text-3xl font-bold transition-all duration-300 ${
              flashingStats.has(stat.title) ? 'bg-yellow-200 scale-105' : ''
            }`}>
              {stat.value.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 })}
            </p>
            <p className="text-sm font-medium text-[#4a5568]">{stat.title}</p>
            <p className={`text-sm font-medium ${stat.tone} transition-all duration-300 ${
              flashingStats.has(stat.title) ? 'font-bold' : ''
            }`}>
              {stat.delta >= 0 ? "+" : ""}
              {stat.delta.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 })}%
            </p>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs font-medium text-[#4a5568]">
        {contextLabel || "All households"} • Live from RisingWave via WebSocket • Messages received: {messageCount}
      </div>
    </section>
  );
}



// "use client";
// import { useEffect, useRef, useState } from "react";

// type Stat = {
//   title: string;
//   value: number;
//   delta: number; // percent change
//   tone: string;
// };

// type HeaderDashProps = {
//   selectedHousehold?: string | null;
//   contextLabel?: string;
// };

// const DEFAULT_STATS: Stat[] = [
//   { title: "Total Consumption (kWh)", value: 0, delta: 0, tone: "text-[#0b6b6b]" },
//   { title: "Total Production (kWh)", value: 0, delta: 0, tone: "text-[#0b6b6b]" },
//   { title: "Net Grid Flow (kWh)", value: 0, delta: 0, tone: "text-[#0b6b6b]" },
//   { title: "Grid Deficit (kWh)", value: 0, delta: 0, tone: "text-red-400" },
// ];

// export default function HeaderDash({ selectedHousehold, contextLabel }: HeaderDashProps) {
//   const [stats, setStats] = useState<Stat[]>(DEFAULT_STATS);
//   const wsRef = useRef<WebSocket | null>(null);
//   const reconnectAttempts = useRef(0);
//   const prevValuesRef = useRef<Record<string, number>>({});
//   const lastSendRef = useRef<number>(0);

//   // Tune this for frequency vs render cost; e.g., 10 updates/sec = 100ms
//   const MIN_UPDATE_INTERVAL_MS = 100;

//   useEffect(() => {
//     const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

//     let isUnmounted = false;
//     let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

//     function computeAndSet(newTotals: { total_consumed?: number; total_produced?: number; total_energy?: number }[]) {
//       // Accept both array of totals or a single aggregated row
//       let totalConsumption = 0;
//       let totalProduction = 0;
//       let totalEnergy = 0;

//       if (Array.isArray(newTotals)) {
//         for (const row of newTotals) {
//           totalConsumption += Number(row.total_consumed  || 0);
//           totalProduction += Number(row.total_produced  || 0);
//           totalEnergy += Number(row.total_energy || (row.total_produced || 0) - (row.total_consumed || 0) || 0);
//         }
//       } else if (newTotals && typeof newTotals === "object") {
//         totalConsumption = Number((newTotals as any).total_consumed || 0);
//         totalProduction = Number((newTotals as any).total_produced || 0);
//         totalEnergy = Number((newTotals as any).total_energy || totalProduction - totalConsumption);
//       }

//       const netFlow = totalProduction - totalConsumption;
//       const now = Date.now();
//       if (now - lastSendRef.current < MIN_UPDATE_INTERVAL_MS) {
//         // Too soon to update UI — skip (prevents >10 renders/sec). You can lower this if needed.
//         return;
//       }
//       lastSendRef.current = now;

//       const newStatValues: Stat[] = [
//         {
//           title: "Total Consumption (kWh)",
//           value: Number(totalConsumption.toFixed(3)),
//           delta: calcPctChange("Total Consumption (kWh)", totalConsumption),
//           tone: "text-[#0b6b6b]",
//         },
//         {
//           title: "Total Production (kWh)",
//           value: Number(totalProduction.toFixed(3)),
//           delta: calcPctChange("Total Production (kWh)", totalProduction),
//           tone: "text-[#0b6b6b]",
//         },
//         {
//           title: "Net Grid Flow (kWh)",
//           value: Number(netFlow.toFixed(3)),
//           delta: calcPctChange("Net Grid Flow (kWh)", netFlow),
//           tone: netFlow >= 0 ? "text-[#0b6b6b]" : "text-red-400",
//         },
//         {
//           title: "Grid Deficit (kWh)",
//           value: Number(Math.abs(totalEnergy).toFixed(3)),
//           delta: calcPctChange("Grid Deficit (kWh)", Math.abs(totalEnergy)),
//           tone: "text-red-400",
//         },
//       ];

//       // update prev values
//       prevValuesRef.current["Total Consumption (kWh)"] = totalConsumption;
//       prevValuesRef.current["Total Production (kWh)"] = totalProduction;
//       prevValuesRef.current["Net Grid Flow (kWh)"] = netFlow;
//       prevValuesRef.current["Grid Deficit (kWh)"] = Math.abs(totalEnergy);

//       setStats(newStatValues);
//     }

//     function calcPctChange(key: string, newValue: number) {
//       const prev = prevValuesRef.current[key] ?? 0;
//       if (prev === 0) return 0;
//       return Number((((newValue - prev) / Math.abs(prev)) * 100).toFixed(3));
//     }

//     function handleMessage(raw: string) {
//       try {
//         const msg = JSON.parse(raw);
//         // helpful debug log — check console to see message types/shape
//         // eslint-disable-next-line no-console
//         console.debug("[HeaderDash] ws message:", msg?.type ?? "(no type)", msg);

//         // Accept several shapes:
//         // 1) { type: "energy_update", data: { totals: [...] } }
//         // 2) { type: "update", view: "...", data: [...] }
//         // 3) { type: "update", data: { totals: [...] } }
//         // 4) { type: "update", data: rows: [...] }
//         // 5) raw array or object with totals

//         if (msg.type === "energy_update" && msg.data?.totals) {
//           computeAndSet(msg.data.totals);
//           return;
//         }

//         if (msg.type === "update" && msg.data) {
//           // prefer data.totals, else data.rows, else data
//           if (msg.data.totals) {
//             computeAndSet(msg.data.totals);
//             return;
//           }
//           if (Array.isArray(msg.data)) {
//             computeAndSet(msg.data);
//             return;
//           }
//           if (Array.isArray(msg.data.rows)) {
//             computeAndSet(msg.data.rows);
//             return;
//           }
//           // fallback: maybe data itself is a totals array
//           computeAndSet(msg.data);
//           return;
//         }

//         // If message appears to be a plain array or object that matches totals
//         if (Array.isArray(msg)) {
//           computeAndSet(msg);
//           return;
//         }
//         if (msg?.totals) {
//           computeAndSet(msg.totals);
//           return;
//         }
//       } catch (err) {
//         // eslint-disable-next-line no-console
//         console.error("Failed to parse WebSocket message in HeaderDash:", err);
//       }
//     }

//     function connect() {
//       if (isUnmounted) return;
//       const ws = new WebSocket(WS_URL);
//       wsRef.current = ws;

//       ws.onopen = () => {
//         // eslint-disable-next-line no-console
//         console.log("[HeaderDash] WebSocket connected to", WS_URL);
//         reconnectAttempts.current = 0;
//         // if your WS server needs a subscribe message, send it here
//         try {
//           ws.send(JSON.stringify({ type: "subscribe", view: "energy_totals" }));
//         } catch {}
//       };

//       ws.onmessage = (ev) => {
//         handleMessage(typeof ev.data === "string" ? ev.data : JSON.stringify(ev.data));
//       };

//       ws.onclose = () => {
//         // eslint-disable-next-line no-console
//         console.warn("[HeaderDash] WebSocket closed, scheduling reconnect");
//         if (isUnmounted) return;
//         reconnectAttempts.current += 1;
//         const delay = Math.min(10000, 500 * 2 ** Math.min(6, reconnectAttempts.current)); // exp backoff, cap 10s
//         reconnectTimer = setTimeout(connect, delay);
//       };

//       ws.onerror = (err) => {
//         // eslint-disable-next-line no-console
//         console.error("[HeaderDash] WebSocket error:", err);
//         // close socket to trigger reconnect logic
//         try {
//           ws.close();
//         } catch {}
//       };
//     }

//     connect();

//     return () => {
//       isUnmounted = true;
//       if (reconnectTimer) clearTimeout(reconnectTimer);
//       try {
//         wsRef.current?.close();
//       } catch {}
//       wsRef.current = null;
//     };
//   }, []);

//   return (
//     <section className="mx-auto w-full max-w-screen-2xl px-6 pb-6 pt-0">
//       <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
//         {stats.map((stat) => (
//           <div
//             key={stat.title}
//             className="flex flex-1 flex-col gap-2 rounded-xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.4)]"
//           >
//             <p className="text-3xl font-bold tracking-tight">
//               {stat.value.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
//             </p>
//             <p className={`text-sm font-medium ${stat.tone}`}>
//               {stat.delta > 0 ? "+" : ""}
//               {stat.delta.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}%
//             </p>
//           </div>
//         ))}
//       </div>
//       <div className="mt-2 text-xs font-medium text-[#4a5568]">
//         {contextLabel || "All households"} • Live from RisingWave via WebSocket
//       </div>
//     </section>
//   );
// }
