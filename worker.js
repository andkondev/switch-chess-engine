// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Andkon. Dedicated classic Worker, UCI text in / text out.
importScripts("switchfish.js", "uci.js");
const session = SwitchFish({
  locateFile: file => new URL(file, self.location.href).href,
  print: () => {}, printErr: () => {},
}).then(engine => createUciSession(engine, line => postMessage(line)));
let queue = session;
onmessage = ({ data }) => {
  queue = queue.then(s => { s.command(data); return s; }).catch(error => {
    postMessage("info string error " + String(error.message || error).replace(/[\r\n]/g, " "));
    return session;
  });
};
