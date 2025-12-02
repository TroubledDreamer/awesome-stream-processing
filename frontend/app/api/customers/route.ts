import { NextResponse } from 'next/server';
import { pool, redis } from '@/lib/db';

const CACHE_TTL = 5;

export async function GET() {
    try {
        const cached = await redis.get('customers');
        if (cached) {
            return NextResponse.json(JSON.parse(cached));
        }

        const result = await pool.query('SELECT * FROM customers');

        await redis.setex('customers', CACHE_TTL, JSON.stringify(result.rows));

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching customers:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
