const http = require('http');
const { WebSocketServer, OPEN } = require('ws');

const PORT = process.env.PORT || 8080;

// Create a basic HTTP server so Render can perform successful health checks
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Multiplayer Game Server is Online');
});

// Force the WebSocket Server to ONLY look for the secure Render proxy path
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);

    if (pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

console.log(`Multiplayer server running globally on port ${PORT}`);

const clients = new Map();

wss.on('connection', (ws) => {
    console.log('A player connected.');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'join' || data.type === 'player_update') {
                clients.set(ws, { id: data.id, name: data.name, state: data.payload });
                
                if (data.type === 'join') {
                    clients.forEach((clientInfo, clientWs) => {
                        if (clientWs !== ws) {
                            ws.send(JSON.stringify({
                                type: 'player_update',
                                id: clientInfo.id,
                                name: clientInfo.name,
                                payload: clientInfo.state
                            }));
                        }
                    });
                }
            }

            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === OPEN) {
                    if (data.type === 'join' || data.type === 'player_update') {
                        client.send(JSON.stringify({
                            type: 'player_update',
                            id: data.id,
                            name: data.name,
                            payload: data.payload
                        }));
                    }
                    if (data.type === 'chat') {
                        client.send(JSON.stringify({
                            type: 'chat',
                            id: data.id,
                            sender: data.name,
                            message: data.payload
                        }));
                    }
                }
            });

        } catch (error) {
            console.error('Data error:', error);
        }
    });

    ws.on('close', () => {
        const clientInfo = clients.get(ws);
        if (clientInfo) {
            console.log(`Player ${clientInfo.name} disconnected.`);
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === OPEN) {
                    client.send(JSON.stringify({
                        type: 'leave',
                        id: clientInfo.id
                    }));
                }
            });
            clients.delete(ws);
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server actively listening on port ${PORT}`);
});
