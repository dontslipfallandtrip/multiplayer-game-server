const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Serve the frontend HTML/JS files sitting in the same folder
app.use(express.static(path.join(__dirname, '.')));

let players = {};

wss.on('connection', (ws) => {
    // Generate a unique ID for each browser tab that connects
    const playerId = Math.random().toString(36).substr(2, 9);
    
    // Assign a random starting point and color
    players[playerId] = {
        x: Math.floor(Math.random() * 400) + 50,
        y: Math.floor(Math.random() * 400) + 50,
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
    };

    // Initialize the current player
    ws.send(JSON.stringify({ type: 'init', id: playerId, players }));

    // Update all clients with the latest list of players
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'currentPlayers', players }));
        }
    });
    
    // Listen for movement updates from players
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'move' && players[playerId]) {
                players[playerId].x = data.x;
                players[playerId].y = data.y;
                
                // Broadcast the player's new position to everyone online
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'update', id: playerId, player: players[playerId] }));
                    }
                });
            }
        } catch (e) {
            console.error("Invalid message format received", e);
        }
    });

    // Clean up when a player closes their tab
    ws.on('close', () => {
        delete players[playerId];
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'remove', id: playerId }));
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
