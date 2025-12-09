export default function EnergyTable({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-emerald-300">
        <div className="animate-pulse">Waiting for energy data...</div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-emerald-100">
        <thead>
          <tr className="border-b border-emerald-700">
            <th className="text-left py-3 px-4 font-semibold">Meter ID</th>
            <th className="text-left py-3 px-4 font-semibold">Consumption (kWh)</th>
            <th className="text-left py-3 px-4 font-semibold">Production (kWh)</th>
            <th className="text-left py-3 px-4 font-semibold">Net Energy (kWh)</th>
            <th className="text-left py-3 px-4 font-semibold">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} className="border-b border-emerald-800/50 hover:bg-emerald-800/20">
              <td className="py-3 px-4">{row.meter_id}</td>
              <td className="py-3 px-4">{row.energy_consumed?.toFixed(3) || '0.000'}</td>
              <td className="py-3 px-4">{row.energy_produced?.toFixed(3) || '0.000'}</td>
              <td className="py-3 px-4">
                <span className={row.total_energy >= 0 ? 'text-red-400' : 'text-green-400'}>
                  {row.total_energy?.toFixed(3) || '0.000'}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-emerald-300">
                {row.window_end ? new Date(row.window_end).toLocaleTimeString() : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
