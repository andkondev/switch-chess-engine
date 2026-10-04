# Fairy-Stockfish browser engine

A standalone GPL-3.0-or-later browser/Node engine supporting ordinary chess
and Switch Chess through a bounded subset of UCI. No game interface, slider,
artwork, authentication code, or game referee is required to build or run it.

Upstream Fairy-Stockfish revision: `9f778da667f6e07dae1e85d3e2ea204fc6dee94d`
from https://github.com/fairy-stockfish/Fairy-Stockfish. `upstream/` contains
that revision's complete `src/`, AUTHORS, license and upstream README.

## Build independently

Use Linux, macOS, or WSL, Python 3, Node.js 20+, and **Emscripten 3.1.64**.
The Emscripten SDK is available at https://github.com/emscripten-core/emsdk.
Install/activate `3.1.64`, then source its `emsdk_env.sh`, or set `EMSDK` to
that SDK directory. No npm install is needed for this engine package.

```sh
bash build.sh
npm test
npm run uci
```

`dist/` contains the loader, WASM, Worker, UCI adapter and GPL license.
`release-manifest.json` records SHA-256 hashes of all source inputs and the
four runtime assets. Rebuilds use a scratch `.build/` copy; upstream files
are not changed. Tools are pinned by the build's version check.

## Text protocol

Create a classic browser Worker from `dist/worker.js`. Send one UCI command
string per `postMessage`; each response is one string. No shared memory,
application objects, module imports into the host, or custom match IDs cross
this interface. The optional Node CLI uses the same lines on stdin/stdout.
It defaults to `dist/`; `ENGINE_ASSET_DIR` can select matching built assets.

```text
uci
setoption name UCI_Variant value switchchess
setoption name Skill Level value 8
isready
position fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1 moves e2e3
go movetime 750
```

Responses include `uciok`, `readyok`, and `bestmove e7e6` (example only).
For standard chess, select `chess` and send `position startpos`.
The supported subset is `uci`, `isready`, `ucinewgame`, `position`, `setoption`
for UCI_Variant/Skill Level, and `go movetime 100..10000`. Skill is -20..20.
`0000` means no available move. Errors use `info string error ...`.
This is not a full pondering, clock-management or analysis GUI implementation.

Search is synchronous inside its dedicated Worker. Cancel by terminating the
Worker and creating a new one; queued `stop` cannot interrupt synchronous WASM.
The host must discard outstanding requests after cancellation. The CLI is a
small diagnostic host; end stdin to exit after queued commands finish.

## Adaptation and license

Modified by Andkon, 2026-10-04. `prepare.py` changes OS-thread scheduling and
hash clearing to run synchronously. `searchbridge.cpp` initializes the engine,
selects either variant, replays history and invokes the existing bounded search.
`uci.js`, `worker.js`, and `cli.cjs` implement the transport. Search, move
selection and evaluation algorithms are retained. NO_THREADS and
NNUE_EMBEDDING_OFF are enabled, with handcrafted evaluation, one thread,
16 MiB hash, 64 MiB initial and 256 MiB maximum WASM memory.

Switch Chess uses normal piece movement with castling and pawn double steps
disabled. The host chooses the starting position. Engine configuration is
contained in `uci.js`; it does not import the game's rule implementation.

The engine and adapter are GPL-3.0-or-later; see LICENSE and
THIRD_PARTY_NOTICES.txt. Bundled runtime libraries retain their own notices
under `notices/`. You may copy, modify and redistribute under the GPL. There
is no warranty. Engine strength on unusual positions has no claimed Elo.

The public source release is https://github.com/andkondev/switch-chess-engine/tree/v1.0.0.
The game also offers a self-contained source ZIP for the exact engine build.
Separating programs is an architectural boundary, not a blanket legal ruling
that every host integration is an independent work.
