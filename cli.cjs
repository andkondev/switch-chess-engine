// SPDX-License-Identifier: GPL-3.0-or-later
const { readFileSync } = require("node:fs");
const { createInterface } = require("node:readline");
const path = require("node:path");
const assetDir = process.env.ENGINE_ASSET_DIR || path.join(__dirname, "dist");
const createEngine = require(path.join(assetDir, "switchfish.js"));
const { createUciSession } = require("./uci.js");
const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
const ready = createEngine({ wasmBinary: readFileSync(path.join(assetDir, "switchfish.wasm")),
  print: () => {}, printErr: () => {} }).then(engine => createUciSession(engine, line => console.log(line)));
let queue = ready;
lines.on("line", line => {
  queue = queue.then(session => { session.command(line); return session; }).catch(error => {
    console.log("info string error " + error.message); return ready;
  });
});
