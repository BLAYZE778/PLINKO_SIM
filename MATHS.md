# Maths behind the classic PLINKO game:

i started with writting the possible combination of left and rights, because at each row we have a binary choice between L/R.

and it beautifully turns out to be PASCAL'S TRIANGLE in DISGUISE

Row 0:           1
Row 1:         1   1
Row 2:       1   2   1
Row 3:     1   3   3   1
Row 4:   1   4   6   4   1

then we find out that every slot no depends of the no of rights.

# SLOT PROBABILITY :
**P(k) = nCk/2^n**
k=slot no/no of rights

# Calculating raw weight : 
because of the symmetry we start from middle.
X = (|k-n/2|)(n/2);
k = distance from centre;

(why did we normalize ? if we dont then it will depend on the no. of n if we have n=10 or n=100 it will have diff values and it becomes difficult for us to map it out, hence the normalisation)

# Binomial distribution :
**P(x=k) = nCkp^k(1-p)^n-k**
The probability p(x=k) that our random outcome x ends up exactly equal to a specific slot k.

what happens when we plot the probabilities vs slots ??
We get a symmetrical curve which mimicks the iconic **BELL CURVE** which gives an insight on why we are more likeley to hit the center than the edges (and the casinos love it :)

# RAW WEIGHT's
**raw = e^(s.x^p)**
s = controls the steepness of the curve, if s = 0 then we get same payout in each slot(which we dont want!)
x = normalized distance we used above;
p = controls the sharpness of the curve, increasing p makes the curve flat near the centre and hence even payout;