"use client";

import { useEffect, useRef, useState } from "react";

type EnergyData = {
  totals: any[];
  timeSeries: any[];
  bills?: { tiered: any[]; tou: any[] };
};

type EnergyStream = {
  energy: EnergyData;
  connected: boolean;
  lastMessageTs: number | null;
  messageCount: number;
};

// Lightweight client hook to consume the WebSocket energy stream and keep the
// latest payload in React state. It also falls back to /api/energy for an
// initial snapshot.
export function useEnergyStream(throttleMs = 150): EnergyStream {
  const [energy, setEnergy] = useState<EnergyData>({ totals: [], timeSeries: [], bills: undefined });
  const [connected, setConnected] = useState(false);
  const [lastMessageTs, setLastMessageTs] = useState<number | null>(null);
  const [messageCount, setMessageCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    let stopped = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    // Align with the main dashboard WebSocket so every component shares the
    // same live feed
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

    const applyEnergy = (payload: any) => {
      const now = Date.now();
      if (throttleMs && now - lastUpdateRef.current < throttleMs) return;
      lastUpdateRef.current = now;

      const data = payload?.data ?? payload;
      const totalsCandidate = data?.totals ?? (Array.isArray(data) ? data : undefined);
      const timeSeriesCandidate = data?.timeSeries;
      const billsCandidate = data?.bills;

      setEnergy((prev) => ({
        totals: Array.isArray(totalsCandidate) ? totalsCandidate : prev.totals,
        timeSeries: Array.isArray(timeSeriesCandidate) ? timeSeriesCandidate : prev.timeSeries,
        bills: billsCandidate || prev.bills,
      }));
      setLastMessageTs(now);
    };

    const fetchInitial = async () => {
      try {
        const res = await fetch("/api/energy");
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = await res.json();
        applyEnergy(json);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[useEnergyStream] initial fetch failed:", err);
      }
    };

    const connect = () => {
      if (stopped) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectAttempts.current = 0;
        try {
          ws.send(JSON.stringify({ type: "subscribe", view: "energy_totals" }));
        } catch {}
      };

      ws.onmessage = (ev) => {
        try {
          const parsed = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
          if (parsed?.type === "ping") return;

          setMessageCount((c) => c + 1);
          applyEnergy(parsed);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[useEnergyStream] failed to parse message:", err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (stopped) return;
        reconnectAttempts.current += 1;
        const delay = Math.min(10000, 500 * 2 ** Math.min(6, reconnectAttempts.current));
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {}
      };
    };

    fetchInitial();
    connect();

    return () => {
      stopped = true;
      setConnected(false);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        wsRef.current?.close();
      } catch {}
      wsRef.current = null;
    };
  }, [throttleMs]);

  return { energy, connected, lastMessageTs, messageCount };
}
