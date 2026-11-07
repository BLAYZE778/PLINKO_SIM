# PLINKO_SIM
A Plinko simulator which I am building to understand the logic and maths behind a game that looks like pure luck

## Why did i choose this project !?
The first time I saw this game was when Samay was playing it (I used to follow him, especially from his chess days :-)). When I decided to build a project, I looked at a few different options, and it had to be something I could finish end to end this month and something that keeps me at my desk with a pen, paper, laptop and coffee (mandatory, the code doesn’t compile without it). Given my love for maths and CS, it had to be related to probability and Logic. Plinko looked like pure luck, which is exactly why I picked it to find out where the maths was hiding. 

▶ **Play it live: https://plinko-sim.onrender.com**
*(Free hosting)

## What it does
- The **server owns the maths**: slot probabilities come from Pascal's triangle, multipliers are scaled so the average return is 99%, and every payout is computed in whole cents.
- The **browser only draws**: it animates the path the server sends back.
- **Play credits only**, no real money.
- Every maths function has tests; I derived the maths on paper first (see [MATHS.md](MATHS.md)).

## Known limits
- since i used `Math.random` for now, so it is **not** provably fair yet.
- wallet is not stored in database and lives in memory so restarting esrases the previous wallet.

## PROGRESS
**1** Setting up the project and understanding the maths behind it, learning basics of node js and typescript

**2** writing and understanding the maths behind it with pen and paper!, committing and pushing the documentation on git hub

**3** wrote probability.js and calculate.js code 

**4** wrote Fall.js and checked my code against tests written by claude and fixed the bugs in my code.

**5** understood how create a player session and keep its wallet and place a bet which calls the engine maths to return the net amount(game.js and store.js)

**6** Learning Node js and express

**7** understanding how api and routing works and connecting frontend with backend (server.js and route.js)

**8** Deploying it on render (free web service)
