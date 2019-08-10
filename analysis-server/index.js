const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8090 });

const noop = () => undefined;

wss.on('connection', (ws, req) => {
  const ip = req.connection.remoteAddress;
  console.log('new connection from %s', ip);
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
    console.log('received pong');
  });
});

const interval = setInterval(() => {
  wss.clients.forEach((ws, req) => {
    if (ws.isAlive === false) {
      const ip = req.connection.remoteAddress;
      console.log('connection to %s seems dead, terminating...', ip);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping(noop);
    console.log('ping');
  });
}, 5000);
