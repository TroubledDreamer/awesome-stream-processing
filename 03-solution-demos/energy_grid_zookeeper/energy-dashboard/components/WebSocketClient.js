'use client'

import { useEffect, useState } from 'react'

export default function WebSocketClient({ onData, onStatus }) {
  const [status, setStatus] = useState('disconnected')

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080')

    ws.onopen = () => {
      setStatus('connected')
      onStatus?.('connected')
      ws.send(JSON.stringify({ type: 'subscribe_energy' }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onData?.(data)
      } catch (error) {
        console.error('WebSocket data parse error:', error)
      }
    }

    ws.onclose = () => {
      setStatus('disconnected')
      onStatus?.('disconnected')
    }

    ws.onerror = (error) => {
      setStatus('error')
      onStatus?.('error')
      console.error('WebSocket error:', error)
    }

    return () => ws.close()
  }, [onData, onStatus])

  return null // This component doesn't render anything
}
