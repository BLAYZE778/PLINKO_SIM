
import express from 'express';
import { fileURLToPath } from 'node:url';
import { createSession, getSession } from '../src/store.js';
import { GameError, placeBet, publicState, resetBalance } from '../src/game.js';
import { buildMul, min_r, max_r, risks } from '../src/MATHS/calculate.js';

export const app = express();

app.use(express.json({ limit: '1kb' }));
app.use(express.static(fileURLToPath(new URL('../frontend', import.meta.url))));

function auth(req, res, next) {
  const wallet = getSession(req.header('x-session'));
  if (!wallet) return res.status(401).json({ error: 'NO_SESSION' });
  res.locals.wallet = wallet;
  next();
}

app.post('/api/session', (_req, res) => {
  const { token, wallet } = createSession();
  res.json({ token, ...publicState(wallet) });
});

app.get('/api/state', auth, (_req, res) => {
  res.json(publicState(res.locals.wallet));
});

app.get('/api/multipliers', (req, res) => {
  const rows = Number(req.query.rows);
  const risk = req.query.risk;
  if (!Number.isInteger(rows) || rows < min_r || rows > max_r || !risks.includes(risk)) {
    throw new GameError('INVALID_INPUT');
  }
  res.json({ multipliers: buildMul(rows, risk) });
});

app.post('/api/bet', auth, (req, res) => {
  const { amount, rows, risk } = req.body ?? {};
  res.json(placeBet(res.locals.wallet, amount, rows, risk));
});

app.post('/api/reset', auth, (_req, res) => {
  res.json(resetBalance(res.locals.wallet));
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND' });
});

app.use((err, _req, res, _next) => { 
  if (err instanceof GameError) return res.status(400).json({ error: err.code });
  if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: 'INVALID_INPUT' });
  console.error(err);
  res.status(500).json({ error: 'SERVER_ERROR' });
});
