import { Pool } from 'pg';
import Redis from 'ioredis';
import WebSocket from 'ws';

// --- PostgreSQL setup (still exported but unused for now) ---
const pool = new Pool({
    host: process.env.RISINGWAVE_HOST || 'localhost',
    port: parseInt(process.env.RISINGWAVE_PORT || '4566'),
    database: process.env.RISINGWAVE_DB || 'dev',
    user: process.env.RISINGWAVE_USER || 'root',
    password: process.env.RISINGWAVE_PASSWORD || '',
});

// --- Redis setup (optional) ---
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
});

// --- WebSocket setup ---
const WS_URL = process.env.WS_URL || 'ws://localhost:8080';
const ws = new WebSocket(WS_URL);

// --- List of connected frontend clients to broadcast to ---
const clients = new Set<WebSocket>();

export function registerClient(clientWs: WebSocket) {
    clients.add(clientWs);
    clientWs.on("close", () => clients.delete(clientWs));
}

// --- Broadcast to all UI clients ---
function broadcast(message: any) {
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    }
}

// --- Throttle: 60 updates per second ---
let lastBroadcast = 0;
function throttledBroadcast(msg: any) {
    const now = Date.now();
    if (now - lastBroadcast > 16) { // ~60 FPS
        broadcast(msg);
        lastBroadcast = now;
    }
}

ws.on('open', () => {
    console.log('WebSocket connection established to producer');
    ws.send(JSON.stringify({ type: 'hello', message: 'Hello server!' }));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    // Broadcast to UI at throttled speed
    throttledBroadcast(msg);

    // Optional: store in Redis if needed
    // redis.lpush('ws_messages', data.toString());
});

ws.on('close', () => console.log('WebSocket connection closed'));
ws.on('error', (err) => console.error('WebSocket error:', err));

export { pool, redis, ws };



// import { Pool } from 'pg';
// import Redis from 'ioredis';
// import WebSocket from 'ws';

// // --- PostgreSQL setup ---
// const pool = new Pool({
//     host: process.env.RISINGWAVE_HOST || 'localhost',
//     port: parseInt(process.env.RISINGWAVE_PORT || '4566'),
//     database: process.env.RISINGWAVE_DB || 'dev',
//     user: process.env.RISINGWAVE_USER || 'root',
//     password: process.env.RISINGWAVE_PASSWORD || '',
// });

// // --- Redis setup ---
// const redis = new Redis({
//     host: process.env.REDIS_HOST || 'localhost',
//     port: parseInt(process.env.REDIS_PORT || '6379'),
// });

// // --- WebSocket setup ---
// const WS_URL = process.env.WS_URL || 'ws://localhost:8080';
// const ws = new WebSocket(WS_URL);

// ws.on('open', () => {
//     console.log('WebSocket connection established');
//     // Optionally, send an initial message
//     ws.send(JSON.stringify({ type: 'hello', message: 'Hello server!' }));
// });

// // Broadcast function to handle WebSocket messages
// function broadcast(message: any) {
//     console.log('Broadcasting message:', message);
//     // Add your broadcast logic here
// }

// ws.on('message', (data) => {
//     console.log('Received WebSocket message:', data.toString());

//     // Example: Save the message to Redis
//     broadcast(JSON.parse(data.toString()));

//     // // Example: Insert message into PostgreSQL
//     // try {
//     //     await pool.query('INSERT INTO messages(content) VALUES($1)', [data.toString()]);
//     // } catch (err) {
//     //     console.error('Error inserting into PostgreSQL:', err);
//     // }
// });

// ws.on('close', () => {
//     console.log('WebSocket connection closed');
// });

// ws.on('error', (err) => {
//     console.error('WebSocket error:', err);
// });

// export { pool, redis, ws };