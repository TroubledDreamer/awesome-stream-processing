'use client'

import { useState, useCallback } from 'react'
import EnergyTable from '../components/EnergyTable'
import EnergyCard from '../components/EnergyCard'
import WebSocketClient from '../components/WebSocketClient'

export default function Home() {
  const [energyData, setEnergyData] = useState([])
  const [connectionStatus, setConnectionStatus] = useState('disconnected')

  // Callback for initial snapshot
  const handleSnapshot = useCallback((snapshot) => {
    console.log('Received snapshot:', snapshot.length, 'rows')
    setEnergyData(snapshot || [])
  }, [])

  // Callback for incremental updates
  const handleUpdate = useCallback((update) => {
    console.log('Received update:', update)
    setEnergyData(prev => {
      // Add new row and keep only latest 100 rows for performance
      const updated = [update, ...prev]
      return updated.slice(0, 100)
    })
  }, [])

  // Callback for status changes
  const handleStatus = useCallback((status) => {
    setConnectionStatus(status)
  }, [])

  const totalConsumption = energyData.reduce((sum, item) => sum + (item.energy_consumed || 0), 0)
  const totalProduction = energyData.reduce((sum, item) => sum + (item.energy_produced || 0), 0)
  const netEnergy = totalConsumption - totalProduction

  return (
    <div className="container mx-auto px-4 py-8">
      {/* WebSocket client component (handles connection + auto-reconnect) */}
      <WebSocketClient 
        onSnapshot={handleSnapshot}
        onUpdate={handleUpdate}
        onStatus={handleStatus}
      />
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-emerald-100 mb-2">Energy Grid Monitor</h1>
        <p className="text-emerald-300">Real-time energy consumption and production tracking</p>

        <div className="mt-4 flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-emerald-400' :
            connectionStatus === 'error' ? 'bg-red-400' : 'bg-gray-400'
          }`}></div>
          <span className="text-emerald-200 text-sm">
            WebSocket: {connectionStatus}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <EnergyCard
          title="Total Consumption"
          value={`${totalConsumption.toFixed(2)} kWh`}
          color="emerald"
        />
        <EnergyCard
          title="Total Production"
          value={`${totalProduction.toFixed(2)} kWh`}
          color="blue"
        />
        <EnergyCard
          title="Net Energy"
          value={`${netEnergy.toFixed(2)} kWh`}
          color={netEnergy >= 0 ? "red" : "green"}
        />
      </div>

      <div className="bg-emerald-900/50 backdrop-blur-sm rounded-lg border border-emerald-700/50 p-6">
        <h2 className="text-2xl font-semibold text-emerald-100 mb-4">Live Energy Data</h2>
        <EnergyTable data={energyData} />
      </div>
    </div>
  )
}