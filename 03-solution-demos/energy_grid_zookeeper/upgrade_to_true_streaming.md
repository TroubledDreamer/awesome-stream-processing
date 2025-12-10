RisingWave True-Streaming Upgrade Guide
Full Project Migration Instructions for AI-assisted Upgrades

This document provides complete instructions for upgrading an existing project that streams data from RisingWave (inside Docker) to a dashboard (outside Docker). It includes:

Fixing WebSocket networking issues

Enabling RisingWave true streaming via SUBSCRIBE

Configuring Node.js + PostgreSQL client for simple-query mode

Updating your backend WebSocket server

Updating your React dashboard

Optional materialized view improvements

Notes on project structure & handling multiple clients

These instructions are written so an AI can use them to modify the project safely and correctly.

🧩 1. Architecture Overview

The project architecture:

RisingWave (in Docker)
   ↕ PostgreSQL wire protocol
WebSocket Server (Node.js inside Docker)
   ↕ WebSocket
Dashboard (React outside Docker)


Goal: Replace polling with real-time RisingWave streaming.

🛠 2. Required Fixes & Upgrades

This guide includes all necessary changes:

✅ Fix 1 — WebSocket server binding inside Docker

Node’s ws module binds to localhost by default, so inside Docker it is unreachable.

AI MUST update:

const wss = new WebSocket.Server({
  host: "0.0.0.0",
  port: 8080
});

✅ Fix 2 — Enable RisingWave SUBSCRIBE simple-query mode

The Node PostgreSQL client (pg) uses extended protocol, which does NOT work with SUBSCRIBE.

AI MUST inject:

client.connection.parse = null;


before executing .query().

✅ Fix 3 — Keep RisingWave TCP connection open

When a WebSocket client disconnects, AI must call:

await client.end();


This ensures clean shutdown.

✅ Fix 4 — Never share a connection between multiple clients

Every browser dashboard session gets:

its own WS connection

its own RisingWave client

its own SUBSCRIBE stream

✅ Fix 5 — Send initial snapshot + stream afterward

RisingWave SUBSCRIBE does not return historical rows, only new ones.

AI must:

Run a normal SELECT (snapshot)

Then open a SUBSCRIBE stream

🟦 3. Create a Materialized View for Stable Streaming

AI should add this to RisingWave initialization:

CREATE MATERIALIZED VIEW IF NOT EXISTS energy_stream AS
SELECT
  meter_id,
  energy_consumed,
  energy_produced,
  total_energy,
  window_end
FROM energy_per_house
ORDER BY window_end ASC;


This ensures:

stable schema

efficient delta updates

deterministic ordering

🔌 4. WebSocket Server — Full Streaming Version

AI must replace the existing server.js with:

// server.js

const WebSocket = require('ws');
const { Client } = require('pg');

// RisingWave connection
const risingwaveConfig = {
  host: 'risingwave',
  port: 4566,
  database: 'dev',
  user: 'root',
  password: ''
};

// WebSocket server bound to all interfaces
const wss = new WebSocket.Server({
  host: "0.0.0.0",
  port: 8080
});

console.log("WebSocket server running on ws://0.0.0.0:8080");

wss.on('connection', (ws) => {
  console.log('dashboard client connected');

  ws.on('message', async (msg) => {
    const request = JSON.parse(msg.toString());

    if (request.type === 'subscribe_energy') {
      startStreaming(ws);
    }
  });

  ws.on('close', () => {
    console.log("WebSocket client disconnected");
  });
});

async function startStreaming(ws) {
  const client = new Client(risingwaveConfig);
  await client.connect();

  // Use simple-query mode (required for SUBSCRIBE)
  client.connection.parse = null;

  // Send initial snapshot
  const initial = await client.query(`
    SELECT * FROM energy_stream ORDER BY window_end DESC LIMIT 50;
  `);

  ws.send(JSON.stringify({
    type: 'energy_snapshot',
    data: initial.rows
  }));

  // Open the live subscription stream
  const stream = client.query(`
    SUBSCRIBE (SELECT * FROM energy_stream);
  `);

  stream.on('row', (row) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'energy_update',
        data: row
      }));
    }
  });

  stream.on('end', () => {
    console.log("RisingWave SUBSCRIBE stream ended");
  });

  stream.on('error', (err) => {
    console.error("RisingWave SUBSCRIBE error:", err);
  });

  ws.on('close', async () => {
    console.log("Client disconnected; closing RisingWave connection");
    await client.end();
  });
}

🖥 5. React Dashboard Upgrade

AI must update your WebSocket client to:

auto-reconnect

parse two event types: energy_snapshot and energy_update

merge updates into UI state

Replace your component with:

'use client';

import { useEffect } from 'react';

export default function StreamingClient({ onSnapshot, onUpdate, onStatus }) {

  useEffect(() => {
    let ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
      onStatus?.('connected');
      ws.send(JSON.stringify({ type: 'subscribe_energy' }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'energy_snapshot') onSnapshot?.(msg.data);
        if (msg.type === 'energy_update') onUpdate?.(msg.data);
      } catch (err) {
        console.error("WS parse error:", err);
      }
    };

    ws.onerror = (err) => {
      onStatus?.('error');
      console.error("WebSocket error:", err);
    };

    ws.onclose = () => {
      onStatus?.('disconnected');
    };

    return () => ws.close();
  }, [onSnapshot, onUpdate, onStatus]);

  return null;
}

🔄 6. How the Dashboard Should Handle Streaming Data

AI should update UI state like:

// snapshot is full array
setRows(snapshot);

// each update is a single row
setRows(prev => [...prev, updateRow]);


Or any UI logic the project uses (charts, tables, etc.).

⚙ 7. Docker Requirements

AI must ensure:

WebSocket server container:

uses Node.js 18+

exposes 0.0.0.0

maps port 8080 → host

Example docker-compose:
websocket-server:
  build: ./websocket-server
  ports:
    - "8080:8080"
  depends_on:
    - risingwave

🧪 8. Test Procedure

AI should ensure these tests pass:

Test WebSocket availability:
ws://localhost:8080

Test RisingWave connection from WS container:
psql -h risingwave -p 4566 -U root -d dev -c "SELECT 1;"

Test initial snapshot reaches dashboard

Console should log:
energy_snapshot (...)

Test live update

Produce new CDC data → dashboard should immediately receive energy_update.

📚 9. Notes About RisingWave SUBSCRIBE

AI must remember:

SUBSCRIBE sends only new changes, not historical rows

Requires simple SQL mode

Cannot be parameterized

One connection per subscriber

Requires materialized inputs for stable performance

If no consumer exists, MV continues to compute normally

🎉 10. Summary for AI

To upgrade the project:

Bind WebSocket server to 0.0.0.0.

Use RisingWave SUBSCRIBE.

Enable simple-query mode:
client.connection.parse = null

Create energy_stream MATERIALIZED VIEW.

Implement initial snapshot + streaming rows.

Ensure a dedicated RisingWave client per WebSocket client.

Update React dashboard to handle streaming.

Confirm Docker networking + port mapping.

These steps produce true millisecond-level streaming from RisingWave → WebSocket → Dashboard.