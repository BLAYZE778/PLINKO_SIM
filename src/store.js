import { randomBytes } from 'node:crypto';

export const START_BALANCE = 100000; 

const sessions = new Map(); 

export function createSession() {
  const token = randomBytes(24).toString('hex');
  const wallet = { balance: START_BALANCE, touched: Date.now() };
  sessions.set(token, wallet);
  return { token, wallet };
}

export function getSession(token) {
  if (typeof token !== 'string') return undefined;
  const wallet = sessions.get(token);
  if (wallet) wallet.touched = Date.now();
  return wallet;
}

export function sweep(maxAgeMs) {
  const cutoff = Date.now() - maxAgeMs;
  let removed = 0;
  for (const [token, wallet] of sessions) {
    if (wallet.touched < cutoff) { sessions.delete(token); removed++; }
  }
  return removed;
}