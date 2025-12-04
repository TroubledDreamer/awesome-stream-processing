"use client";
import { useEffect, useState } from "react";

type Household = {
  id: string;
  address: string;
  city: string;
  consumption: number;
  production: number;
  bill: number;
  status: "Paid" | "Pending" | "Overdue";
  plan: "Tiered" | "TOU" | "Unknown";
  monthLabel: string;
  monthKey: string;
  monthDate: Date | null;
  year: number | null;
};

const mockAddresses = [
  "100 Energy Lane",
  "102 Energy Lane",
  "104 Energy Lane",
  "106 Energy Lane",
  "108 Energy Lane",
  "110 Energy Lane",
  "112 Energy Lane",
  "114 Energy Lane",
];

const mockStatuses: Array<"Paid" | "Pending" | "Overdue"> = [
  "Paid",
  "Pending",
  "Overdue",
];

function statusStyles(status: Household["status"]) {
  switch (status) {
    case "Paid":
      return "bg-[#E1FFBB] text-[#001A6E] ring-1 ring-[#074799]/40";
    case "Pending":
      return "bg-[#dde8ff] text-[#074799] ring-1 ring-[#074799]/30";
    case "Overdue":
      return "bg-red-100 text-red-700 ring-1 ring-red-200";
    default:
      return "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200";
  }
}

