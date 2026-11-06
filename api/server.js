// api/server.js
// Starts the server. Kept separate from route.js so tests can import `app`
// without opening apport.

import { app } from './route.js';
import { sweep } from '../src/store.js';

const port = Number(process.env.PORT ?? 3000);                 // hosts like Render set PORT for you
app.listen(port, () => console.log(`Plinko running on http://localhost:${port}`));

// Once an hour, forget players who have been idle for 24 hours.
setInterval(() => sweep(24 * 60 * 60 * 1000), 60 * 60 * 1000).unref();
