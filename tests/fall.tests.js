import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slotno, levelsFromMoves, calcDrop } from '../src/MATHS/fall.js';
import { pascal } from '../src/MATHS/prob.js';
import { buildMul, computeRTP, payout } from '../src/MATHS/calculate.js';

const mv = (s) => [...s];                                   // 'LRL' -> ['L','R','L']

// every possible path of length n as an array of 'L'/'R' (2^n of them)
function allPaths(n) {
  const paths = [];
  for (let bits = 0; bits < 2 ** n; bits++) {
    const p = [];
    for (let i = n - 1; i >= 0; i--) p.push((bits >> i) & 1 ? 'R' : 'L');
    paths.push(p);
  }
  return paths;
}

// ---------- slotno ----------

test('slotno: the slot is the number of rights', () => {
  assert.equal(slotno(mv('L')), 0);
  assert.equal(slotno(mv('R')), 1);
  assert.equal(slotno(mv('LLL')), 0);
  assert.equal(slotno(mv('RRR')), 3);
  assert.equal(slotno(mv('LLRLLRRR')), 4);                // the worked example from the hash
  assert.equal(slotno(mv('LLRLLRRRRRRRLLRR')), 10);       // same hash, 16 rows
});

test('slotno: order does not matter (LLR, LRL, RLL all land in slot 1)', () => {
  for (const p of ['LLR', 'LRL', 'RLL']) assert.equal(slotno(mv(p)), 1);
  for (const p of ['LRR', 'RLR', 'RRL']) assert.equal(slotno(mv(p)), 2);
});

test('slotno: the all-left and all-right paths hit the two corners', () => {
  for (let n = 1; n <= 16; n++) {
    assert.equal(slotno(mv('L'.repeat(n))), 0);
    assert.equal(slotno(mv('R'.repeat(n))), n);
  }
});

test('slotno: listing ALL 2^n paths reproduces row n of Pascal\'s triangle', () => {
  for (let n = 1; n <= 12; n++) {
    const counts = new Array(n + 1).fill(0);
    for (const p of allPaths(n)) counts[slotno(p)]++;
    assert.deepEqual(counts, pascal(n), `n=${n}`);
  }
});

// ---------- levelsFromMoves ----------

test('levelsFromMoves: running count of rights', () => {
  assert.deepEqual(levelsFromMoves(mv('RLR')), [0, 1, 1, 2]);
  assert.deepEqual(levelsFromMoves(mv('LLL')), [0, 0, 0, 0]);
  assert.deepEqual(levelsFromMoves(mv('RRR')), [0, 1, 2, 3]);
  assert.deepEqual(levelsFromMoves(mv('LLRL')), [0, 0, 0, 1, 1]);
});

test('levelsFromMoves: starts at 0, has length n+1, grows by 0 or 1, ends at the slot', () => {
  for (const p of allPaths(8)) {
    const lv = levelsFromMoves(p);
    assert.equal(lv.length, 9);
    assert.equal(lv[0], 0);
    for (let i = 1; i < lv.length; i++) assert.ok(lv[i] - lv[i - 1] === 0 || lv[i] - lv[i - 1] === 1);
    assert.equal(lv[8], slotno(p));
  }
});

// ---------- calcDrop ----------

test('calcDrop: slot, multiplier, payout and net all agree', () => {
  const r = calcDrop(mv('LLRLLRRR'), 1000, 'medium');          // 8 rows, 4 rights
  assert.equal(r.rows, 8);
  assert.equal(r.risk, 'medium');
  assert.equal(r.slot, 4);
  assert.equal(r.multiplier, buildMul(8, 'medium')[4]);
  assert.equal(r.bet, 1000);
  assert.equal(r.pay, payout(1000, r.multiplier));
  assert.equal(r.net, r.pay - 1000);
});

test('calcDrop: both corners pay the jackpot multiplier', () => {
  const edge = buildMul(16, 'high')[0];
  assert.equal(edge, 1038);
  for (const side of ['L', 'R']) {
    const r = calcDrop(mv(side.repeat(16)), 100, 'high');
    assert.equal(r.multiplier, 1038);
    assert.equal(r.pay, 103800);
    assert.equal(r.net, 103700);
  }
});

test('calcDrop: a centre landing on medium loses money, a corner wins', () => {
  const centre = calcDrop(mv('LR'.repeat(8)), 1000, 'medium');   // 8 rights of 16 -> slot 8
  assert.equal(centre.slot, 8);
  assert.ok(centre.net < 0);
  const corner = calcDrop(mv('R'.repeat(16)), 1000, 'medium');
  assert.ok(corner.net > 0);
});

test('calcDrop: payout is never negative and net can never be below minus the bet', () => {
  for (const p of allPaths(10)) {
    const r = calcDrop(p, 500, 'high');
    assert.ok(r.pay >= 0);
    assert.ok(r.net >= -500);
  }
});

// The big one: the average payout over ALL paths must equal your pen-and-paper RTP.
test('calcDrop: averaging over every possible path gives exactly the RTP', () => {
  for (const rows of [8, 9, 10, 11, 12]) {
    for (const risk of ['low', 'medium', 'high']) {
      const paths = allPaths(rows);
      let total = 0;
      for (const p of paths) total += calcDrop(p, 100, risk).pay;   // bet = 100 cents -> payout is exact
      const rtpFromPaths = total / (paths.length * 100);
      const rtpFromMaths = computeRTP(rows, buildMul(rows, risk));
      assert.ok(Math.abs(rtpFromPaths - rtpFromMaths) < 1e-9, `${rows}/${risk}: ${rtpFromPaths} vs ${rtpFromMaths}`);
    }
  }
});

// ---------- bad input ----------

test('slotno and levelsFromMoves reject anything that is not a non-empty array of L/R', () => {
  for (const f of [slotno, levelsFromMoves]) {
    assert.throws(() => f([]), TypeError);
    assert.throws(() => f(['L', 'X']), TypeError);
    assert.throws(() => f([0, 1]), TypeError);
    assert.throws(() => f(['l', 'r']), TypeError);              // lowercase is not accepted
    assert.throws(() => f('LRL'), TypeError);                   // a string is not an array
    assert.throws(() => f(null), TypeError);
    assert.throws(() => f(undefined), TypeError);
  }
});

test('calcDrop rejects a board size, risk level or bet that the game does not allow', () => {
  assert.throws(() => calcDrop(mv('LRL'), 100, 'low'), RangeError);        // 3 rows
  assert.throws(() => calcDrop(mv('L'.repeat(17)), 100, 'low'), RangeError);   // 17 rows
  assert.throws(() => calcDrop(mv('LR'.repeat(4)), 100, 'insane'), RangeError);
  assert.throws(() => calcDrop(mv('LR'.repeat(4)), -5, 'low'), RangeError);
  assert.throws(() => calcDrop(mv('LR'.repeat(4)), 1.5, 'low'), RangeError);
  assert.throws(() => calcDrop(['L', 'Q', 'R', 'L', 'R', 'L', 'R', 'L'], 100, 'low'), TypeError);
});