import { test } from 'node:test';
import assert from 'node:assert/strict';
import { max_row, pascal, slotprob, check } from '../src/MATHS/prob.js';

// ---------- pascal(n): the triangle ----------

test('pascal: matches the triangle you drew by hand', () => {
  assert.deepEqual(pascal(0), [1]);
  assert.deepEqual(pascal(1), [1, 1]);
  assert.deepEqual(pascal(2), [1, 2, 1]);
  assert.deepEqual(pascal(3), [1, 3, 3, 1]);
  assert.deepEqual(pascal(4), [1, 4, 6, 4, 1]);
  assert.deepEqual(pascal(5), [1, 5, 10, 10, 5, 1]);
});

test('pascal: row n has n+1 entries and they add up to 2^n', () => {
  for (let n = 0; n <= max_row; n++) {
    const row = pascal(n);
    assert.equal(row.length, n + 1);
    assert.equal(row.reduce((a, b) => a + b, 0), 2 ** n);
  }
});

test('pascal: every row is symmetric and starts and ends with 1', () => {
  for (let n = 0; n <= max_row; n++) {
    const row = pascal(n);
    assert.equal(row[0], 1);
    assert.equal(row[n], 1);
    row.forEach((v, k) => assert.equal(v, row[n - k]));
  }
});

test('pascal: each inner entry is the sum of its two parents', () => {
  for (let n = 2; n <= max_row; n++) {
    const above = pascal(n - 1);
    const row = pascal(n);
    for (let k = 1; k < n; k++) assert.equal(row[k], above[k - 1] + above[k]);
  }
});

test('pascal: known big values and the largest allowed row', () => {
  assert.equal(pascal(16)[8], 12870);
  assert.equal(pascal(16)[1], 16);
  assert.equal(pascal(max_row)[15], 155117520);         // C(30,15)
  assert.equal(max_row, 30);
});

// ---------- slotprob(n): probabilities ----------

test('slotprob: known small cases', () => {
  assert.deepEqual(slotprob(0), [1]);
  assert.deepEqual(slotprob(2), [0.25, 0.5, 0.25]);
  assert.deepEqual(slotprob(3), [0.125, 0.375, 0.375, 0.125]);
  assert.deepEqual(slotprob(4), [0.0625, 0.25, 0.375, 0.25, 0.0625]);
});

test('slotprob: sums to 1 and is symmetric for every board size', () => {
  for (let n = 0; n <= max_row; n++) {
    const p = slotprob(n);
    assert.equal(p.length, n + 1);
    assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-12, `n=${n}`);
    p.forEach((v, k) => assert.equal(v, p[n - k]));
  }
});

test('slotprob: every probability is in (0, 1] and the centre is the likeliest', () => {
  for (let n = 1; n <= 16; n++) {
    const p = slotprob(n);
    p.forEach((v) => assert.ok(v > 0 && v <= 1));
    assert.equal(Math.max(...p), p[Math.floor(n / 2)]);
  }
});

test('slotprob: the jackpot corner is exactly 1 / 2^n', () => {
  assert.equal(slotprob(16)[0], 1 / 65536);
  assert.equal(slotprob(16)[16], 1 / 65536);
});

// ---------- check(n, k): one slot ----------

test('check: returns the right probability for one slot', () => {
  assert.equal(check(3, 1), 0.375);
  assert.equal(check(4, 2), 0.375);
  assert.equal(check(16, 0), 1 / 65536);
  assert.equal(check(8, 4), 70 / 256);
});

test('check: agrees with slotprob for every slot', () => {
  for (let n = 0; n <= 16; n++) {
    const p = slotprob(n);
    for (let k = 0; k <= n; k++) assert.equal(check(n, k), p[k]);
  }
});

// ---------- bad input ----------

test('pascal and slotprob reject invalid rows with a RangeError that mentions the limit', () => {
  for (const bad of [-1, 31, 2.5, NaN, Infinity, '5', null, undefined]) {
    assert.throws(() => pascal(bad), { name: 'RangeError', message: /0 to 30/ }, `pascal(${String(bad)})`);
    assert.throws(() => slotprob(bad), { name: 'RangeError' }, `slotprob(${String(bad)})`);
  }
});

test('check rejects an invalid slot or invalid rows', () => {
  assert.throws(() => check(8, -1), { name: 'RangeError', message: /slot must be/ });
  assert.throws(() => check(8, 9), RangeError);
  assert.throws(() => check(8, 1.5), RangeError);
  assert.throws(() => check(8, '3'), RangeError);
  assert.throws(() => check(31, 0), RangeError);
});