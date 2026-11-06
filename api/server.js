
import { app } from './route.js';
import { sweep } from '../src/store.js';

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Plinko running on http://localhost:${port}`));
