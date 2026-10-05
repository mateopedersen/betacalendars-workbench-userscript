import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(resolve(root, 'dist'), { recursive: true });
await copyFile(resolve(root, 'src/betacalendars-workbench.user.js'), resolve(root, 'dist/betacalendars-workbench.user.js'));
console.log('Built dist/betacalendars-workbench.user.js (readable, unminified source copy).');
