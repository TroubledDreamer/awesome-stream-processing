const WebSocket = require('ws');
const { Client } = require('pg');
const { parse } = require('csv-parse/sync');

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
  let dataHandler = null;
  let subscribePromise = null;
  let connection = null;
  let rowBuffer = '';

  ws.on('message', async (msg) => {
    try {
      const payload = JSON.parse(msg.toString());
      if (payload.type === "subscribe_energy" && !streaming) {
        streaming = true;
        await startStreaming(ws);
      }
    } catch (err) {
      console.error("Error handling message:", err);
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

      // CRITICAL: Enable simple-query mode (required for SUBSCRIBE)
      rwClient.connection.parse = null;
      connection = rwClient.connection;

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

      // Start SUBSCRIBE stream
      console.log("Starting SUBSCRIBE stream...");

      // Reset buffer
      rowBuffer = '';
      let headerSkipped = false;

      // Set up data handler with automatic CSV/TSV parsing
      dataHandler = (chunk) => {
        if (!streaming || ws.readyState !== WebSocket.OPEN) return;

        try {
          rowBuffer += chunk.toString();
          
          // Split by newlines
          const lines = rowBuffer.split('\n');
          rowBuffer = lines.pop() || ''; // Keep incomplete line

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Skip header/metadata lines
            if (!headerSkipped) {
              if (trimmed.toLowerCase().startsWith('meter_id') ||
                  trimmed.match(/^copy\s+/i) ||
                  trimmed.match(/^[-|]+$/)) {
                headerSkipped = true;
                continue;
              }
              // Assume first data line starts, mark header as skipped
              headerSkipped = true;
            }

            // Parse using csv-parse library (handles TSV, NULLs, escaping)
            try {
              // Detect delimiter (tab is PostgreSQL COPY default, pipe also possible)
              const delimiter = trimmed.includes('\t') ? '\t' : 
                               trimmed.includes('|') ? '|' : 
                               null;

              if (!delimiter) {
                // Might be JSON or other format
                if (trimmed.startsWith('{')) {
                  try {
                    const rowData = JSON.parse(trimmed);
                    if (rowData && typeof rowData.meter_id !== 'undefined') {
                      ws.send(JSON.stringify({
                        type: "energy_update",
                        data: rowData
                      }));
                    }
                  } catch (e) {
                    // Not JSON, skip
                  }
                }
                continue;
              }

              // Use csv-parse to handle the row properly
              // It handles NULLs (\N), escaped values, etc.
              const parsed = parse(trimmed, {
                delimiter: delimiter,
                relax_quotes: true,
                escape: '\\',
                skip_empty_lines: true,
                cast: (value, context) => {
                  // Handle PostgreSQL NULL representation
                  if (value === '\\N' || value === 'NULL' || value === '') {
                    return null;
                  }
                  // Let csv-parse handle basic casting
                  return value;
                }
              });

              if (parsed && parsed[0] && parsed[0].length >= 5) {
                const row = parsed[0];
                const rowData = {
                  meter_id: row[0] ? parseInt(row[0]) : null,
                  energy_consumed: row[1] ? parseFloat(row[1]) : null,
                  energy_produced: row[2] ? parseFloat(row[2]) : null,
                  total_energy: row[3] ? parseFloat(row[3]) : null,
                  window_end: row[4] || null
                };

                // Validate row
                if (rowData.meter_id !== null && !isNaN(rowData.meter_id)) {
                  ws.send(JSON.stringify({
                    type: "energy_update",
                    data: rowData
                  }));
                }
              }
            } catch (parseErr) {
              // Skip unparseable lines (metadata, etc.)
              console.debug("Skipped unparseable line:", trimmed.substring(0, 50));
            }
          }
        } catch (err) {
          console.error("Error processing stream data:", err);
        }
      };

      connection.on('data', dataHandler);

      connection.on('error', (err) => {
        console.error("RisingWave connection error:", err);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "error",
            message: "Stream connection error: " + err.message
          }));
        }
        cleanup();
      });

      // Execute SUBSCRIBE query
      subscribePromise = rwClient.query(`
        SUBSCRIBE (SELECT * FROM energy_stream);
      `);

      subscribePromise.catch((err) => {
        if (streaming) {
          console.error("SUBSCRIBE query error:", err);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "error",
              message: "SUBSCRIBE failed: " + err.message
            }));
          }
          cleanup();
        }
      });

      console.log("SUBSCRIBE query executed, streaming data...");

    } catch (err) {
      console.error("Error starting stream:", err);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "error",
          message: "Failed to start streaming: " + err.message
        }));
      }
      cleanup();
    }
  }

  async function cleanup() {
    streaming = false;

    if (connection && dataHandler) {
      try {
        connection.removeListener('data', dataHandler);
      } catch (err) {
        console.error("Error removing data handler:", err);
      }
      dataHandler = null;
    }

    if (subscribePromise) {
      subscribePromise = null;
    }

    if (rwClient) {
      try {
        await rwClient.end();
      } catch (err) {
        console.error("Error closing RisingWave connection:", err);
      }
      rwClient = null;
    }

    connection = null;
    rowBuffer = '';
  }
});