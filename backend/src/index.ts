import http from 'http';
import app from './app';
import { env } from './config/env';
import { initSocketIO } from './socket';
import { startSlaWorker } from './jobs/sla.worker';

const server = http.createServer(app);

// Initialize Socket.IO server
initSocketIO(server);

const PORT = env.PORT;

server.listen(PORT, () => {
  console.log(`[NeoStats Server] Running on http://localhost:${PORT}`);
  console.log(`[NeoStats Socket.IO] Real-time engine listening on port ${PORT}`);
  startSlaWorker();
});
