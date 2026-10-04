// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Andkon. Bounded UCI browser adapter for Fairy-Stockfish.
// Self-contained engine interface; no game UI, referee or slider imports.
(function (root) {
  "use strict";
  const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const config = "[switchchess:chess]\ncastling = false\ndoubleStep = false\n";
  function createUciSession(engine, send) {
    engine.ccall("switch_init", null, ["string"], [config]);
    let variant = "chess", skill = 20, fen = startFen, moves = [], positioned = false;
    function command(input) {
      if (typeof input !== "string" || input.length > 100000 || /[\r\n\0]/.test(input))
        throw new Error("Expected one bounded UCI command line.");
      const line = input.trim();
      if (line === "uci") {
        send("id name Fairy-Stockfish browser engine 1.0.0");
        send("id author Fairy-Stockfish and Stockfish developers; browser adapter by Andkon");
        send("option name UCI_Variant type combo default chess var chess var switchchess");
        send("option name Skill Level type spin default 20 min -20 max 20");
        send("uciok");
      } else if (line === "isready") send("readyok");
      else if (line === "ucinewgame") { positioned = false; moves = []; }
      else if (line.startsWith("setoption ")) {
        const option = /^setoption name (.+?) value (.+)$/.exec(line);
        if (!option) throw new Error("Invalid setoption command.");
        if (option[1] === "UCI_Variant" && ["chess", "switchchess"].includes(option[2])) {
          variant = option[2]; positioned = false;
        } else if (option[1] === "Skill Level" && /^-?\d+$/.test(option[2]) &&
          Number(option[2]) >= -20 && Number(option[2]) <= 20) skill = Number(option[2]);
        else throw new Error("Unsupported engine option.");
      } else if (line.startsWith("position ")) {
        positioned = false;
        const match = /^position (startpos|fen (\S+ [wb] \S+ \S+ \d+ \d+))(?: moves (.+))?$/.exec(line);
        if (!match) throw new Error("Invalid position command.");
        const nextFen = match[1] === "startpos"
          ? (variant === "chess" ? startFen : startFen.replace("KQkq", "-")) : match[2];
        const parts = nextFen.split(" "), ranks = parts[0].split("/");
        if (ranks.length !== 8 || ranks.some(rank => !/^[prnbqkPRNBQK1-8]+$/.test(rank) ||
          [...rank].reduce((n, c) => n + (/[1-8]/.test(c) ? Number(c) : 1), 0) !== 8) ||
          (parts[0].match(/K/g) || []).length !== 1 || (parts[0].match(/k/g) || []).length !== 1 ||
          !/^(?:-|K?Q?k?q?)$/.test(parts[2]) || !/^(?:-|[a-h][36])$/.test(parts[3]) ||
          !Number.isSafeInteger(Number(parts[4])) || !Number.isSafeInteger(Number(parts[5])) ||
          Number(parts[4]) > 1000000 || Number(parts[5]) < 1 || Number(parts[5]) > 1000000)
          throw new Error("Invalid FEN.");
        const nextMoves = match[3] ? match[3].split(" ") : [];
        if (nextMoves.some(move => !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)))
          throw new Error("Invalid move notation.");
        fen = nextFen; moves = nextMoves; positioned = true;
      } else if (/^go movetime \d+$/.test(line)) {
        if (!positioned) throw new Error("Set a position before searching.");
        const ms = Number(line.slice(12));
        if (!Number.isSafeInteger(ms) || ms < 100 || ms > 10000)
          throw new Error("Search time must be 100 to 10000 ms.");
        const move = engine.ccall("switch_search", "string",
          ["string", "string", "string", "number", "number"],
          [variant, fen, moves.join(" "), skill, ms]);
        if (move.startsWith("error:")) throw new Error(move.slice(7));
        if (move !== "(none)" && !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move))
          throw new Error("Invalid engine response.");
        send("bestmove " + (move === "(none)" ? "0000" : move));
      } else if (line === "stop" || line === "quit") {
        // Search is synchronous in this worker; hosts terminate it to cancel.
      } else throw new Error("Unsupported UCI command.");
    }
    return { command };
  }
  root.createUciSession = createUciSession;
  if (typeof module !== "undefined") module.exports = { createUciSession };
})(globalThis);
