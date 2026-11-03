import {buildMul, payout} from './calculate.js';
export const LEFT = 'L';
export const RIGHT = 'R';

function validmove(moves){
    if(!Array.isArray(moves) || moves.length === 0){
        throw new TypeError('Moves must be a combination of L/R moves');
    }
    for(const m of moves){
        if(m!==LEFT && m!==RIGHT){
            throw new TypeError('Each move must be either L/R');
        }
    }
}
export function slotno(moves){
    validmove(moves);
    let r = 0;
    for(const m of moves ){
        if(m===RIGHT){
            r++;
        }
    }
    return r;
}

export function levelsFromMoves(moves){
    validmove(moves);
    const l = [0];
    for(const m of moves ){
        l.push(l[l.length - 1]+(m===RIGHT ? 1 : 0));
    }
    return l;
}

export function calcDrop(moves, betamt, risk){
    const rows = moves.length;
    const slot = slotno(moves);
    const multiplier = buildMul(rows,risk)[slot];
    const pay = payout(betamt, multiplier);
    return{
        rows, risk, slot, multiplier, bet: betamt, pay, net: pay-betamt
    };
}