const { WebSocketServer, OPEN } = require('ws');

// Automatically assigns Render's dynamic system port
const PORT = process.env.PORT || 8080;

// Render requires explicitly binding to host '0.0.0.0' to open the network gates
const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' });

console.log(`Multiplayer game server running globally on port ${PORT}`);

// Active player map storage
const clients = new Map();

wss.on('connection', (ws) => {
    console.log('A player connected.');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Handle player entry or moving around
            if (data.type === 'join' || data.type === 'player_update') {
                clients.set(ws, { id: data.id, name: data.name, state: data.payload });
                
                // Synchronize existing players for the newcomer
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

            // Broadcast data to everyone else online
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
            
            // Tell all other players to remove this circle from their screen
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
