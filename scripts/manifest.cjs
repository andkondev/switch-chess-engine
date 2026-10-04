// SPDX-License-Identifier: GPL-3.0-or-later
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function files(dir, prefix = '') {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => {
    if (['.git', '.build', 'dist', 'node_modules', 'release-manifest.json'].includes(entry.name)) return [];
    const name = prefix + entry.name, full = path.join(dir, entry.name);
    return entry.isDirectory() ? files(full, name + '/') : [name];
  }).sort();
}
const source = Object.fromEntries(files(root).map(name => [name, hash(path.join(root, name))]));
const assets = Object.fromEntries(['switchfish.js','switchfish.wasm','worker.js','uci.js'].map(name => {
  const file = path.join(root, 'dist', name);
  return [name, {bytes:fs.statSync(file).size, sha256:hash(file)}];
}));
fs.writeFileSync(path.join(root, 'release-manifest.json'), JSON.stringify({
  version: '1.0.0', upstream:'9f778da667f6e07dae1e85d3e2ea204fc6dee94d',
  emscripten:'3.1.64', source, assets,
}, null, 2) + '\n');
