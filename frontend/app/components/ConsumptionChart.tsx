"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TimePoint = { label: string; consumption: number; production: number };
type Range = "1h" | "3h" | "6h" | "12h" | "24h" | "all";

function formatLabel(label: string) {
  const d = new Date(label);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function movingAverage(points: TimePoint[], window = 5): TimePoint[] {
  if (points.length < window) return points;
  const out: TimePoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = points.slice(start, i + 1);
    const avgCons = slice.reduce((s, p) => s + p.consumption, 0) / slice.length;
    const avgProd = slice.reduce((s, p) => s + p.production, 0) / slice.length;
    out.push({
      label: points[i].label,
      consumption: Math.round(avgCons * 1000) / 1000,
      production: Math.round(avgProd * 1000) / 1000,
    });
  }
  return out;
}

function linePath(
  points: TimePoint[],
  key: "consumption" | "production",
  width: number,
  height: number
) {
  const max = Math.max(...points.map((p) => Math.max(p.consumption, p.production)), 1);
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

type FallbackStats = {
  consumption: number;
  production: number;
  net: number;
  connected?: boolean;
  lastMessageTs?: number | null;
  simulatedTime?: Date | null;
};

type ConsumptionChartProps = {
  timeSeries: TimePoint[];
  tooltip?: string;
  fallback?: FallbackStats;
};

export function ConsumptionChart({ timeSeries, tooltip, fallback }: ConsumptionChartProps) {
  const allRanges: Range[] = ["1h", "3h", "6h", "12h", "24h", "all"];
  const [rangeIdx, setRangeIdx] = useState(0);
  const [showAverage, setShowAverage] = useState(false);
  const tapRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Cycle ranges on quick double-tap
  const cycleRange = () => {
    const now = Date.now();
    if (now - tapRef.current < 300) {
      setRangeIdx((i) => (i + 1) % allRanges.length);
    }
    tapRef.current = now;
  };

  const filtered = useMemo(() => {
    const range = allRanges[rangeIdx] ?? "all";
    if (range === "all") return timeSeries;
    const hours = range === "1h" ? 1 : range === "3h" ? 3 : range === "6h" ? 6 : range === "12h" ? 12 : 24;
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    return timeSeries.filter((p) => new Date(p.label) >= cutoff);
  }, [timeSeries, rangeIdx, allRanges]);

  const series = useMemo(() => (showAverage ? movingAverage(filtered, 5) : filtered), [filtered, showAverage]);

  const effectiveSeries = useMemo(() => {
    if (series.length) return series;
    if (!fallback) return [];

    const now = fallback.simulatedTime ? new Date(fallback.simulatedTime) : new Date();
    const prev = new Date(now.getTime() - 60_000);
    const fmt = (d: Date) =>
      d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    return [
      {
        label: fmt(prev),
        consumption: fallback.consumption,
        production: fallback.production,
      },
      {
        label: fmt(now),
        consumption: fallback.consumption,
        production: fallback.production,
      },
    ];
  }, [series, fallback]);

  const xLabelEvery = Math.max(1, Math.ceil(effectiveSeries.length / 6));
  const width = Math.max(320, effectiveSeries.length * 18);

  const consumptionPath = effectiveSeries.length
    ? linePath(effectiveSeries, "consumption", width - 20, 140)
    : "";
  const productionPath = effectiveSeries.length
    ? linePath(effectiveSeries, "production", width - 20, 140)
    : "";

  const yMax = useMemo(
    () =>
      effectiveSeries.length
        ? Math.max(
            ...effectiveSeries.map((pt) => Math.max(pt.consumption, pt.production)),
            0
          )
        : 0,
    [effectiveSeries]
  );
  const yMin = useMemo(
    () =>
      effectiveSeries.length
        ? Math.min(
            ...effectiveSeries.map((pt) => Math.min(pt.consumption, pt.production))
          )
        : 0,
    [effectiveSeries]
  );
  const firstLabel = effectiveSeries[0]?.label;
  const lastLabel = effectiveSeries[effectiveSeries.length - 1]?.label;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [effectiveSeries.length]);

  return (
    <div
      className="col-span-1 lg:col-span-2 rounded-2xl border border-[#dbe5f0] bg-white px-5 py-5 text-[#0b1b33] shadow-[0_18px_50px_-24px_rgba(11,27,51,0.35)]"
      title={tooltip || "Live consumption vs production over time"}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Consumption vs Production</h2>
        <div className="flex items-center gap-3 text-xs text-[#4a5568]">
          <button
            onClick={() => setShowAverage((v) => !v)}
            className="rounded-md border border-[#dbe5f0] px-2 py-1 text-[#0b1b33] hover:bg-[#f5f7fb]"
          >
            {showAverage ? "Raw" : "Avg"}
          </button>
          <span>Range: {allRanges[rangeIdx]}</span>
        </div>
      </div>
      <div className="mt-4" onDoubleClick={cycleRange}>
        {effectiveSeries.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-zinc-600">
            No time series data yet (waiting for stream)...
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="overflow-x-auto">
              <svg viewBox={`0 0 ${width} 180`} className="h-48" style={{ minWidth: width }}>
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
                {effectiveSeries.map((p, idx) => {
                  const max = Math.max(
                    ...effectiveSeries.map((pt) => Math.max(pt.consumption, pt.production)),
                    1
                  );
                  const min = Math.min(
                    ...effectiveSeries.map((pt) => Math.min(pt.consumption, pt.production))
                  );
                  const range = max - min || 1;
                  const x = ((idx / Math.max(effectiveSeries.length - 1, 1)) * (width - 20));
                  const yCons = 140 - ((p.consumption - min) / range) * 140;
                  const yProd = 140 - ((p.production - min) / range) * 140;
                  return (
                    <g key={`${p.label}-${idx}`}>
                      <circle cx={x} cy={yCons} r={3.5} fill="#0b6b6b" stroke="#fff" strokeWidth={1} />
                      <circle cx={x} cy={yProd} r={3.5} fill="#0f3a4f" stroke="#fff" strokeWidth={1} />
                    </g>
                  );
                })}
                {/* Axes labels */}
                <text x={4} y={12} fontSize="10" fill="#4a5568">
                  kWh
                </text>
                <text
                  x={width - 40}
                  y={175}
                  fontSize="10"
                  fill="#4a5568"
                >
                  Time
                </text>
                {effectiveSeries.length > 0 && (
                  <>
                    <text x={4} y={28} fontSize="10" fill="#4a5568">
                      {yMax.toFixed(1)}
                    </text>
                    <text x={4} y={165} fontSize="10" fill="#4a5568">
                      {yMin.toFixed(1)}
                    </text>
                    {firstLabel && (
                      <text x={4} y={175} fontSize="10" fill="#4a5568">
                        {firstLabel}
                      </text>
                    )}
                    {lastLabel && (
                      <text x={width - 80} y={175} fontSize="10" fill="#4a5568">
                        {lastLabel}
                      </text>
                    )}
                  </>
                )}
              </svg>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-[#4a5568]">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#0b6b6b]" />
                Consumption
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#0f3a4f]" />
                Production
              </div>
              <span className="ml-auto text-xs">{effectiveSeries.length} data points</span>
            </div>
          </>
        )}
      </div>
      <div className="mt-2 text-xs text-[#4a5568]">
        Double-click chart to cycle ranges • {showAverage ? "5-point moving average" : "Raw values"}
      </div>
    </div>
  );
}
