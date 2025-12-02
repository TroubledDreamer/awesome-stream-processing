type Household = {
  id: string;
  address: string;
  consumption: number;
  production: number;
  bill: number;
  status: "Paid" | "Pending" | "Overdue";
};

const households: Household[] = [
  { id: "HH-58231", address: "100 Energy Lane", consumption: 450, production: 510, bill: 67.5, status: "Paid" },
  { id: "HH-79426", address: "102 Energy Lane", consumption: 520, production: 480, bill: 78, status: "Overdue" },
  { id: "HH-10853", address: "104 Energy Lane", consumption: 380, production: 400, bill: 57, status: "Paid" },
  { id: "HH-93104", address: "106 Energy Lane", consumption: 610, production: 600, bill: 91.5, status: "Pending" },
  { id: "HH-45227", address: "108 Energy Lane", consumption: 430, production: 490, bill: 64.5, status: "Paid" },
  { id: "HH-68310", address: "110 Energy Lane", consumption: 490, production: 470, bill: 73.5, status: "Paid" },
  { id: "HH-81244", address: "112 Energy Lane", consumption: 505, production: 515, bill: 69.75, status: "Pending" },
  { id: "HH-99102", address: "114 Energy Lane", consumption: 470, production: 495, bill: 66.1, status: "Paid" },
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
  return (
    <section className="mx-auto w-full max-w-screen-2xl px-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
        <div className="flex min-w-72 flex-col gap-1">
          <p className="text-2xl font-semibold text-[#0b1b33]">Monthly Billing Report</p>
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
                    <td className="px-6 py-3 font-medium text-[#0b1b33]">{home.id}</td>
                    <td className="px-6 py-3 text-sm text-zinc-600">{home.address}</td>
                    <td className="px-6 py-3">{home.consumption}</td>
                    <td className="px-6 py-3">{home.production}</td>
                    <td className={`px-6 py-3 font-medium ${netClass}`}>
                      {net > 0 ? "+" : ""}
                    {net}
                  </td>
                  <td className="px-6 py-3">${home.bill.toFixed(2)}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${statusStyles(
                          home.status,
                        )}`}
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                        {home.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <button className="text-[#0b6b6b] font-semibold hover:underline">View</button>
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
