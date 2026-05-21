import http from 'node:http';
import { getDb } from './db/index.js';

const port = Number(process.env.API_PORT ?? 4000);

// Initialise DB and apply schema on startup
getDb();

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { message: 'Not found', code: 'not_found' } }));
});

server.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
