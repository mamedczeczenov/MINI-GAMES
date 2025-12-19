import 'dotenv/config';
import { createServer } from 'http';
import { createWebSocketServer } from '../src/services/explain/websocket.server';

const port = Number(
  process.env.WS_PORT ||
    process.env.PUBLIC_WS_PORT ||
    (process.env.PUBLIC_WS_URL?.match(/:(\d+)/)?.[1] ?? 3001),
);

const httpServer = createServer();
createWebSocketServer(httpServer);

httpServer.listen(port, () => {
  console.log(`[WebSocket] Listening on ws://localhost:${port}`);
});


