/* frontend/app.js: the browser side of Plinko.
   Pure UI. The server owns balances, randomness and maths. Here we only
   (1) ask the server for a bet, (2) animate the moves it returns, (3) show numbers. */

const $ = (s) => document.querySelector(s);
const fmtC = (c) => (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtM = (m) => (m >= 100 ? m.toFixed(0) : m >= 10 ? m.toFixed(1) : m.toFixed(2)) + '×';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ERRORS = {
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  INVALID_INPUT: 'Invalid input',
  NO_SESSION: 'Session expired, reload the page',
};

// All state the page keeps. Money is in cents.
//   bal   = the server's balance after the latest bet (it already includes that bet's payout)
//   owed  = winnings of balls still in the air; the screen shows bal - owed
//   M     = multipliers for the current rows and risk (to label the slots)
const S = {
  token: '', n: 16, risk: 'medium', M: [], bal: 0, owed: 0,
  balls: [], pending: 0, hist: [], flash: {}, auto: false,
  st: { bets: 0, wag: 0, profit: 0, best: 0, wins: 0 },
};

/* ---------- talking to the server ---------- */
async function api(method, url, body) {
  const r = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json', 'x-session': S.token },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (j.error === 'NO_SESSION') { try { localStorage.removeItem('plinko_token'); } catch {} }
    throw Object.assign(new Error(j.error || 'ERROR'), { code: j.error });
  }
  return j;
}

/* ---------- setup ---------- */
for (let i = 8; i <= 16; i++) $('#rows').add(new Option(i, i, false, i === 16));
const say = (t) => ($('#msg').textContent = t || '');

function applyState(st) {                       // st = { balance }
  S.bal = st.balance;
}

async function init() {
  try { S.token = localStorage.getItem('plinko_token') || ''; } catch {}
  let st;
  try { st = await api('GET', '/api/state'); }          // returning player
  catch {                                               // first visit, or the server forgot us
    const c = await api('POST', '/api/session');
    S.token = c.token;
    try { localStorage.setItem('plinko_token', c.token); } catch {}
    st = c;
  }
  applyState(st);
  await loadTable();
  ui();
}

async function loadTable() {
  const r = await api('GET', `/api/multipliers?rows=${S.n}&risk=${S.risk}`);
  S.M = r.multipliers; S.flash = {};
}

const locked = () => S.balls.length + S.pending > 0;     // balls falling or a bet request in flight
async function changeCfg() {
  if (locked()) {
    say('Wait for balls to land before changing rows or risk');
    $('#rows').value = S.n; $('#risk').value = S.risk;
    return;
  }
  S.n = +$('#rows').value; S.risk = $('#risk').value; say('');
  await loadTable();
}
$('#rows').onchange = $('#risk').onchange = changeCfg;

/* ---------- numbers on screen ---------- */
function slotColor(m) {                                  // hue 58 (yellow) -> 0 (red) on a log scale
  const mx = Math.max(...S.M), v = (Math.log10(Math.max(m, 0.1)) + 1) / (Math.log10(mx) + 1);
  return 'hsl(' + Math.round(58 - 58 * Math.min(1, Math.max(0, v))) + ',88%,56%)';
}
function ui() {
  $('#bal').textContent = fmtC(S.bal - S.owed);
  $('#hist').innerHTML = S.hist.map((h) => '<div class="chip" style="background:' + h.col + '">' + fmtM(h.m) + '</div>').join('');
  const s = S.st;
  $('#stats').innerHTML = [
    ['Bets', s.bets], ['Wagered', fmtC(s.wag)],
    ['Profit', '<span class="' + (s.profit >= 0 ? 'pos' : 'neg') + '">' + (s.profit < 0 ? '-' : '') + fmtC(Math.abs(s.profit)) + '</span>'],
    ['Win rate', s.bets ? ((s.wins / s.bets) * 100).toFixed(1) + '%' : '–'],
    ['Best multiplier', s.best ? fmtM(s.best) : '–'],
  ].map((x) => '<div><span>' + x[0] + '</span><b>' + x[1] + '</b></div>').join('');
}
const getAmt = () => Math.round((parseFloat($('#amt').value) || 0) * 100);   // "1.50" -> 150 cents
$('#half').onclick = () => { $('#amt').value = (Math.max(1, Math.floor(getAmt() / 2)) / 100).toFixed(2); };
$('#dbl').onclick = () => { $('#amt').value = (Math.max(1, Math.min(getAmt() * 2, S.bal - S.owed)) / 100).toFixed(2); };
$('#max').onclick = () => { $('#amt').value = ((S.bal - S.owed) / 100).toFixed(2); };

$('#reset').onclick = async () => {
  if (locked()) return;
  try {
    applyState(await api('POST', '/api/reset'));
    S.st = { bets: 0, wag: 0, profit: 0, best: 0, wins: 0 }; S.hist = []; S.owed = 0; say(''); ui();
  } catch (e) { say(ERRORS[e.code] || 'Something went wrong'); }
};