type HouseholdsProps = {
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

export default function Households({ selectedId, onSelect }: HouseholdsProps) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMonth, setActiveMonth] = useState<string>("All");
  const [activeYear, setActiveYear] = useState<string>("All");
  const [activePlan, setActivePlan] = useState<"All" | "Tiered" | "TOU">(
    "All"
  );
  const [viewing, setViewing] = useState<Household | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [energyRes, billsRes, customersRes] = await Promise.all([
          fetch("/api/energy"),
          fetch("/api/bills"),
          fetch("/api/customers"),
        ]);

        const energyData = await energyRes.json();
        const billsData = await billsRes.json();
        const customersData = await customersRes.json();

        const customerAddressMap = new Map<string, string>();
        (customersData || []).forEach((row: any) => {
          if (row.meter_id !== undefined) {
            customerAddressMap.set(String(row.meter_id), String(row.address || ""));
          }
        });

        const allBills = [
          ...(billsData.tiered || []),
          ...(billsData.tou || []),
        ];

        const energyTotalsMap = new Map<
          string,
          { consumption: number; production: number }
        >();
        (energyData.totals || []).forEach((row: any) => {
          energyTotalsMap.set(String(row.meter_id), {
            consumption: row.total_consumed || 0,
            production: row.total_produced || 0,
          });
        });

        const parseCity = (address: string) => {
          const parts = address
            .split(",")
            .map((p: string) => p.trim())
            .filter(Boolean);
          const city = parts.length >= 2 ? parts[1] : parts[0] || "Unknown";
          return city.trim();
        };

        const householdsData: Household[] = allBills.map(
          (row: any, idx: number) => {
            const meterId = String(row.meter_id);
            const energyTotals = energyTotalsMap.get(meterId) || {
              consumption: 0,
              production: 0,
            };
            const month = row.month ? new Date(row.month) : null;
            const monthKey = month
              ? `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(
                  2,
                  "0"
                )}`
              : "unknown";
            const monthLabel = month
              ? month.toLocaleString("default", { month: "short", year: "numeric" })
              : "All time";
            const plan: Household["plan"] =
              row.current_bill !== undefined
                ? "Tiered"
                : row.monthly_cost !== undefined
                ? "TOU"
                : "Unknown";

            const address =
              String(row.address ?? "").trim() ||
              customerAddressMap.get(meterId) ||
              "Unknown Address";
            const city = parseCity(address);

            return {
              id: meterId,
              address,
              city,
              consumption:
                Math.round(
                  (row.current_energy_consumed || energyTotals.consumption) * 10
                ) / 10,
              production: Math.round(energyTotals.production * 10) / 10,
              bill: row.current_bill || row.monthly_cost || 0,
              status: mockStatuses[idx % mockStatuses.length],
              plan,
              monthLabel,
              monthKey,
              monthDate: month,
              year: month ? month.getFullYear() : null,
            };
          }
        );

        setHouseholds(householdsData);
        setIsOnline(true);
      } catch (error) {
        console.error("Failed to fetch household data:", error);
        setIsOnline(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-screen-2xl px-6 pb-12">
        <div className="py-8 text-center text-zinc-500">
          Loading live data from RisingWave...
        </div>
      </section>
    );
  }

  const filteredHouseholds = households.filter((home) => {
    return true;
  });


  const buildFilterLabel = () => {
    const parts = [
      activePlan === "All" ? null : `Plan: ${activePlan}`,
      activeYear === "All" ? null : `Year: ${activeYear}`,
      activeMonth === "All" ? null : `Month: ${activeMonth}`,
    ].filter(Boolean);
    return parts.length ? parts.join(" | ") : "No filters applied";
  };

  const formatTimestamp = () =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date());

  const openPrintPreview = (title: string, content: string) => {
    if (typeof window === "undefined") return;
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) {
      alert("Please allow popups to preview the PDF.");
      return;
    }
    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0b1b33; padding: 24px; }
            h1 { margin-bottom: 4px; }
            .meta { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
            .filters { color: #4a5568; font-size: 12px; margin: 0; }
            .timestamp { color: #4a5568; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            th { background: #0b1b33; color: white; }
            tr:nth-child(even) { background: #f8fafc; }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const exportReportPreview = () => {
    const rows = filteredHouseholds
      .map(
        (h) => `
          <tr>
            <td>${h.id}</td>
            <td>${h.address}</td>
            <td>${h.consumption.toFixed(1)} kWh</td>
            <td>${h.production.toFixed(1)} kWh</td>
            <td>${(h.production - h.consumption >= 0 ? "+" : "") + (h.production - h.consumption).toFixed(1)} kWh</td>
            <td>$${h.bill.toFixed(2)}</td>
            <td>${h.plan}</td>
          </tr>
        `
      )
      .join("");

    const generatedAt = formatTimestamp();
    const content = `
      <h1>Live Billing Report</h1>
      <div class="meta">
        <div class="filters">${buildFilterLabel()}</div>
        <div class="timestamp">Generated ${generatedAt}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Household ID</th>
            <th>Address</th>
            <th>Consumption</th>
            <th>Production</th>
            <th>Net</th>
            <th>Bill</th>
            <th>Plan</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="7">No data with current filters.</td></tr>`}
        </tbody>
      </table>
    `;
    openPrintPreview("Billing Report", content);
  };

  const exportSingleHousehold = (home: Household) => {
    const net = home.production - home.consumption;
    const generatedAt = formatTimestamp();
    const content = `
      <h1>Household Report</h1>
      <div class="meta">
        <div class="filters">${home.id} - ${home.address}</div>
        <div class="timestamp">Generated ${generatedAt}</div>
      </div>
      <table>
        <tbody>
          <tr><th>Plan</th><td>${home.plan}</td></tr>
          <tr><th>Period</th><td>${home.monthLabel}</td></tr>
          <tr><th>Consumption</th><td>${home.consumption.toFixed(1)} kWh</td></tr>
          <tr><th>Production</th><td>${home.production.toFixed(1)} kWh</td></tr>
          <tr><th>Net</th><td>${net >= 0 ? "+" : ""}${net.toFixed(1)} kWh</td></tr>
          <tr><th>Bill</th><td>$${home.bill.toFixed(2)}</td></tr>
        </tbody>
      </table>
    `;
    openPrintPreview("Household Report", content);
  };

  const monthOptions = Array.from(
    new Map(
      households
        .filter((h) => h.monthDate)
        .map((h) => [h.monthKey, { key: h.monthKey, label: h.monthLabel, date: h.monthDate as Date }])
    ).values()
  ).sort((a, b) => b.date.getTime() - a.date.getTime());

  const yearOptions = Array.from(
    new Set(
      households
        .map((h) => (h.year !== null ? String(h.year) : null))
        .filter(Boolean) as string[]
    )
  ).sort((a, b) => Number(b) - Number(a));

  return (
    <section className="mx-auto w-full max-w-screen-2xl px-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
        <div className="flex min-w-72 flex-col gap-1">
          <p className="text-2xl font-semibold text-[#0b1b33]">
            Live Billing Report
          </p>
          <p className="text-sm text-zinc-500">
            Review and compare monthly energy data for all households.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              isOnline ? "bg-emerald-500" : "bg-red-500"
            }`}
            onClick={exportReportPreview}
            disabled={!isOnline}
          >
            <span>{isOnline ? "Export Report" : "Offline"}</span>
          </button>
        </div>
      </div>

      {/* Search bar removed per request */}

      <div className="overflow-x-auto rounded-xl border border-[#0b6b6b] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#0b6b6b] bg-[#0b1b33] text-xs uppercase text-white">
            <tr>
              <th className="px-6 py-3 font-semibold">Household ID</th>
              <th className="px-6 py-3 font-semibold">Address</th>
              <th className="px-6 py-3 font-semibold">Consumption (kWh)</th>
              <th className="px-6 py-3 font-semibold">Production (kWh)</th>
              <th className="px-6 py-3 font-semibold">Net (kWh)</th>
              <th className="px-6 py-3 font-semibold">Total Bill ($)</th>
              <th className="px-6 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="text-zinc-900">
            {filteredHouseholds.length ? (
              filteredHouseholds.map((home) => {
                const net = home.production - home.consumption;
                const netClass = net >= 0 ? "text-[#009990]" : "text-red-600";
                return (
                  <tr
                    key={home.id}
                    className={`border-b border-[#e2e8f0] last:border-0 transition hover:bg-[#f7fbff] ${
                      selectedId === home.id ? "bg-[#eef7ff]" : ""
                    }`}
                    onClick={() => onSelect?.(home.id)}
                    role={onSelect ? "button" : undefined}
                    tabIndex={onSelect ? 0 : -1}
                  >
                    <td className="px-6 py-3 font-medium text-[#0b1b33]">
                      {home.id}
                    </td>
                    <td className="px-6 py-3 text-sm text-zinc-600">
                      {home.address}
                    </td>
                    <td className="px-6 py-3">
                      {home.consumption.toFixed(1)}
                    </td>
                    <td className="px-6 py-3">
                      {home.production.toFixed(1)}
                    </td>
                    <td className={`px-6 py-3 font-medium ${netClass}`}>
                      {net > 0 ? "+" : ""}
                      {net.toFixed(1)}
                    </td>
                    <td className="px-6 py-3">${home.bill.toFixed(2)}</td>

                    <td className="px-6 py-3">
                      <button
                        className="font-semibold text-[#0b6b6b] hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewing(home);
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  className="px-6 py-8 text-center text-sm text-zinc-500"
                  colSpan={7}
                >
                  No households match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-6 py-4 text-sm text-zinc-600">
          <span>
            Showing {filteredHouseholds.length} of {households.length} households
          </span>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center justify-center rounded-lg p-2 text-[#074799] hover:bg-[#e6f0ff] disabled:opacity-50"
              disabled
            >
              ‹
            </button>
            <button className="flex items-center justify-center rounded-lg p-2 text-[#074799] hover:bg-[#e6f0ff]">
              ›
            </button>
          </div>
        </div>
      </div>

      {viewing ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Household
                </p>
                <p className="text-xl font-semibold text-[#0b1b33]">
                  {viewing.id} — {viewing.address}
                </p>
              </div>
              <button
                className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100"
                onClick={() => setViewing(null)}
                aria-label="Close details"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-[#f7fbff] px-4 py-3">
                <p className="text-xs uppercase text-zinc-500">Plan</p>
                <p className="text-lg font-semibold text-[#0b1b33]">
                  {viewing.plan}
                </p>
                <p className="text-xs text-zinc-500">
                  {viewing.monthLabel} {viewing.year ?? ""}
                </p>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                <p className="text-xs uppercase text-zinc-500">
                  Consumption / Production
                </p>
                <p className="text-lg font-semibold text-[#0b1b33]">
                  {viewing.consumption.toFixed(1)} kWh /{" "}
                  {viewing.production.toFixed(1)} kWh
                </p>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                <p className="text-xs uppercase text-zinc-500">Net</p>
                <p
                  className={`text-lg font-semibold ${
                    viewing.production - viewing.consumption >= 0
                      ? "text-[#009990]"
                      : "text-red-600"
                  }`}
                >
                  {viewing.production - viewing.consumption >= 0 ? "+" : ""}
                  {(viewing.production - viewing.consumption).toFixed(1)} kWh
                </p>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                <p className="text-xs uppercase text-zinc-500">Bill</p>
                <p className="text-lg font-semibold text-[#0b1b33]">
                  ${viewing.bill.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-zinc-200 px-6 py-4">
              <button
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
                onClick={() => setViewing(null)}
              >
                Close
              </button>
              <button
                className="rounded-lg bg-[#0b6b6b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c777a]"
                onClick={() => exportSingleHousehold(viewing)}
              >
                Export household
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
