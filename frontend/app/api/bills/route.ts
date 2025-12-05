import { NextResponse } from 'next/server';
import { pool, redis } from '@/lib/db';

const CACHE_TTL = 5;

export async function GET() {
    try {
        const cached = await redis.get('current_bills');
        if (cached) {
            return NextResponse.json(JSON.parse(cached));
        }

        // Get tiered bills with customer info and estimated costs
        const tieredQuery = await pool.query(`
            SELECT 
                cb.meter_id,
                c.address,
                cb.current_bill,
                epm.total_energy as current_energy_consumed,
                ec.estimated_total_bill,
                ec.estimated_total_energy,
                cb.month
            FROM current_bill_tiered cb
            LEFT JOIN customers c ON cb.meter_id = c.meter_id
            LEFT JOIN energy_per_month epm ON cb.meter_id = epm.meter_id AND cb.month = epm.month
            LEFT JOIN estimated_tier_cost ec ON cb.meter_id = ec.meter_id AND cb.month = ec.month
            ORDER BY cb.month DESC, cb.meter_id
            LIMIT 50
        `);

        // Get TOU bills with customer info and estimated costs
        const touQuery = await pool.query(`
            SELECT 
                cb.meter_id,
                c.address,
                cb.monthly_cost,
                epm.total_energy as current_energy_consumed,
                ec.estimated_monthly_bill,
                ec.estimated_total_energy,
                cb.month
            FROM current_bill_tou cb
            LEFT JOIN customers c ON cb.meter_id = c.meter_id
            LEFT JOIN energy_per_month epm ON cb.meter_id = epm.meter_id AND cb.month = epm.month
            LEFT JOIN estimated_tou_cost ec ON cb.meter_id = ec.meter_id AND cb.month = ec.month
            ORDER BY cb.month DESC, cb.meter_id
            LIMIT 50
        `);

        const data = {
            tiered: tieredQuery.rows,
            tou: touQuery.rows
        };

        await redis.setex('current_bills', CACHE_TTL, JSON.stringify(data));

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching bills:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
