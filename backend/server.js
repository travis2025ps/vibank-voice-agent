// In backend/server.js

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const mongoose = require('mongoose');
const cors = require('cors'); // We will use this in a more specific way
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// --- THIS IS THE FIX: More Specific CORS Configuration ---
const allowedOrigins = [
    'http://localhost:5173', // Your local frontend for development
    'https://vibank-voice-agent.netlify.app' // Your deployed frontend
];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
};

// Use the new CORS options
app.use(cors(corsOptions));
// --------------------------------------------------------

app.use(express.json());
app.use('/api/auth', require('./routes/auth'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
    // ... your existing WebSocket logic (no changes needed here) ...
    const urlParams = new URLSearchParams(req.url.slice(1));
    const userEmail = urlParams.get('userEmail');
    const userRole = urlParams.get('userRole');

    if (!userEmail || !userRole) { ws.terminate(); return; }

    console.log(`✅ Client connected: ${userEmail} (Role: ${userRole})`);
    
    clients.set(userEmail, { ws, role: userRole });

    ws.on('message', (message) => { /* ... */ });
    ws.on('close', () => { /* ... */ });
    ws.on('error', (error) => { /* ... */ });
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected...'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });

server.listen(PORT, () => console.log(`✅ Server (HTTP & WebSocket) is running on port ${PORT}`));