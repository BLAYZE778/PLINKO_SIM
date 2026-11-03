export const max_row = 30;

function isvalid(n){
    if(!Number.isInteger(n)||n<0||n>max_row){
        throw new RangeError(`rows must be an integer from 0 to ${max_row}, got ${n}`);
    }
}
export function pascal(n){
    isvalid(n);
    let row = [1];
    for(let r=1; r<=n; r++){
        const next = [1];
        for(let k=1; k<r; k++){
            next.push(row[k-1]+row[k]);
        }
        next.push(1);
        row = next;
    }
    return row;
}
export function slotprob(n){
    const paths = pascal(n);
    const total = 2 ** n;
    return paths.map((c) => c/total);
}
export function check(n,k){
    const p = slotprob(n);
    if(!Number.isInteger(k)||k<0||k>n){
        throw new RangeError(`slot must be an integer from 0 to ${n}, got ${k}`);
    }
    return p[k];
}