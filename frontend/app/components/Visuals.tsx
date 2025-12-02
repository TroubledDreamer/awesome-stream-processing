export default function Visuals() {
  return (
    <section className="mx-auto w-full max-w-screen-2xl px-6 pb-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-[#3b5447] bg-[#11221a] px-5 py-5 text-white shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold">Energy Usage Over Time</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {["Last Hour", "24 Hours", "7 Days", "30 Days", "Custom"].map((label, idx) => (
                <button
                  key={label}
                  className={`flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition ${
                    idx === 0
                      ? "bg-emerald-500 text-black"
                      : "bg-[#1a3327] text-white hover:bg-[#234132]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex h-80 w-full items-center justify-center rounded-xl border border-[#3b5447] bg-[#1a2c23]/60 text-center text-[#9db9ab]">
            <div>
              <div className="text-4xl">📈</div>
              <p className="mt-2 text-lg font-semibold">Interactive Time-Series Chart Area</p>
              <p className="text-sm">Data visualization would render here.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
