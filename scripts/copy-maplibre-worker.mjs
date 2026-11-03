/**
 * Copy MapLibre's web worker into `public/` before dev and build.
 *
 * MapLibre v6 resolves its worker from `import.meta.url`, which Next's webpack
 * build rewrites to a `file://` path in the browser bundle. Serving the worker
 * from a stable public URL avoids that rewrite and keeps the map worker out of
 * the app's JavaScript bundle.
 */

import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(projectRoot, 'node_modules', 'maplibre-gl', 'dist', 'maplibre-gl-worker.mjs');
const destination = join(projectRoot, 'public', 'maplibre-gl-worker.mjs');

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);
