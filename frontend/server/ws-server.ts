import { createServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { Pool } from 'pg';
import Redis from 'ioredis';

const pool = new Pool({
    host: process.env.RISINGWAVE_HOST || 'localhost',
    port: parseInt(process.env.RISINGWAVE_PORT || '4566'),
    database: process.env.RISINGWAVE_DB || 'dev',
    user: process.env.RISINGWAVE_USER || 'root',
    password: process.env.RISINGWAVE_PASSWORD || '',
});

// --- Redis setup ---
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
});

const PORT = parseInt(process.env.WS_PORT || '8080', 10);

// Interval in ms (faster updates for more visible changes)
const UPDATE_INTERVAL = 100;

const server = createServer();
const wss = new WebSocketServer({ server });

// Add variance to simulate more realistic energy fluctuations
function addVariance(baseValue: number, variancePercent: number = 15): number {
    const variance = baseValue * (variancePercent / 100);
    const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
    return Math.max(0, baseValue + (variance * randomFactor));
}

// Broadcast function
async function broadcastEnergyData() {
    try {
        // Try Redis cache first
        const cached = await redis.get('energy_data');
        let data;
        if (cached) {
            data = JSON.parse(cached);
            // Add variance to cached data to simulate real-time fluctuations
            data.totals = data.totals.map((row: any) => ({
                ...row,
                total_consumed: addVariance(row.total_consumed, 20),
                total_produced: addVariance(row.total_produced, 30),
                total_energy: addVariance(row.total_energy, 25)
            }));
        } else {
            // Fetch totals
            const totalsQuery = await pool.query(`
                SELECT 
                    meter_id,
                    SUM(energy_consumed) as total_consumed,
                    SUM(energy_produced) as total_produced,
                    SUM(total_energy) as total_energy,
                    MAX(window_end) as last_update
                FROM energy_per_house
                GROUP BY meter_id
                ORDER BY meter_id
            `);

            // Time series
            const timeSeriesQuery = await pool.query(`
                SELECT 
                    window_end,
                    SUM(energy_consumed) as energy_consumed,
                    SUM(energy_produced) as energy_produced,
                    SUM(total_energy) as total_energy
                FROM energy_per_house
                WHERE window_end >= (SELECT MAX(window_end) - INTERVAL '2 hours' FROM energy_per_house)
                GROUP BY window_end
                ORDER BY window_end DESC
                LIMIT 20
            `);

            // Add variance to fresh data
            const totalsWithVariance = totalsQuery.rows.map((row: any) => ({
                ...row,
                total_consumed: addVariance(parseFloat(row.total_consumed), 20),
                total_produced: addVariance(parseFloat(row.total_produced), 30),
                total_energy: addVariance(parseFloat(row.total_energy), 25)
            }));
            
            const timeSeriesWithVariance = timeSeriesQuery.rows.map((row: any) => ({
                ...row,
                energy_consumed: addVariance(parseFloat(row.energy_consumed), 25),
                energy_produced: addVariance(parseFloat(row.energy_produced), 35),
                total_energy: addVariance(parseFloat(row.total_energy), 30)
            }));

            data = { totals: totalsWithVariance, timeSeries: timeSeriesWithVariance };
            // Cache for 1 second to reduce DB pressure while allowing frequent broadcasts
            await redis.setex('energy_data', 1, JSON.stringify(data));
        }

        // Broadcast to all clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'energy_update', data }));
            }
        });
    } catch (err) {
        console.error('Error broadcasting energy data:', err);
    }
}

wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    // Send heartbeat to detect disconnected clients
    const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', ts: new Date().toISOString() }));
        }
    }, 10000);

    ws.on('close', () => {
        console.log('Client disconnected');
        clearInterval(heartbeat);
    });
});

// initial broadcast immediately on startup
broadcastEnergyData().catch(err => console.error('Initial broadcast failed:', err));

// Start interval broadcast
setInterval(broadcastEnergyData, UPDATE_INTERVAL);

server.listen(PORT, () => {
    console.log(`WebSocket server listening on ws://localhost:${PORT}`);
    console.log(`Broadcast interval: ${UPDATE_INTERVAL}ms`);
});