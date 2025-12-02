import { NextResponse } from 'next/server';
import { pool, redis } from '@/lib/db';

const CACHE_TTL = 5;

export async function GET() {
    try {
        const cached = await redis.get('estimates');
        if (cached) {
            return NextResponse.json(JSON.parse(cached));
        }

        const [tier, tou] = await Promise.all([
            pool.query('SELECT * FROM estimated_tier_cost ORDER BY month DESC LIMIT 50'),
            pool.query('SELECT * FROM estimated_tou_cost ORDER BY month DESC LIMIT 50')
        ]);

        const data = {
            tier: tier.rows,
            tou: tou.rows
        };

        await redis.setex('estimates', CACHE_TTL, JSON.stringify(data));

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching estimates:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
