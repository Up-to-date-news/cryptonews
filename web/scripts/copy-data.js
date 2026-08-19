// Copies the repo-root /data folder into web/public/data so Vite can serve
// it. Run before dev/build rather than relying on a symlink or junction —
// those don't survive a fresh git checkout on Linux CI/deploy machines,
// so a real copy is the only thing that works identically everywhere.
import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(__dirname, '../../data');
const DEST = path.join(__dirname, '../public/data');

if (existsSync(DEST)) {
  rmSync(DEST, { recursive: true, force: true });
}
cpSync(SOURCE, DEST, { recursive: true });

console.log('[copy-data] Synced /data -> web/public/data');
