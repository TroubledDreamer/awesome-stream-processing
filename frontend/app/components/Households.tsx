"use client";
import { useEffect, useState } from "react";

type Household = {
  id: string;
  address: string;
  consumption: number;
  production: number;
  bill: number;
  status: "Paid" | "Pending" | "Overdue";
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

        // Combine tiered and TOU bills - bills API already has address and current_energy_consumed
        const allBills = [
          ...(billsData.tiered || []),
          ...(billsData.tou || []),
        ];

        // Get energy totals for meters that might not have bills yet
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

        const householdsData: Household[] = allBills.map(
          (row: any, idx: number) => {
            const meterId = String(row.meter_id);
            const energyTotals = energyTotalsMap.get(meterId) || {
              consumption: 0,
              production: 0,
            };

            return {
              id: meterId,
              address: row.address || "Unknown Address",
              // Use current_energy_consumed from bills if available, otherwise use totals
              consumption:
                Math.round(
                  (row.current_energy_consumed || energyTotals.consumption) * 10
                ) / 10,
              production: Math.round(energyTotals.production * 10) / 10,
              bill: row.current_bill || row.monthly_cost || 0,
              status: mockStatuses[idx % mockStatuses.length],
            };
          }
        );

        setHouseholds(householdsData);
      } catch (error) {
        console.error("Failed to fetch household data:", error);
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
        <div className="text-center py-8 text-zinc-500">
          Loading live data from RisingWave...
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-screen-2xl px-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
        <div className="flex min-w-72 flex-col gap-1">
          <p className="text-2xl font-semibold text-[#0b1b33]">
            Monthly Billing Report
          </p>
          <p className="text-sm text-zinc-500">
            Review and compare monthly energy data for all households.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center justify-center gap-2 rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-black">
            <span>Oct 2023</span>
          </button>
          <button className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">
            <span>Export Report</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 pb-4">
        <label className="flex w-full max-w-xl items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 shadow-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="h-5 w-5 text-zinc-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-4.35-4.35m0 0a7.5 7.5 0 1 0-10.61-10.6 7.5 7.5 0 0 0 10.6 10.6Z"
            />
          </svg>
          <input
            className="w-full bg-transparent text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
            placeholder="Search by Household ID or address"
          />
        </label>
      </div>

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
              <th className="px-6 py-3 font-semibold">Payment Status</th>
              <th className="px-6 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="text-zinc-900">
            {households.map((home) => {
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
                  <td className="px-6 py-3">{home.consumption.toFixed(1)}</td>
                  <td className="px-6 py-3">{home.production.toFixed(1)}</td>
                  <td className={`px-6 py-3 font-medium ${netClass}`}>
                    {net > 0 ? "+" : ""}
                    {net.toFixed(1)}
                  </td>
                  <td className="px-6 py-3">${home.bill.toFixed(2)}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${statusStyles(
                        home.status
                      )}`}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                      {home.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <button className="text-[#0b6b6b] font-semibold hover:underline">
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-6 py-4 text-sm text-zinc-600">
          <span>
            Showing 1 to {households.length} of {households.length} households
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
    </section>
  );
}
