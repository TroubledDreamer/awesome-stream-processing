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

const wss = new WebSocket.Server({
  host: "0.0.0.0",
  port: 8080
});

console.log("WebSocket server running on ws://0.0.0.0:8080");

wss.on('connection', (ws) => {
  console.log("Dashboard client connected");

  let streaming = false;
  let rwClient = null;
  let queryStream = null;

  ws.on('message', async (msg) => {
    const payload = JSON.parse(msg.toString());

    if (payload.type === "subscribe_energy" && !streaming) {
      streaming = true;
      startStreaming(ws);
    }
  });

  ws.on('close', () => {
    console.log("WebSocket client disconnected");
    cleanup();
  });

  ws.on('error', (err) => {
    console.error("WebSocket error:", err);
    cleanup();
  });

  async function startStreaming(ws) {
    try {
      rwClient = new Client(risingwaveConfig);
      await rwClient.connect();

      // Send initial snapshot
      console.log("Sending initial snapshot...");
      const snapshot = await rwClient.query(`
        SELECT * FROM energy_stream
        ORDER BY window_end DESC
        LIMIT 50;
      `);

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "energy_snapshot",
          data: snapshot.rows
        }));
      }

      // IMPORTANT:
      // Send SUBSCRIBE as a simple text query.
      console.log("Starting SUBSCRIBE stream...");
      queryStream = rwClient.query(`
        SUBSCRIBE (SELECT * FROM energy_stream);
      `);

      // Handle streaming events
      queryStream.on("row", (row) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "energy_update",
            data: row
          }));
        }
      });

      queryStream.on("error", (err) => {
        console.error("RisingWave SUBSCRIBE error:", err);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "error", message: "Stream failed" }));
        }
        cleanup();
      });

      queryStream.on("end", () => {
        console.log("SUBSCRIBE stream ended.");
        cleanup();
      });

    } catch (err) {
      console.error("Error starting stream:", err);
      cleanup();
    }
  }

  async function cleanup() {
    streaming = false;

    if (queryStream) {
      queryStream.removeAllListeners();
      queryStream = null;
    }

    if (rwClient) {
      try {
        await rwClient.end();
      } catch (_) {}
      rwClient = null;
    }
  }
});
