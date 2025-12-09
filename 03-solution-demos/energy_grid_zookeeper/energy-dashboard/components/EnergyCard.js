export default function EnergyCard({ title, value, color = 'emerald' }) {
  const colorClasses = {
    emerald: 'bg-emerald-600 border-emerald-500',
    blue: 'bg-blue-600 border-blue-500',
    red: 'bg-red-600 border-red-500',
    green: 'bg-green-600 border-green-500'
  }

  return (
    <div className={`${colorClasses[color]} rounded-lg border p-6 text-white`}>
      <h3 className="text-sm font-medium opacity-80 mb-2">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
