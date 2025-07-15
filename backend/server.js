// In backend/server.js

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// --- Robust CORS Configuration ---
// This explicitly allows your deployed frontend and your local development environment.
const allowedOrigins = [
    'http://localhost:5173',
    'https://vibank-voice-agent.netlify.app' // Make sure this is your correct Netlify URL
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
// --------------------------------

// --- Standard Middleware and Routes ---
app.use(express.json());
// This line ensures that any request to /api/auth will be handled by your auth routes.
app.use('/api/auth', require('./routes/auth'));
// ------------------------------------

// Create an HTTP server from our Express app
const server = http.createServer(app);

// --- Simplified WebSocket Server Setup ---
// We will attach the WebSocket server but keep its logic minimal for now
// to ensure it does not interfere with the HTTP routes.
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('✅ A client connected via WebSocket.');

    ws.on('message', (message) => {
        console.log('Received WebSocket message:', message.toString());
        // For now, we just broadcast the message to all other clients
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === ws.OPEN) {
                client.send(message.toString());
            }
        });
    });

    ws.on('close', () => {
        console.log('❌ A client disconnected from WebSocket.');
    });
});
// ---------------------------------------

// --- Database Connection and Server Startup ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected...'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });

// Start the server, listening on the combined HTTP/WebSocket server object.
server.listen(PORT, () => console.log(`✅ Server (HTTP & WebSocket) is running on port ${PORT}`));