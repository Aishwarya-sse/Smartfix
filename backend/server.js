require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Set database fallback global flag
global.useMemoryDb = false;

// Connect to MongoDB in background (non-blocking)
const dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartfix';
console.log(`🔌 [Database] Attempting to connect to: ${dbUri}`);

mongoose.connect(dbUri)
  .then(() => {
    console.log('✅ [Database] MongoDB connected successfully.');
  })
  .catch((err) => {
    console.warn(`\n⚠️  [Database Warning]: MongoDB connection failed: ${err.message}`);
    console.warn(`💡 [Database Notice]: SmartFix is starting with a stateful IN-MEMORY mock database fallback. No setup required!\n`);
    global.useMemoryDb = true;
  });

// Import routers synchronously (Vercel friendly)
const authRoutes = require('./src/routes/auth');
const agentRoutes = require('./src/routes/agent');
const requestRoutes = require('./src/routes/request');
const mediaRoutes = require('./src/routes/media');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/media', mediaRoutes);

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Root endpoint for API status
app.get('/api', (req, res) => {
  res.json({
    name: 'SmartFix API Gateway',
    status: 'Operational',
    database: global.useMemoryDb ? 'In-Memory Mock Fallback' : 'Active MongoDB Server',
    ai_engine: process.env.GEMINI_API_KEY ? 'Google Gemini 2.5 Flash Active' : 'Intelligent Local Rule Engine Active'
  });
});

// Catch-all to serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server locally (Only if not on Vercel serverless environment)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 [Server] SmartFix Backend listening on http://localhost:${PORT}`);
    console.log(`🌐 [Web App] Accessible at: http://localhost:${PORT}`);
    console.log(`🛠️  [Dev Access] Auth endpoints: http://localhost:${PORT}/api/auth`);
    console.log(`🤖 [Dev Access] Agent endpoint: http://localhost:${PORT}/api/agent/chat`);
  });
}

// Export app for Vercel Serverless environment
module.exports = app;

