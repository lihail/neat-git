import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const isDev = process.env.NODE_ENV === 'development';

build({
  entryPoints: [
    join(rootDir, 'electron/main.ts'),
    join(rootDir, 'electron/preload.ts'),
  ],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outdir: join(rootDir, 'dist-electron'),
  external: ['electron', 'isomorphic-git', 'fs', 'path', 'buffer', 'util', 'stream', 'events', 'crypto', 'http', 'https', 'url', 'zlib'],
  sourcemap: isDev,
  minify: !isDev,
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
}).catch(() => process.exit(1));

