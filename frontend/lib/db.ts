import { Pool } from 'pg';
import Redis from 'ioredis';

const pool = new Pool({
    host: process.env.RISINGWAVE_HOST || 'localhost',
    port: parseInt(process.env.RISINGWAVE_PORT || '4566'),
    database: process.env.RISINGWAVE_DB || 'dev',
    user: process.env.RISINGWAVE_USER || 'root',
    password: process.env.RISINGWAVE_PASSWORD || '',
});

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
});



export { pool, redis };