/* ---------- betting ---------- */
async function bet() {
  const c = getAmt();
  if (!(c > 0)) { say('Enter a bet above 0'); return false; }
  if (c > S.bal - S.owed) { say('Insufficient balance'); return false; }     // quick check; the server checks again
  say(''); S.pending++;
  let r;
  try { r = await api('POST', '/api/bet', { amount: c, rows: S.n, risk: S.risk }); }
  catch (e) { S.pending--; say(ERRORS[e.code] || 'Something went wrong'); return false; }
  S.pending--;

  // r.moves = ['L','R','R',...]. Turn it into the running count of rights, one entry per level:
  // ['R','L','R'] -> [0, 1, 1, 2]. The animation reads k[r] to find the ball's sideways position.
  const k = [0];
  r.moves.forEach((m) => k.push(k[k.length - 1] + (m === 'R' ? 1 : 0)));

  S.bal = r.balance;            // the server has already paid out...
  S.owed += r.pay;              // ...but the screen holds the winnings back until the ball lands
  S.balls.push({ n: r.rows, k, bet: r.amount, mult: r.multiplier, pay: r.pay, t0: performance.now() });
  ui();
  return true;
}
function land(b) {                                       // called by draw() when a ball reaches the bottom
  const s = S.st;
  S.owed -= b.pay;
  s.bets++; s.wag += b.bet; s.profit += b.pay - b.bet;
  if (b.pay > b.bet) s.wins++;
  s.best = Math.max(s.best, b.mult);
  S.hist.unshift({ m: b.mult, col: slotColor(b.mult) }); S.hist = S.hist.slice(0, 8);
  S.flash[b.k[b.n]] = performance.now();                 // b.k[b.n] = final count of rights = landing slot
  ui();
}
$('#bet').onclick = bet;
$('#auto').onclick = async () => {
  if (S.auto) { S.auto = false; return; }
  S.auto = true; $('#auto').textContent = 'Stop auto'; $('#auto').classList.add('on');
  let left = parseInt($('#cnt').value, 10) || 0;          // 0 = unlimited
  while (S.auto) {
    if (!(await bet())) break;
    if (left > 0 && --left === 0) break;
    await sleep(380);
  }
  S.auto = false; $('#auto').textContent = 'Start auto'; $('#auto').classList.remove('on');
};

/* ---------- the board (canvas) ---------- */
// The canvas has a fixed internal size (700 x 560). CSS scales it down; dpr makes it sharp on Retina.
const cv = $('#cv'), ctx = cv.getContext('2d'), W = 700, H = 560;
const dpr = Math.min(2, window.devicePixelRatio || 1), RD = 150;       // RD = ms per row
cv.width = W * dpr; cv.height = H * dpr;

function draw(now) {
  const css = getComputedStyle(document.documentElement);
  const peg = css.getPropertyValue('--peg'), ballC = css.getPropertyValue('--ball'), n = S.n;
  const sp = (W - 40) / (n + 2), top = 34, vs = (H - top - 70) / n, cx = W / 2;
  const pr = Math.max(2.2, sp * 0.075), br = Math.max(5, sp * 0.2);
  const X = (r, k) => cx + (k - r / 2) * sp;             // sideways position after r rows with k rights
  const Y = (r) => top + r * vs;                         // height of row r
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = peg;                                   // pegs: row r has r + 3, centred
  for (let r = 0; r < n; r++) for (let j = 0; j < r + 3; j++) {
    ctx.beginPath(); ctx.arc(cx + (j - (r + 2) / 2) * sp, Y(r), pr, 0, 7); ctx.fill();
  }

  if (S.M.length === n + 1) S.M.forEach((m, k) => {      // slots: n + 1 of them under the last row
    const f = S.flash[k], t = f ? Math.min(1, (now - f) / 320) : 1;
    const dy = f && t < 1 ? Math.sin(t * Math.PI) * 6 : 0;
    const w = sp - 5, x = X(n, k) - w / 2, y = Y(n) + 4 + dy;
    ctx.fillStyle = slotColor(m); ctx.beginPath(); ctx.roundRect(x, y, w, 26, 5); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = '700 ' + Math.max(8, Math.min(12, sp * 0.3)) + 'px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(m >= 10 ? m.toFixed(0) : m.toFixed(1), X(n, k), y + 13);
  });

  for (let i = S.balls.length - 1; i >= 0; i--) {        // backwards, so removing a ball is safe
    const b = S.balls[i], p = (now - b.t0) / RD - 0.6;   // p = progress in rows (-0.6 = short pre-drop)
    if (p >= b.n) { land(b); S.balls.splice(i, 1); continue; }
    let x, y;
    if (p < 0) { x = cx; y = Y(0) + p * vs * 1.2; }
    else {
      const r = Math.floor(p), f = p - r, e = f * f * (3 - 2 * f);       // e = smooth ease (slow, fast, slow)
      x = X(r, b.k[r]) + (X(r + 1, b.k[r + 1]) - X(r, b.k[r])) * e;      // slide to the next peg's x
      y = Y(r) + (Y(r + 1) - Y(r)) * f * f - 7 * Math.sin(Math.PI * f) * (1 - f);   // gravity + a little hop
    }
    y -= pr + br * 0.9;                                  // rest the ball on top of the peg
    ctx.fillStyle = ballC; ctx.beginPath(); ctx.arc(x, y, br, 0, 7); ctx.fill();
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
init().catch(() => say('Could not reach the server'));
