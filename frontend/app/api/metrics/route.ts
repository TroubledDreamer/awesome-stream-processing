import { NextResponse } from 'next/server';
import { pool, redis } from '@/lib/db';

const CACHE_TTL = 5;

export async function GET() {
    try {
        const cached = await redis.get('metrics');
        if (cached) {
            return NextResponse.json(JSON.parse(cached));
        }

        // Get current time in simulation (latest window_end)
        const currentTimeQuery = await pool.query(`
            SELECT MAX(window_end) as current_time
            FROM energy_per_house
        `);

        // Get net consumption this month
        const monthlyQuery = await pool.query(`
            SELECT 
                SUM(total_energy) as net_consumption_month,
                date_trunc('month', window_end) as month
            FROM energy_per_house
            WHERE date_trunc('month', window_end) = (
                SELECT date_trunc('month', MAX(window_end)) FROM energy_per_house
            )
            GROUP BY date_trunc('month', window_end)
        `);

        // Get net consumption this day
        const dailyQuery = await pool.query(`
            SELECT 
                SUM(total_energy) as net_consumption_day,
                date_trunc('day', window_end) as day
            FROM energy_per_house
            WHERE date_trunc('day', window_end) = (
                SELECT date_trunc('day', MAX(window_end)) FROM energy_per_house
            )
            GROUP BY date_trunc('day', window_end)
        `);

        // Get net consumption this hour
        const hourlyQuery = await pool.query(`
            SELECT 
                SUM(total_energy) as net_consumption_hour,
                date_trunc('hour', window_end) as hour
            FROM energy_per_house
            WHERE date_trunc('hour', window_end) = (
                SELECT date_trunc('hour', MAX(window_end)) FROM energy_per_house
            )
            GROUP BY date_trunc('hour', window_end)
        `);

        // Get average consumption per day (for current month)
        const avgDailyQuery = await pool.query(`
            SELECT 
                AVG(daily_total) as avg_per_day
            FROM (
                SELECT 
                    date_trunc('day', window_end) as day,
                    SUM(total_energy) as daily_total
                FROM energy_per_house
                WHERE date_trunc('month', window_end) = (
                    SELECT date_trunc('month', MAX(window_end)) FROM energy_per_house
                )
                GROUP BY date_trunc('day', window_end)
            ) daily_totals
        `);

        // Get average consumption per hour (for current day)
        const avgHourlyQuery = await pool.query(`
            SELECT 
                AVG(hourly_total) as avg_per_hour
            FROM (
                SELECT 
                    date_trunc('hour', window_end) as hour,
                    SUM(total_energy) as hourly_total
                FROM energy_per_house
                WHERE date_trunc('day', window_end) = (
                    SELECT date_trunc('day', MAX(window_end)) FROM energy_per_house
                )
                GROUP BY date_trunc('hour', window_end)
            ) hourly_totals
        `);

        // Get hourly consumption for last 24 hours
        const hourlyChartQuery = await pool.query(`
            SELECT 
                date_trunc('hour', window_end) as hour,
                SUM(total_energy) as total_energy
            FROM energy_per_house
            WHERE window_end >= (SELECT MAX(window_end) - INTERVAL '24 hours' FROM energy_per_house)
            GROUP BY date_trunc('hour', window_end)
            ORDER BY hour DESC
            LIMIT 24
        `);

        // Get daily consumption for current month
        const dailyChartQuery = await pool.query(`
            SELECT 
                date_trunc('day', window_end) as day,
                SUM(total_energy) as total_energy
            FROM energy_per_house
            WHERE date_trunc('month', window_end) = (
                SELECT date_trunc('month', MAX(window_end)) FROM energy_per_house
            )
            GROUP BY date_trunc('day', window_end)
            ORDER BY day ASC
        `);

        const data = {
            currentTime: currentTimeQuery.rows[0]?.current_time,
            netConsumptionMonth: monthlyQuery.rows[0]?.net_consumption_month || 0,
            netConsumptionDay: dailyQuery.rows[0]?.net_consumption_day || 0,
            netConsumptionHour: hourlyQuery.rows[0]?.net_consumption_hour || 0,
            avgPerDay: avgDailyQuery.rows[0]?.avg_per_day || 0,
            avgPerHour: avgHourlyQuery.rows[0]?.avg_per_hour || 0,
            hourlyChart: hourlyChartQuery.rows,
            dailyChart: dailyChartQuery.rows
        };

        // Quick visibility for simulated time coming off RisingWave
        console.log("[metrics] simulated time:", data.currentTime);

        await redis.setex('metrics', CACHE_TTL, JSON.stringify(data));

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching metrics:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
