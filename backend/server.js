require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { connectDB } = require('./config/database');
const studentRoutes = require('./routes/studentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas
connectDB();

// CORS Configuration - Specifically tuned for Vercel Frontend & Local Development
const allowedOrigins = [
  process.env.FRONTEND_URL,              // Custom Vercel URL configured in Render dashboard
  'http://localhost:3000',               // Local React / HTML dev server
  'http://localhost:5173',               // Vite dev server
  'http://localhost:8080',
  'http://127.0.0.1:5500'                // VS Code Live Server
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    // Allow any Vercel deployment (*.vercel.app)
    const isVercel = /\.vercel\.app$/.test(origin);
    const isAllowedList = allowedOrigins.includes(origin);

    if (isVercel || isAllowedList || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Information Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    project: 'Student Information Management System - 3-Tier Architecture',
    tier: 'Tier 2 (Application Layer / REST API)',
    hostedOn: 'Render',
    database: 'MongoDB Atlas',
    frontendTarget: 'Vercel',
    status: 'Online',
    timestamp: new Date().toISOString(),
    apiDocs: {
      health: 'GET /api/health',
      allStudents: 'GET /api/students',
      createStudent: 'POST /api/students',
      getStudent: 'GET /api/students/:id',
      updateStudent: 'PUT /api/students/:id',
      deleteStudent: 'DELETE /api/students/:id'
    }
  });
});

// Detailed Health and DB Diagnostic Endpoint
app.get('/api/health', (req, res) => {
  const dbStates = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };
  const currentState = mongoose.connection.readyState;

  res.status(currentState === 1 ? 200 : 503).json({
    status: currentState === 1 ? 'healthy' : 'degraded',
    uptime: `${Math.floor(process.uptime())}s`,
    database: {
      status: dbStates[currentState] || 'Unknown',
      connected: currentState === 1,
      databaseName: mongoose.connection.name || 'N/A',
      host: mongoose.connection.host || 'N/A'
    },
    platform: {
      nodeVersion: process.version,
      memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024)
    }
  });
});

// Mount Student API Routes
app.use('/api/students', studentRoutes);

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 [Server] Tier 2 Application listening on port ${PORT}`);
  console.log(`🌐 [Environment] ${process.env.NODE_ENV || 'development'}`);
});
