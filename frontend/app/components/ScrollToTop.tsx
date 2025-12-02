"use client";

export default function ScrollToTop() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-30 rounded-full border border-[#0b6b6b] bg-[#0b1b33]/90 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0c777a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0c777a]/60"
      aria-label="Back to top"
    >
      ↑ Top
    </button>
  );
}
