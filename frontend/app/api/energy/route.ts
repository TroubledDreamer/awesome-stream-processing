import { NextResponse } from 'next/server';
import { pool, redis } from '@/lib/db';

const CACHE_TTL = 5;

export async function GET() {
    try {
        const cached = await redis.get('energy_data');
        if (cached) {
            return NextResponse.json(JSON.parse(cached));
        }

        // Get aggregated totals per meter (like Grafana does)
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

        // Get time series data 
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

        const data = {
            totals: totalsQuery.rows,
            timeSeries: timeSeriesQuery.rows
        };

        await redis.setex('energy_data', CACHE_TTL, JSON.stringify(data));

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching energy data:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
