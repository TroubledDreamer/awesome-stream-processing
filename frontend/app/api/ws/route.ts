"use server";

import { NextRequest } from "next/server";
import Redis from "ioredis";
import { WebSocketServer } from "ws";

type GlobalWSS = typeof globalThis & {
  __wss?: WebSocketServer;
  __redisSub?: Redis;
};

const CHANNELS = [
  "metrics_updates",
  "energy_updates",
  "bill_updates",
  "customer_updates",
  "estimate_updates",
];

const globalWithWSS = globalThis as GlobalWSS;

function createRedisClient() {
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL);
  }
  return new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  });
}

function ensureWebSocketServer() {
  if (globalWithWSS.__wss) return globalWithWSS.__wss;

  const wss = new WebSocketServer({ noServer: true });
  const sub = createRedisClient();

  sub.subscribe(...CHANNELS).catch((err) =>
    console.error("Redis subscribe error:", err)
  );

  sub.on("message", (channel, message) => {
    const payload = JSON.stringify({
      channel,
      data: safeParse(message),
    });
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        try {
          client.send(payload);
        } catch (error) {
          console.error("WebSocket send error:", error);
        }
      }
    });
  });

  globalWithWSS.__wss = wss;
  globalWithWSS.__redisSub = sub;
  return wss;
}

function safeParse(message: string) {
  try {
    return JSON.parse(message);
  } catch {
    return message;
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const upgradeHeader = req.headers.get("upgrade") || "";
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket", { status: 400 });
  }

  const wss = ensureWebSocketServer();
  const { socket } = (req as any);

  if (!socket) {
    return new Response("Socket not found", { status: 500 });
  }

  wss.handleUpgrade(req as any, socket, Buffer.alloc(0), (ws) => {
    wss.emit("connection", ws);
    ws.send(
      JSON.stringify({
        channel: "meta",
        data: { status: "connected", channels: CHANNELS },
      })
    );
  });

  return new Response(null, { status: 101 });
}
