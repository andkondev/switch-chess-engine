// Switch Chess browser adapter, GPL-3.0-or-later.
// Runs the unchanged Fairy-Stockfish search synchronously inside one Web Worker.
#include <emscripten.h>
#include <sstream>
#include <memory>
#include <algorithm>
#include "bitboard.h"
#include "evaluate.h"
#include "misc.h"
#include "position.h"
#include "search.h"
#include "thread.h"
#include "tt.h"
#include "uci.h"
#include "piece.h"
#include "variant.h"

using namespace Stockfish;
static std::string response;

extern "C" {
EMSCRIPTEN_KEEPALIVE void switch_init(const char* config) {
  pieceMap.init();
  variants.init();
  UCI::init(Options);
  Bitboards::init();
  Position::init();
  Bitbases::init();
  std::stringstream stream(config);
  variants.parse_istream<false>(stream);
  Options["Use NNUE"] = std::string("false");
  Threads.set(1);
  Search::clear();
}

EMSCRIPTEN_KEEPALIVE const char* switch_search(const char* variantName, const char* fen, const char* moves, int skill, int milliseconds) {
  const auto found = variants.find(variantName);
  if (found == variants.end()) { response = "error: unknown variant"; return response.c_str(); }
  const Variant* variant = found->second;
  UCI::init_variant(variant);
  Options["Skill Level"] = std::to_string(std::clamp(skill, -20, 20));
  StateListPtr states(new std::deque<StateInfo>(1));
  Position pos;
  pos.set(variant, fen, false, &states->back(), Threads.main());
  std::istringstream replay(moves);
  std::string uci;
  while (replay >> uci) {
    Move move = UCI::to_move(pos, uci);
    if (move == MOVE_NONE) { response = "error: illegal history"; return response.c_str(); }
    states->emplace_back();
    pos.do_move(move, states->back());
  }
  Search::LimitsType limits;
  limits.startTime = now();
  limits.movetime = std::clamp(milliseconds, 100, 10000);
  Threads.start_thinking(pos, states, limits);
  // NO_THREADS adaptation executes MainThread::search in start_searching().
  auto* best = Threads.main()->bestThread;
  response = best && !best->rootMoves.empty()
    ? UCI::move(pos, best->rootMoves[0].pv[0]) : "(none)";
  return response.c_str();
}
}
