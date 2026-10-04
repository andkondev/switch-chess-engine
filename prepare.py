"""Apply a minimal single-worker port to a pinned Fairy-Stockfish checkout."""
from pathlib import Path
import sys

root = Path(sys.argv[1]) / 'src'
def replace(file, before, after):
    path = root / file
    content = path.read_text()
    if before not in content:
        if after in content:
            return
        raise RuntimeError(f'Unexpected upstream source: {file}')
    path.write_text(content.replace(before, after, 1))

replace('thread.cpp', 'Thread::Thread(size_t n) : idx(n), stdThread(&Thread::idle_loop, this) {\n\n  wait_for_search_finished();\n}', 'Thread::Thread(size_t n) : idx(n) { searching = false; }')
replace('thread.cpp', '  assert(!searching);\n\n  exit = true;\n  start_searching();\n  stdThread.join();', '  assert(!searching);')
replace('thread.cpp', '  std::lock_guard<std::mutex> lk(mutex);\n  searching = true;\n  cv.notify_one(); // Wake up the thread in idle_loop()', '  searching = true;\n  search();\n  searching = false;')
replace('thread.cpp', '  std::unique_lock<std::mutex> lk(mutex);\n  cv.wait(lk, [&]{ return !searching; });', '  // The dedicated browser worker runs searches synchronously.')
path = root / 'tt.cpp'
content = path.read_text()
start = content.index('void TranspositionTable::clear() {')
end = content.index('/// TranspositionTable::probe()', start)
content = content[:start] + 'void TranspositionTable::clear() {\n  std::memset(table, 0, clusterCount * sizeof(Cluster));\n}\n\n\n' + content[end:]
path.write_text(content)
