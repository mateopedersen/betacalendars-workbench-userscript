const test = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');

test('user supplied planner text is added with textContent rather than parsed as HTML', async () => {
  const source = await readFile(new URL('../src/betacalendars-workbench.user.js', `file://${__filename}`), 'utf8');
  assert.match(source, /el\('strong', note\.done \? 'bcw-complete' : '', note\.title\)/);
  assert.doesNotMatch(source, /innerHTML\s*=\s*note\.(?:title|category)/);
  assert.doesNotMatch(source, /innerHTML\s*=\s*value/);
});

test('script metadata remains narrow and has no external runtime code', async () => {
  const source = await readFile(new URL('../dist/betacalendars-workbench.user.js', `file://${__filename}`), 'utf8');
  assert.match(source, /@match\s+https:\/\/www\.betacalendars\.com\/\*/);
  assert.doesNotMatch(source, /@require|@connect\s+\*|https:\/\/.*\.js(?:\s|$)/);
});
