// ─── HISTORY ─────────────────────────────────────────────────────
function saveHist() {
  const state={nodes:JSON.parse(JSON.stringify(nodes)),connections:JSON.parse(JSON.stringify(connections)),camera:{...camera}};
  history=history.slice(0,histIdx+1); history.push(state);
  if(history.length>MAX_HIST) history.shift(); else histIdx++;
}

function undo() {
  if(histIdx<=0) return;
  histIdx--;
  const s=history[histIdx];
  nodes=JSON.parse(JSON.stringify(s.nodes)); connections=JSON.parse(JSON.stringify(s.connections)); camera={...s.camera};
  selectNodeObj(null); draw(); triggerSave();
}

function redo() {
  if(histIdx>=history.length-1) return;
  histIdx++;
  const s=history[histIdx];
  nodes=JSON.parse(JSON.stringify(s.nodes)); connections=JSON.parse(JSON.stringify(s.connections)); camera={...s.camera};
  selectNodeObj(null); draw(); triggerSave();
}
