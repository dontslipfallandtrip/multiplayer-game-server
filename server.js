const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Share all frontend files in the root directory
app.use(express.static(path.join(__dirname, '.')));

// Force the main URL to load the index.html page automatically
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let players = {};

wss.on('connection', (ws) => {
    const playerId = Math.random().toString(36).substr(2, 9);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
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

            if (data.type === 'move' && players[playerId]) {
                players[playerId].x = data.x;
                players[playerId].y = data.y;
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'update', id: playerId, player: players[playerId] }));
                    }
                });
            }

            if (data.type === 'chat' && players[playerId]) {
                const cleanText = data.text.replace(/<[^>]*>/g, '');
                players[playerId].chatMessage = cleanText;
                players[playerId].chatTimer = 240;
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'msg', name: players[playerId].name, text: cleanText }));
                        client.send(JSON.stringify({ type: 'update', id: playerId, player: players[playerId] }));
                    }
                });
            }
        } catch (e) {
            console.error("Packet processing error", e);
        }
    });

    ws.on('close', () => {
        delete players[playerId];
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'remove', id: playerId }));
            }
        });
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
