import express from 'express';
import cors from 'cors';
import { getDb, createTaskRepository, createSubtaskRepository } from './db/index.js';
import { createTaskRouter } from './routes/tasks.js';
import { createAgentRouter } from './routes/agents.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createLLMClient } from './llm/index.js';

const port = Number(process.env['API_PORT'] ?? 4000);
const webOrigin = process.env['WEB_ORIGIN'] ?? 'http://localhost:3000';

const db = getDb();
const taskRepo = createTaskRepository(db);
const subtaskRepo = createSubtaskRepository(db);
const llm = createLLMClient();

const app = express();

app.use(cors({ origin: webOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/tasks', createTaskRouter(taskRepo, subtaskRepo));
app.use('/api/agents', createAgentRouter({ taskRepo, subtaskRepo, llm }));

app.use(errorHandler);

app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
