"use client";
import { useEffect, useRef, useState } from "react";

const initialNotifications = [
  { id: 1, title: "Meter sync completed", time: "Just now" },
  { id: 2, title: "New data point ingested", time: "1 min ago" },
  { id: 3, title: "Grid balance within threshold", time: "5 mins ago" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialNotifications);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <section className="mx-auto w-full max-w-screen-2xl px-[29px] pb-[17px] pt-[5px]">
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-[#0b1b33] via-[#0f304a] to-[#0b5155] px-6 py-6 text-white shadow-lg">
        <div className="flex min-w-72 flex-col gap-2">
          <p className="text-3xl font-black leading-tight md:text-4xl">RisingWave Energy Grid</p>
          <p className="text-sm text-[#9db9ab]">
            Real-time energy consumption and production monitoring.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <p className="text-xs text-slate-300">
            Last updated {lastUpdated.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </p>
          <button
            className="flex min-h-11 items-center gap-2 rounded-lg border border-[#0b6b6b] bg-[#0b5155] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c777a]"
            onClick={() => setLastUpdated(new Date())}
          >
            <span className="text-lg">⟳</span>
            Update
          </button>
          <div className="flex min-h-11 items-center gap-3 rounded-lg border border-[#0b6b6b] bg-[#0b1b33]/70 px-4 py-2 backdrop-blur">
            <div className="relative flex items-center">
              <span className="absolute h-2 w-2 rounded-full bg-[#62f3e8] opacity-75 animate-ping" />
              <span className="relative h-2 w-2 rounded-full bg-[#62f3e8]" />
            </div>
            <span className="text-sm font-medium text-white">Live</span>
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              className="relative flex min-h-11 items-center gap-2 rounded-lg border border-[#0b6b6b] bg-[#0b1b33]/80 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-[#0c777a]/80"
              onClick={() => setOpen((prev) => !prev)}
            >
              {items.length > 0 ? (
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-[#0b1b33]" aria-label="New alerts" />
              ) : null}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.584a2 2 0 0 1-3.714 0M12 6.75c-2.9 0-5.25 2.35-5.25 5.25v2.58c0 .46-.188.902-.52 1.22l-.38.36c-.63.6-.19 1.64.66 1.64h10.98c.85 0 1.29-1.04.66-1.64l-.38-.36a1.75 1.75 0 0 1-.52-1.22V12c0-2.9-2.35-5.25-5.25-5.25Z"
                />
              </svg>
              Alerts
            </button>
            {open ? (
              <div className="absolute right-0 top-12 z-20 w-72 rounded-xl border border-[#0b6b6b] bg-[#0b1b33] shadow-xl">
                <div className="flex items-center justify-between gap-3 border-b border-[#0b6b6b]/60 px-4 py-3 text-sm font-semibold">
                  <span>Notifications</span>
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <button
                      className="text-[#9bd2ff] hover:text-white"
                      onClick={() => setItems([])}
                    >
                      Clear all
                    </button>
                    <button
                      className="text-[#9bd2ff] hover:text-white"
                      onClick={() => setOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
                <ul className="max-h-64 divide-y divide-[#0b6b6b]/50 overflow-y-auto">
                  {items.length ? (
                    items.map((note) => (
                      <li key={note.id} className="px-4 py-3">
                        <p className="text-sm font-medium text-white">{note.title}</p>
                        <p className="text-xs text-slate-400">{note.time}</p>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-6 text-center text-xs text-slate-500">
                      No notifications
                    </li>
                  )}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
