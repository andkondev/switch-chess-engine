// SPDX-License-Identifier: GPL-3.0-or-later
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createUciSession } = require('../uci.js');
const ready = require('../dist/switchfish.js')({
  wasmBinary: fs.readFileSync(__dirname + '/../dist/switchfish.wasm'),
  print: () => {}, printErr: () => {},
});
test('standalone engine negotiates UCI and searches ordinary chess and Switch Chess', async () => {
  const output = [], s = createUciSession(await ready, line => output.push(line));
  for (const line of ['uci','isready','position startpos','go movetime 100']) s.command(line);
  assert.ok(output.includes('uciok')); assert.ok(output.includes('readyok'));
  const first = output.at(-1);
  assert.match(first, /^bestmove (?:[a-h]2[a-h][34]|[bg]1[acfh]3)$/);
  s.command('setoption name UCI_Variant value switchchess');
  s.command('setoption name Skill Level value 20');
  s.command('position fen 7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
  s.command('go movetime 150');
  assert.match(output.at(-1), /^bestmove f7(?:e8|f8|g7|h7)$/);
  s.command('position fen 7k/5Q2/6K1/8/8/8/8/8 w - - 0 1 moves a1a8');
  assert.throws(() => s.command('go movetime 100'), /illegal history/);
});
test('rejects malformed protocol and does not search stale positions', async () => {
  const s = createUciSession(await ready, () => {});
  for (const line of [{}, 'uci\nisready','setoption name Skill Level value NaN',
    'setoption name UCI_Variant value unknown','position fen 8/8 w - - 0 1'])
    assert.throws(() => s.command(line));
  s.command('position startpos');
  assert.throws(() => s.command('position fen bad'));
  assert.throws(() => s.command('go movetime 100'), /position/);
  s.command('position startpos');
  assert.throws(() => s.command('go movetime 0'), /time/);
  assert.throws(() => s.command('go movetime 999999999999999999999'), /time/);
});
