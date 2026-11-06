// src/game.js  (basic version: randomness comes from Math.random)
// One bet from start to finish. This is the ONLY file that changes a balance.

import { min_r, max_r, risks } from './MATHS/calculate.js';
import { LEFT, RIGHT, calcDrop } from './MATHS/fall.js';
import { START_BALANCE } from './store.js';

export const MAX_BET = 1_000_000_000;            // keeps amount * multiplier an exact integer in JS

export class GameError extends Error {
  constructor(code) {
    super(code);
    this.name = 'GameError';
    this.code = code;                            // 'INVALID_INPUT' | 'INSUFFICIENT_BALANCE'
  }
}

export function publicState(w) {
  return { balance: w.balance };
}

// Math.random() returns a number in [0, 1). Below 0.5 -> left, otherwise right: a fair coin per row.
// LATER (provably fair): replace the call to this function with deriveMoves(...) from seed.js.
function randomMoves(rows) {
  const moves = [];
  for (let i = 0; i < rows; i++) moves.push(Math.random() < 0.5 ? LEFT : RIGHT);
  return moves;
}

// Validate first, calculate next, change the wallet last. If anything fails, nothing changes.
// There is no await, so two quick requests can never interleave and overspend.
export function placeBet(w, amount, rows, risk) {
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_BET) throw new GameError('INVALID_INPUT');
  if (!Number.isInteger(rows) || rows < min_r || rows > max_r) throw new GameError('INVALID_INPUT');
  if (!risks.includes(risk)) throw new GameError('INVALID_INPUT');
  if (amount > w.balance) throw new GameError('INSUFFICIENT_BALANCE');

  const moves = randomMoves(rows);
  const drop = calcDrop(moves, amount, risk);    // { slot, multiplier, pay, net, ... }

  w.balance += drop.net;                         // stake out, winnings in, one step

  return {
    amount, rows, risk, moves,
    slot: drop.slot, multiplier: drop.multiplier, pay: drop.pay,
    balance: w.balance,
  };
}

export function resetBalance(w) {
  w.balance = START_BALANCE;
  return publicState(w);
}
