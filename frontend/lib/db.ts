import { Pool } from 'pg';
import Redis from 'ioredis';
import WebSocket from 'ws';

// --- PostgreSQL setup ---
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

// --- WebSocket setup ---
const WS_URL = process.env.WS_URL || 'ws://localhost:8080';
const ws = new WebSocket(WS_URL);

ws.on('open', () => {
    console.log('WebSocket connection established');
    // Optionally, send an initial message
    ws.send(JSON.stringify({ type: 'hello', message: 'Hello server!' }));
});

ws.on('message', async (data) => {
    console.log('Received WebSocket message:', data.toString());

    // Example: Save the message to Redis
    await redis.lpush('ws_messages', data.toString());

    // Example: Insert message into PostgreSQL
    try {
        await pool.query('INSERT INTO messages(content) VALUES($1)', [data.toString()]);
    } catch (err) {
        console.error('Error inserting into PostgreSQL:', err);
    }
});

ws.on('close', () => {
    console.log('WebSocket connection closed');
});

ws.on('error', (err) => {
    console.error('WebSocket error:', err);
});

export { pool, redis, ws };