import { resolve } from 'node:path';
import { createApp } from './app.ts';

const port = Number(process.env.PORT || 8080);
const app = createApp({
    gamesPath: process.env.games_path || resolve('games'),
    distPath: resolve('dist'),
    apiKey: process.env.steamgrid_key || '',
});
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Romdex listening on port ${port}`);
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 10_000).unref();
    });
}