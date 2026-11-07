import { slotprob } from "./prob.js";
export const min_r = 8;
export const max_r = 16;
export const risks = ['low','medium','high'];
export const optimal_RTP = 0.99;
 const curves = {
    low:    { steepness: 2.8, sharpness: 2.6 },
    medium: { steepness: 5.0, sharpness: 2.2 },
    high:   { steepness: 7.5, sharpness: 2.6 },
 };
 function valid(row,risk){
   if(!Number.isInteger(row) || row < min_r || row > max_r){
      throw new RangeError('Invalid number of Rows');
   }
   if(!risks.includes(risk)){
      throw new RangeError('Invalid Risk Level');
   }
 }
 export function distFromCentre(rows,k){
    return Math.abs(k-rows/2)/(rows/2);
 }
 export function rawWeight(rows,risk){
    valid(rows,risk);
    const {steepness, sharpness} = curves[risk];
    const w = [];
    for(let k=0; k<=rows; k++){
      w.push(Math.exp(steepness*distFromCentre(rows,k)**sharpness));
    }
    return w;
 }
 export function roundMul(m){
    if(m>=100) return Math.round(m);
    if(m>=10) return Math.round(m*10)/10;
    return Math.round(m * 100) / 100;
 }
 export function buildMul(rows,risk){
    const raw = rawWeight(rows,risk);
    const prob = slotprob(rows);
    let avg = 0;
    for(let k=0; k<=rows; k++){
        avg += raw[k]*prob[k];
    }
    const scale = optimal_RTP/avg;
    return raw.map((w) => roundMul(w*scale));
 }
 export function computeRTP(rows,m){
    const prob = slotprob(rows);
    let rtp=0;
    for(let k=0; k<=rows; k++){
        rtp += prob[k]*m[k];
    }
    return rtp;
 }
 export function volatility(rows,m){
    const prob = slotprob(rows);
    let secondMoment = 0;
    for(let k=0; k<=rows; k++){
        secondMoment += prob[k]*m[k]**2;
    }
    const rtp = computeRTP(rows,m);
    return Math.sqrt(Math.max(0,secondMoment-rtp*rtp));
 }
 export function HitRate(rows, m){
   const prob = slotprob(rows);
   let hitRate = 0;

  for (let k = 0; k <= rows; k++) {
    if (m[k] >= 1) {
      hitRate += prob[k];
    }
  }
  return hitRate;
 }
 export function analyse(rows, risk) {
   const multipliers = buildMul(rows, risk);

  const rtp = computeRTP(rows, multipliers);

  const volt = volatility(rows, multipliers);

  const hitRate = HitRate(rows, multipliers);

  return {
    rows,
    risk,
    multipliers,
    rtp,
    volatility: volt,
    hitRate
  };
 }
 export function payout(betamt, m) {
  if (!Number.isInteger(betamt) || betamt < 0) {
    throw new RangeError(`bet must be a non-negative integer number of cents, got ${betamt}`);
  }
  if (typeof m !== 'number' || !(m >= 0)) {
    throw new RangeError(`multiplier must be a number >= 0, got ${m}`);
  }
  const hundredths = Math.round(m * 100);
  return Math.floor((betamt * hundredths) / 100);
}