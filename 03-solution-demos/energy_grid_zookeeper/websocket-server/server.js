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

const wss = new WebSocket.Server({ host: "0.0.0.0", port: 8080 });

wss.on('connection', (ws) => {
  console.log('dashboard client connected via WebSocket');

  ws.on('message', async (message) => {
    const request = JSON.parse(message.toString());
    
    if (request.type === 'subscribe_energy') {
      // Stream real-time energy data
      streamEnergyData(ws);
    }
  });
});

async function streamEnergyData(ws) {
  const client = new Client(risingwaveConfig);
  await client.connect();

  // Subscribe to real-time changes in energy_per_house
  const query = `
    SELECT meter_id, energy_consumed, energy_produced, total_energy, window_end
    FROM energy_per_house
    WHERE window_end >= NOW() - INTERVAL '1 minute'
    ORDER BY window_end DESC
    LIMIT 20
  `;

  // Send initial data
  const result = await client.query(query);
  ws.send(JSON.stringify({
    type: 'energy_data',
    data: result.rows
  }));

  // Set up polling for updates (since RisingWave doesn't have built-in WebSocket streaming)
  setInterval(async () => {
    try {
      const result = await client.query(query);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'energy_data',
          data: result.rows
        }));
      }
    } catch (error) {
      console.error('Error streaming data:', error);
    }
  }, 1000); // Update every second
}

console.log('WebSocket server running on port 8080');