#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ -n "${EMSDK:-}" ]]; then source "$EMSDK/emsdk_env.sh"; fi
command -v em++ >/dev/null || { echo 'Activate Emscripten 3.1.64 first (or set EMSDK).' >&2; exit 1; }
em++ --version | head -n 1 | grep -q '3.1.64' || { echo 'Expected Emscripten 3.1.64.' >&2; exit 1; }
mkdir -p .build dist
cp -R upstream/src .build/
python3 prepare.py .build
cp searchbridge.cpp .build/src/switchbridge.cpp
cd .build/src
em++ -O3 -DNDEBUG -DNNUE_EMBEDDING_OFF -DNO_THREADS -std=c++17 \
  -s MODULARIZE=1 -s EXPORT_NAME=SwitchFish -s ENVIRONMENT=web,worker,node \
  -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=67108864 -s MAXIMUM_MEMORY=268435456 \
  -s STACK_SIZE=8388608 -s FILESYSTEM=0 -s ASSERTIONS=0 \
  -s EXPORTED_FUNCTIONS='["_switch_init","_switch_search"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall"]' \
  switchbridge.cpp benchmark.cpp bitbase.cpp bitboard.cpp endgame.cpp evaluate.cpp \
  material.cpp misc.cpp movegen.cpp movepick.cpp pawns.cpp position.cpp psqt.cpp \
  search.cpp thread.cpp timeman.cpp tt.cpp uci.cpp ucioption.cpp tune.cpp syzygy/tbprobe.cpp \
  nnue/evaluate_nnue.cpp nnue/features/half_ka_v2.cpp \
  partner.cpp parser.cpp piece.cpp variant.cpp xboard.cpp nnue/features/half_ka_v2_variants.cpp \
  -o ../../dist/switchfish.js
cd ../..
cp worker.js uci.js LICENSE dist/
node scripts/manifest.cjs
