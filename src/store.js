// src/store.js  (basic version: no seeds yet)
// One wallet per player, kept in memory under a random session token.

import { randomBytes } from 'node:crypto';

export const START_BALANCE = 100000;             // 1,000.00 in cents. Money is ALWAYS whole cents.

const sessions = new Map();                      // token -> wallet

export function createSession() {
  const token = randomBytes(24).toString('hex');           // 48 hex chars, unguessable
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

// Forget players idle for longer than maxAgeMs. server.js calls this on a timer.
export function sweep(maxAgeMs) {
  const cutoff = Date.now() - maxAgeMs;
  let removed = 0;
  for (const [token, wallet] of sessions) {
    if (wallet.touched < cutoff) { sessions.delete(token); removed++; }
  }
  return removed;
}