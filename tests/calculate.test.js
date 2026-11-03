import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  min_r, max_r, risks, optimal_RTP, distFromCentre, rawWeight, roundMul, buildMul,
  computeRTP, volatility, HitRate, analyse, payout,
} from '../src/MATHS/calculate.js';

const approx = (a, b, eps = 1e-12) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

// ---------- constants ----------

test('constants are what the design says', () => {
  assert.equal(min_r, 8);
  assert.equal(max_r, 16);
  assert.deepEqual(risks, ['low', 'medium', 'high']);
  assert.equal(optimal_RTP, 0.99);
});

// ---------- step (a): distance from centre ----------

test('distFromCentre: 0 at the centre, 1 at both edges, symmetric', () => {
  assert.equal(distFromCentre(8, 4), 0);
  assert.equal(distFromCentre(8, 0), 1);
  assert.equal(distFromCentre(8, 8), 1);
  assert.equal(distFromCentre(8, 2), 0.5);
  for (let n = min_r; n <= max_r; n++) {
    for (let k = 0; k <= n; k++) assert.equal(distFromCentre(n, k), distFromCentre(n, n - k));
  }
});

// ---------- step (b): raw weights ----------

test('rawWeight: one weight per slot (rows + 1 of them)', () => {
  for (let n = min_r; n <= max_r; n++) {
    for (const r of risks) assert.equal(rawWeight(n, r).length, n + 1);
  }
});

test('rawWeight: centre is e^0 = 1 and edges are e^steepness', () => {
  approx(rawWeight(8, 'low')[4], 1);
  approx(rawWeight(8, 'low')[0], Math.exp(2.8));
  approx(rawWeight(8, 'medium')[0], Math.exp(5.0));
  approx(rawWeight(16, 'high')[16], Math.exp(7.5));
});

test('rawWeight: symmetric, never below 1, rising away from the centre', () => {
  for (let n = min_r; n <= max_r; n++) {
    for (const r of risks) {
      const w = rawWeight(n, r);
      w.forEach((v, k) => { assert.equal(v, w[n - k]); assert.ok(v >= 1); });
      for (let k = 0; k < Math.floor(n / 2); k++) assert.ok(w[k] > w[k + 1]);
    }
  }
});

// ---------- rounding ----------

test('roundMul: three tiers', () => {
  assert.equal(roundMul(0.28444), 0.28);
  assert.equal(roundMul(1.005), 1);
  assert.equal(roundMul(12.345), 12.3);
  assert.equal(roundMul(101.6), 102);
  assert.equal(roundMul(1038.4), 1038);
});

// ---------- step (c): the multiplier table ----------

test('buildMul: n+1 positive multipliers, symmetric, each a multiple of 0.01', () => {
  for (let n = min_r; n <= max_r; n++) {
    for (const r of risks) {
      const m = buildMul(n, r);
      assert.equal(m.length, n + 1);
      m.forEach((v, k) => {
        assert.equal(v, m[n - k]);
        assert.ok(v > 0);
        assert.equal(Math.round(v * 100) / 100, v);
      });
    }
  }
});

test('buildMul: RTP is close to 99% and never above 100%, for every board', () => {
  for (let n = min_r; n <= max_r; n++) {
    for (const r of risks) {
      const rtp = computeRTP(n, buildMul(n, r));
      assert.ok(rtp > 0.97 && rtp < 1, `rtp ${rtp} for ${n}/${r}`);
    }
  }
});

test('buildMul: more risk = bigger edges and a smaller centre', () => {
  for (let n = min_r; n <= max_r; n++) {
    const [lo, mid, hi] = risks.map((r) => buildMul(n, r));
    assert.ok(lo[0] < mid[0] && mid[0] < hi[0]);
    const c = Math.floor(n / 2);
    assert.ok(hi[c] <= mid[c] && mid[c] <= lo[c]);
  }
});

