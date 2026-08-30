const { WebSocketServer, OPEN } = require('ws'); // Automatically handles Render's dynamic port assignment const PORT =
process.env.PORT || 8080; const wss = new WebSocketServer({ port: PORT }); console.log(`Multiplayer game server running
on port ${PORT}`); // Active player map storage const clients = new Map(); wss.on('connection', (ws) =&gt; {
ws.on('message', (message) =&gt; { try { const data = JSON.parse(message); // Handle player entry if (data.type ===
'join' || data.type === 'player_update') { clients.set(ws, { id: data.id, name: data.name, state: data.payload }); //
Synchronize existing players for the newcomer if (data.type === 'join') { clients.forEach((clientInfo, clientWs) =&gt; {
if (clientWs !== ws) { ws.send(JSON.stringify({ type: 'player_update', id: clientInfo.id, name: clientInfo.name,
payload: clientInfo.state })); } }); } } // Broadcast data to everyone else wss.clients.forEach((client) =&gt; { if
(client !== ws &amp;&amp; client.readyState === OPEN) { if (data.type === 'join' || data.type === 'player_update') {
client.send(JSON.stringify({ type: 'player_update', id: data.id, name: data.name, payload: data.payload })); } if
(data.type === 'chat') { client.send(JSON.stringify({ type: 'chat', id: data.id, sender: data.name, message:
data.payload })); } } }); } catch (error) { console.error('Data error:', error); } }); ws.on('close', () =&gt; { const
clientInfo = clients.get(ws); if (clientInfo) { wss.clients.forEach((client) =&gt; { if (client !== ws &amp;&amp;
client.readyState === OPEN) { client.send(JSON.stringify({ type: 'leave', id: clientInfo.id })); } });
clients.delete(ws); } }); });
