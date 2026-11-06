
import { min_r, max_r, risks } from './MATHS/calculate.js';
import { LEFT, RIGHT, calcDrop } from './MATHS/fall.js';
import { START_BALANCE } from './store.js';

export const MAX_BET = 1_000_000_000;
export class GameError extends Error {
  constructor(code) {
    super(code);
    this.name = 'GameError';
    this.code = code;
  }
}

export function publicState(w) {
  return { balance: w.balance };
}

function randomMoves(rows) {
  const moves = [];
  for (let i = 0; i < rows; i++) moves.push(Math.random() < 0.5 ? LEFT : RIGHT);
  return moves;
}

export function placeBet(w, amount, rows, risk) {
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_BET) throw new GameError('INVALID_INPUT');
  if (!Number.isInteger(rows) || rows < min_r || rows > max_r) throw new GameError('INVALID_INPUT');
  if (!risks.includes(risk)) throw new GameError('INVALID_INPUT');
  if (amount > w.balance) throw new GameError('INSUFFICIENT_BALANCE');

  const moves = randomMoves(rows);
  const drop = calcDrop(moves, amount, risk);

  w.balance += drop.net;
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