test('buildMul: spot-check against a table you can verify', () => {
  assert.equal(buildMul(16, 'medium')[0], 101);
  assert.equal(buildMul(16, 'medium')[8], 0.68);
  assert.equal(buildMul(16, 'low')[0], 14.5);
});

// ---------- RTP / volatility / hit rate on hand-made multipliers (8 rows) ----------

test('computeRTP: easy cases you can do on paper', () => {
  approx(computeRTP(8, new Array(9).fill(1)), 1);
  approx(computeRTP(8, new Array(9).fill(2)), 2);
  const edgeOnly = new Array(9).fill(0); edgeOnly[0] = 256;     // P(slot 0) = 1/256
  approx(computeRTP(8, edgeOnly), 1);
});

test('volatility: zero for a constant payout, sqrt(255) for the 256x lottery', () => {
  approx(volatility(8, new Array(9).fill(1)), 0);
  const lottery = new Array(9).fill(0); lottery[0] = 256;
  approx(volatility(8, lottery), Math.sqrt(255), 1e-9);          // E[m^2] = 256, RTP = 1
});

test('HitRate: share of probability on slots that pay at least 1x', () => {
  approx(HitRate(8, new Array(9).fill(1)), 1);
  approx(HitRate(8, new Array(9).fill(0.5)), 0);
  const centre = new Array(9).fill(0); centre[4] = 1;
  approx(HitRate(8, centre), 70 / 256);
});

// ---------- analyse ----------

test('analyse: returns every field and agrees with the individual functions', () => {
  const a = analyse(12, 'high');
  assert.equal(a.rows, 12);
  assert.equal(a.risk, 'high');
  assert.deepEqual(a.multipliers, buildMul(12, 'high'));
  approx(a.rtp, computeRTP(12, a.multipliers));
  approx(a.volatility, volatility(12, a.multipliers));
  approx(a.hitRate, HitRate(12, a.multipliers));
});

test('analyse: higher risk swings harder (hit rate can tie, volatility cannot)', () => {
  const lo = analyse(16, 'low'), mid = analyse(16, 'medium'), hi = analyse(16, 'high');
  assert.ok(lo.volatility < mid.volatility && mid.volatility < hi.volatility);
  assert.ok(hi.hitRate <= lo.hitRate);
  for (const a of [lo, mid, hi]) assert.ok(a.hitRate > 0 && a.hitRate < 1);
});

// ---------- payout in cents ----------

test('payout: never loses a cent to floating point', () => {
  assert.equal(payout(100, 0.29), 29);       // 100 * 0.29 === 28.999999999999996 in floats
  assert.equal(payout(100, 1.1), 110);
  assert.equal(payout(1000, 0.57), 570);
  assert.equal(payout(7, 0.28), 1);          // 1.96 floors to 1
  assert.equal(payout(100, 1038), 103800);
  assert.equal(payout(0, 5), 0);
  assert.equal(payout(500, 0), 0);
});

test('payout: matches exact integer maths over many bets and multipliers', () => {
  for (let bet = 0; bet <= 2000; bet += 7) {
    for (let h = 0; h <= 3000; h += 13) {
      assert.equal(payout(bet, h / 100), Math.floor((bet * h) / 100));
    }
  }
});

// ---------- bad input ----------

test('buildMul and rawWeight reject bad rows and risk', () => {
  for (const f of [buildMul, rawWeight]) {
    assert.throws(() => f(7, 'low'), RangeError);
    assert.throws(() => f(17, 'low'), RangeError);
    assert.throws(() => f(8.5, 'low'), RangeError);
    assert.throws(() => f('12', 'low'), RangeError);
    assert.throws(() => f(12, 'insane'), RangeError);
    assert.throws(() => f(12, undefined), RangeError);
  }
});

test('payout rejects bad bets and bad multipliers', () => {
  for (const bad of [1.5, -1, '100', NaN, null]) assert.throws(() => payout(bad, 2), RangeError);
  for (const bad of [-2, NaN, '2', null, undefined]) assert.throws(() => payout(100, bad), RangeError);
});