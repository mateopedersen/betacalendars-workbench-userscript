import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = resolve(root, 'dist/betacalendars-workbench.user.js');
const source = await readFile(scriptPath, 'utf8');
const size = (await stat(scriptPath)).size;
const failures = [];
const requireCheck = (condition, message) => { if (!condition) failures.push(message); };
requireCheck(size < 2_000_000, `Script exceeds 2 MB (${size} bytes).`);
requireCheck(source.startsWith('// ==UserScript=='), 'Userscript metadata block is missing.');
requireCheck(source.includes('// @match        https://www.betacalendars.com/*'), 'BetaCalendars @match is missing.');
requireCheck(!source.includes('*://*/*'), 'Broad wildcard @match is prohibited.');
requireCheck(!/\beval\s*\(|\bnew\s+Function\s*\(/.test(source), 'Dynamic code execution was found.');
requireCheck(!/@require\s|@connect\s+\*/.test(source), 'Unexpected external code or broad network permission found.');
requireCheck(!/google-analytics|googletagmanager|doubleclick|facebook\.com\/tr|utm_(source|campaign)|ref=/.test(source), 'Tracking domain or query parameter was found.');
requireCheck(!/document\.write\s*\(/.test(source), 'document.write was found.');
requireCheck(!/<script\b/i.test(source), 'Embedded script markup was found.');
requireCheck(source.length > 25_000, 'Built script appears incomplete.');
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`Compliance checks passed: ${size.toLocaleString()} bytes, one relevant match, readable and self-contained.`);
