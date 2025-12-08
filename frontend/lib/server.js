const { createServer } = require("http");
const { Server } = require("socket.io");
const { Pool } = require("pg");
const Redis = require("ioredis");

// ---------------------------
// RISINGWAVE CONNECTION
// ---------------------------
const pool = new Pool({
  host: process.env.RISINGWAVE_HOST || "localhost",
  port: parseInt(process.env.RISINGWAVE_PORT || "4566"),
  database: process.env.RISINGWAVE_DB || "dev",
  user: process.env.RISINGWAVE_USER || "root",
  password: process.env.RISINGWAVE_PASSWORD || "",
});

// Optional Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
});

// ---------------------------
// SOCKET.IO SERVER
// ---------------------------
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
    ],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("getEnergyData", (data) => {
    console.log("Client requests data for:", data);
  });
});

// ---------------------------
// QUERIES
// ---------------------------
async function fetchEnergyTotals() {
  const result = await pool.query(`SELECT * FROM mv_energy_totals LIMIT 1;`);
  return result.rows[0];
}

async function fetchMetrics() {
  const query = `
    SELECT 
        window_end,
        SUM(energy_consumed) as energy_consumed,
        SUM(energy_produced) as energy_produced,
        SUM(total_energy) as total_energy
    FROM energy_per_house
    WHERE window_end >= (
      SELECT MAX(window_end) - INTERVAL '2 hours' 
      FROM energy_per_house
    )
    GROUP BY window_end
    ORDER BY window_end DESC
    LIMIT 1;
  `;

  try {
    const result = await pool.query(query);
    return result.rows[0];
  } catch (err) {
    console.error("Error fetching metrics:", err);
    return null;
  }
}

// ---------------------------
// BROADCAST LOOP
// ---------------------------
setInterval(async () => {
  try {
    const energy = await fetchEnergyTotals();
    const metrics = await fetchMetrics();

    if (energy) {
      io.emit("energyUpdate", {
        totalConsumption: Number(energy.total_consumed || 0),
        totalProduction: Number(energy.total_produced || 0),
        totalEnergy: Number(energy.total_energy || 0),
      });
    //   console.log("Broadcasted energy totals:", energy);
    }

    if (metrics) {
      io.emit("metricUpdate", {
        netConsumptionHour: Number(metrics.energy_consumed || 0),
        netConsumptionDay: Number(metrics.energy_consumed || 0),
        netConsumptionMonth: Number(metrics.energy_consumed || 0),
        avgPerDay: Number(metrics.energy_consumed || 0),
      });
    }
  } catch (err) {
    console.error("Broadcast error:", err);
  }
}, 100);

// ---------------------------
// START SERVER
// ---------------------------
// FIX: use port 3002 instead of 4566
httpServer.listen(3002, () => {
  console.log("Socket server running on port 3002");
});
