# Energy Grid Monitor

A real-time energy consumption and production monitoring dashboard built with Next.js and WebSocket streaming.

## Features

- **Real-time WebSocket streaming** from RisingWave materialized views
- **Beautiful emerald green & white theme** with soft design
- **Live connection status indicator**
- **Responsive data table** showing energy metrics
- **Summary cards** with total consumption/production/net energy
- **Auto-reconnection** on WebSocket disconnect

## Setup

1. **Ensure Docker services are running:**
   ```bash
   cd /path/to/energy_grid_zookeeper
   docker compose up -d
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## Architecture

```
Energy Producers → Kafka → RisingWave → WebSocket Server → Next.js Dashboard
```

- **Kafka**: Real-time data streaming
- **RisingWave**: Stream processing and materialized views
- **WebSocket Server**: Node.js server streaming data to frontend
- **Next.js**: React frontend with real-time updates

## Technologies

- **Next.js 14** - React framework
- **Tailwind CSS** - Styling with emerald green theme
- **WebSocket** - Real-time data streaming
- **RisingWave** - Stream processing database
- **Kafka** - Message streaming platform
