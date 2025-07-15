// In backend/server.js

const express = require('express');
const http = require('http'); // Import the standard http module
const { WebSocketServer } = require('ws'); // Import the ws library
const mongoose = require('mongoose');
const cors =require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// --- Standard Express Setup ---
app.use(cors());
app.use(express.json());
app.use('/api/auth', require('./routes/auth'));

// --- WebSocket Server Setup ---
// Create an HTTP server from our Express app
const server = http.createServer(app);

// Create a WebSocket server and attach it to the HTTP server
const wss = new WebSocketServer({ server });

// This will store all connected clients (both agents and customers)
const clients = new Map();

wss.on('connection', (ws, req) => {
    // When a client connects, we get their email from the URL query string
    const urlParams = new URLSearchParams(req.url.slice(1));
    const userEmail = urlParams.get('userEmail');
    const userRole = urlParams.get('userRole');

    if (!userEmail || !userRole) {
        console.log('Connection rejected: Missing userEmail or userRole.');
        ws.terminate();
        return;
    }

    console.log(`✅ Client connected: ${userEmail} (Role: ${userRole})`);
    
    // Store the client's connection and role
    clients.set(userEmail, { ws, role: userRole });

    // Handle messages from this client
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        console.log('Received message:', data);

        // --- Core Real-Time Logic ---
        switch (data.type) {
            // When a customer submits a question...
            case 'CUSTOMER_QUESTION':
                // ...find all connected agents and forward the question to them.
                clients.forEach((client, email) => {
                    if (client.role === 'agent' && client.ws.readyState === ws.OPEN) {
                        client.ws.send(JSON.stringify({
                            type: 'NEW_QUESTION_IN_QUEUE',
                            payload: data.payload, // The message object
                        }));
                    }
                });
                break;

            // When an agent sends a reply...
            case 'AGENT_REPLY':
                // ...find the specific customer who asked the question and send the reply.
                const customerClient = clients.get(data.payload.userEmail);
                if (customerClient && customerClient.ws.readyState === ws.OPEN) {
                    customerClient.ws.send(JSON.stringify({
                        type: 'NEW_REPLY_FROM_AGENT',
                        payload: data.payload, // The message object
                    }));
                }
                break;
        }
    });

    // Handle when a client disconnects
    ws.on('close', () => {
        console.log(`❌ Client disconnected: ${userEmail}`);
        clients.delete(userEmail);
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for ${userEmail}:`, error);
    });
});

// --- Database Connection and Server Startup ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected...'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });

// Start the server, but listen on the 'server' object, not 'app'
server.listen(PORT, () => console.log(`✅ Server (HTTP & WebSocket) is running on port ${PORT}`));