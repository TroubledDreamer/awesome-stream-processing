export default function Visuals() {
  return (
    <section className="mx-auto w-full max-w-screen-2xl px-6 pb-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-[#0b6b6b] bg-gradient-to-br from-[#0b1b33] via-[#0f304a] to-[#0b5155] px-5 py-5 text-white shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold">Energy Usage Over Time</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {["Last Hour", "24 Hours", "7 Days", "30 Days", "Custom"].map((label, idx) => (
                <button
                  key={label}
                  className={`flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition ${
                    idx === 0
                      ? "bg-[#0b6b6b] text-white"
                      : "bg-[#0f304a] text-white hover:bg-[#0b6b6b]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex h-80 w-full items-center justify-center rounded-xl border border-[#0b6b6b] bg-[#0b1b33]/70 text-center text-[#dce7f5]">
            <div>
              <div className="text-4xl">📈</div>
              <p className="mt-2 text-lg font-semibold">Interactive Time-Series Chart Area</p>
              <p className="text-sm text-[#dce7f5]">Data visualization would render here.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
