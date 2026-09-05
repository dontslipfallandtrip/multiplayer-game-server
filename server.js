const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Share frontend files sitting in the main directory folder
app.use(express.static(path.join(__dirname, '.')));

let players = {};

wss.on('connection', (ws) => {
    const playerId = Math.random().toString(36).substr(2, 9);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Handle when a player submits their name and joins
            if (data.type === 'join') {
                players[playerId] = {
                    x: Math.floor(Math.random() * 400) + 50,
                    y: Math.floor(Math.random() * 400) + 50,
                    color: '#' + Math.floor(Math.random()*16777215).toString(16),
                    name: data.name,
                    chatMessage: "",
                    chatTimer: 0
                };

                ws.send(JSON.stringify({ type: 'init', id: playerId, players }));

                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'currentPlayers', players }));
                    }
                });
            }

            // Handle player movements
            if (data.type === 'move' && players[playerId]) {
                players[playerId].x = data.x;
                players[playerId].y = data.y;
                
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'update', id: playerId, player: players[playerId] }));
                    }
                });
            }

            // Handle live chat logs and speech bubbles
            if (data.type === 'chat' && players[playerId]) {
                const cleanText = data.text.replace(/<[^>]*>/g, ''); // Safety cleanup
                
                players[playerId].chatMessage = cleanText;
                players[playerId].chatTimer = 240; // Visible for ~4 seconds

                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        // Send text stream to side chat panel
                        client.send(JSON.stringify({ type: 'msg', name: players[playerId].name, text: cleanText }));
                        // Update player bubble state
                        client.send(JSON.stringify({ type: 'update', id: playerId, player: players[playerId] }));
                    }
                });
            }
        } catch (e) {
            console.error("Error reading packet details", e);
        }
    });

    // Remove player when they close the browser tab
    ws.on('close', () => {
        delete players[playerId];
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'remove', id: playerId }));
            }
        });
    });
});

// Force Render to bind correctly to the network card address
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
