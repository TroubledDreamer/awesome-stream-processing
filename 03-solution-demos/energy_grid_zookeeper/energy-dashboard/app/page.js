'use client'

import { useState, useEffect } from 'react'
import EnergyTable from '../components/EnergyTable'
import EnergyCard from '../components/EnergyCard'

export default function Home() {
  const [energyData, setEnergyData] = useState([])
  const [connectionStatus, setConnectionStatus] = useState('disconnected')

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080')

    ws.onopen = () => {
      console.log('Connected to WebSocket')
      setConnectionStatus('connected')

      // Subscribe to energy data
      ws.send(JSON.stringify({ type: 'subscribe_energy' }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'energy_data' && data.data) {
          setEnergyData(data.data)
        }
      } catch (error) {
        console.error('Error parsing WebSocket data:', error)
      }
    }

    ws.onclose = () => {
      console.log('WebSocket connection closed')
      setConnectionStatus('disconnected')
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setConnectionStatus('error')
    }

    return () => {
      ws.close()
    }
  }, [])

  const totalConsumption = energyData.reduce((sum, item) => sum + (item.energy_consumed || 0), 0)
  const totalProduction = energyData.reduce((sum, item) => sum + (item.energy_produced || 0), 0)
  const netEnergy = totalConsumption - totalProduction

  return (
    <div className="container mx-auto px-4 py-8">
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
