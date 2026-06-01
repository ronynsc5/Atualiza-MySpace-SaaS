// ─── INLINE EDITING ──────────────────────────────────────────────
function startInlineEdit(node, evt) {
  inlineEditing = node;
  const ie = document.getElementById('inline-editor');
  const ti = document.getElementById('inline-title-input');
  const ni = document.getElementById('inline-note-input');

  const screenX = node.x*camera.zoom + camera.x;
  const screenY = node.y*camera.zoom + camera.y;
  const wScale = node.width*camera.zoom;
  const hScale = node.height*camera.zoom;

  ie.style.left = (screenX+10)+'px';
  ie.style.top = (screenY + (node.emoji?32*camera.zoom:8*camera.zoom))+'px';
  ie.style.width = (wScale-20)+'px';

  ti.style.fontSize = (13*camera.zoom)+'px';
  ni.style.fontSize = (11*camera.zoom)+'px';
  ti.value = node.title;
  ni.value = node.note;

  ie.classList.add('show');
  ti.focus(); ti.select();
  draw(); // draw nothing for this node (skipped above)
}

function commitInlineEdit() {
  if(!inlineEditing) return;
  const ti=document.getElementById('inline-title-input');
  const ni=document.getElementById('inline-note-input');
  inlineEditing.title = ti.value;
  inlineEditing.note = ni.value;
  inlineEditing=null;
  document.getElementById('inline-editor').classList.remove('show');
  if(selectedNode) updatePanel();
  saveHist(); draw(); triggerSave();
}

document.getElementById('inline-title-input').addEventListener('keydown',e=>{
  if(e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); document.getElementById('inline-note-input').focus(); }
  if(e.key==='Escape') commitInlineEdit();
});
document.getElementById('inline-note-input').addEventListener('keydown',e=>{
  if(e.key==='Escape') commitInlineEdit();
});
document.getElementById('inline-editor').addEventListener('blur',e=>{
  setTimeout(()=>{
    const ie=document.getElementById('inline-editor');
    if(!ie.contains(document.activeElement)) commitInlineEdit();
  },100);
},true);

// ─── SELECTION ───────────────────────────────────────────────────
function selectNodeObj(node) {
  selectedNode=node; selectedConn=null;
  const rp=document.getElementById('right-panel');
  const bb=document.getElementById('bottom-bar');
  if(node) { rp.classList.add('show'); bb.classList.add('show'); updatePanel(); }
  else { rp.classList.remove('show'); bb.classList.remove('show'); }
}

function selectConnObj(conn) {
  selectedConn=conn; selectedNode=null;
  const rp=document.getElementById('right-panel');
  const bb=document.getElementById('bottom-bar');
  if(conn) {
    rp.classList.add('show'); bb.classList.add('show');
    // Switch to conn tab
    document.querySelectorAll('.rpanel-tab').forEach(t=>t.classList.remove('on'));
    document.querySelectorAll('.rpanel-tab-content').forEach(c=>c.style.display='none');
    document.querySelector('.rpanel-tab[data-tab="conn"]').classList.add('on');
    document.getElementById('tab-conn').style.display='block';
    populateConnPanel(conn);
  } else { rp.classList.remove('show'); bb.classList.remove('show'); }
}

function populateConnPanel(conn) {
  document.getElementById('rp-conn-style').value = conn.style||'curved';
  document.getElementById('rp-conn-width').value = conn.width||2;
  document.getElementById('rp-conn-width-val').textContent = (conn.width||2)+'px';
  document.getElementById('rp-conn-opacity').value = conn.opacity||1;
  document.getElementById('rp-conn-opacity-val').textContent = Math.round((conn.opacity||1)*100)+'%';
  document.getElementById('rp-conn-curve').value = conn.curve ?? 70;
  document.getElementById('rp-conn-curve-val').textContent = conn.curve ?? 70;
  document.querySelectorAll('.cdot').forEach(d=>{
    d.classList.toggle('on', d.dataset.cc===(conn.color||'default'));
  });
}


function normalizeHashTarget(txt) {
  const m = String(txt||'').match(/#([\p{L}\p{N}_\- ]+)/u);
  return m ? m[1].trim().toLowerCase() : null;
}
function findNodeByTitleEverywhere(title) {
  const needle = String(title||'').replace(/^#/,'').trim().toLowerCase();
  if(!needle) return null;
  for(const n of nodes) if(String(n.title||'').trim().toLowerCase()===needle) return {level:currentLevel,node:n};
  for(const [level,w] of Object.entries(workspaces||{})) {
    for(const n of (w.nodes||[])) if(String(n.title||'').trim().toLowerCase()===needle) return {level,node:n};
  }
  return null;
}
function jumpToNode(found) {
  if(!found) return false;
  workspaces[currentLevel]={nodes:[...nodes],connections:[...connections],camera:{...camera}};
  currentLevel = found.level;
  const w=workspaces[currentLevel] || workspaces.root;
  nodes=w.nodes||[]; connections=w.connections||[]; camera=w.camera||{x:0,y:0,zoom:1};
  const n = nodes.find(x=>x.id===found.node.id) || found.node;
  selectNodeObj(n);
  camera.x = W/2 - (n.x+n.width/2)*camera.zoom;
  camera.y = H/2 - (n.y+n.height/2)*camera.zoom;
  updateBreadcrumb(); draw(); triggerSave();
  return true;
}
function activateNode(node) {
  if(!node) return false;
  if(node.type==='folder') { openFolder(node); return true; }
  const firstAction=(node.actions||[])[0];
  if(firstAction) { runAction(firstAction); return true; }
  const hash = normalizeHashTarget(node.linkTarget || node.note || node.title);
  if(hash) return jumpToNode(findNodeByTitleEverywhere(hash));
  return false;
}
function runAction(act) {
  if(!act) return;
  if(act.type==='url') {
    if(String(act.dest).trim().startsWith('#')) { jumpToNode(findNodeByTitleEverywhere(act.dest)); return; }
    const url = /^https?:\/\//i.test(act.dest) ? act.dest : 'https://' + act.dest;
    window.open(url, '_blank', 'noopener');
  } else if(act.type==='wormhole') {
    jumpToNode(findNodeByTitleEverywhere(act.dest));
  } else if(act.type==='folder') {
    const folder = nodes.find(n=>n.id===act.dest || n.title===act.dest);
    if(folder) openFolder(folder);
    else alert('Pasta não encontrada: ' + act.dest);
  } else if(act.type==='card') {
    const card = nodes.find(n=>n.id===act.dest || n.title===act.dest);
    if(card) { selectNodeObj(card); camera.x=W/2-card.x*camera.zoom; camera.y=H/2-card.y*camera.zoom; draw(); }
    else alert('Card não encontrado: ' + act.dest);
  }
}

function updatePanel() {
  if(!selectedNode) return;
  const n=selectedNode;
  document.getElementById('rp-title').value=n.title;
  document.getElementById('rp-note').value=n.note||'';
  document.getElementById('rp-type-text').textContent=n.type==='folder'?'Pasta':n.type==='note'?'Nota':'Card';
  document.getElementById('rp-type-icon').textContent=n.emoji||EMOJIS_DEFAULT[n.type]||'📝';
  document.getElementById('rp-type-select').value=n.type;
  document.getElementById('rp-icon-preview').textContent=n.emoji||EMOJIS_DEFAULT[n.type]||'📝';
  document.getElementById('rp-width-slider').value=n.width;
  document.getElementById('rp-height-slider').value=n.height;
  document.getElementById('rp-iconsize-slider').value=n.iconSize||28;
  document.getElementById('rp-iconx-slider').value=n.iconX||0;
  document.getElementById('rp-icony-slider').value=n.iconY||0;
  document.getElementById('rp-textsize-slider').value=n.textSize||13;
  document.getElementById('rp-notesize-slider').value=n.noteSize||11;
  document.getElementById('rp-width-val').textContent=n.width+'px';
  document.getElementById('rp-height-val').textContent=n.height+'px';
  document.getElementById('rp-iconsize-val').textContent=(n.iconSize||28)+'px';
  document.getElementById('rp-iconx-val').textContent=(n.iconX||0)+'px';
  document.getElementById('rp-icony-val').textContent=(n.iconY||0)+'px';
  document.getElementById('rp-textsize-val').textContent=(n.textSize||13)+'px';
  document.getElementById('rp-notesize-val').textContent=(n.noteSize||11)+'px';
  document.getElementById('rp-bold-btn').classList.toggle('on', n.textBold!==false);
  document.getElementById('rp-italic-btn').classList.toggle('on', !!n.textItalic);
  document.getElementById('rp-underline-btn').classList.toggle('on', !!n.textUnderline);
  ['left','center','right'].forEach(a=>document.getElementById('rp-align-'+a+'-btn')?.classList.toggle('on',(n.textAlign||'left')===a));
  const isManual=!!n.textManual;
  document.getElementById('rp-text-auto-btn')?.classList.toggle('on',!isManual);
  document.getElementById('rp-text-manual-btn')?.classList.toggle('on',isManual);
  const mc=document.getElementById('rp-text-manual-controls'); if(mc)mc.style.display=isManual?'block':'none';
  const ai=document.getElementById('rp-text-auto-info'); if(ai)ai.style.display=isManual?'none':'block';
  const ptS=document.getElementById('rp-textpadtop-slider'); if(ptS)ptS.value=n.textPadTop||0;
  const ptV=document.getElementById('rp-textpadtop-val'); if(ptV)ptV.textContent=(n.textPadTop||0)+'px';
  const plS=document.getElementById('rp-textpadleft-slider'); if(plS)plS.value=n.textPadLeft||0;
  const plV=document.getElementById('rp-textpadleft-val'); if(plV)plV.textContent=(n.textPadLeft||0)+'px';
  document.getElementById('rp-icon-bg-toggle').classList.toggle('on', !n.iconBg);
  document.getElementById('rp-bw-slider').value=n.borderWidth||1.5;
  document.getElementById('rp-bw-val').textContent=(n.borderWidth||1.5)+'px';
  const bgOpSlider=document.getElementById('rp-bg-opacity-slider');
  const bgOpVal=document.getElementById('rp-bg-opacity-val');
  if(bgOpSlider && bgOpVal){
    const bgOp = n.bgOpacity === undefined ? 1 : Number(n.bgOpacity);
    bgOpSlider.value = bgOp;
    bgOpVal.textContent = Math.round(bgOp*100)+'%';
  }

  // bg swatches
  document.querySelectorAll('#rp-bg-swatches .rpanel-swatch').forEach(s=>{
    s.classList.toggle('on', s.dataset.bg===(n.bgColor||'none'));
  });
  // border swatches
  document.querySelectorAll('#rp-border-swatches .rpanel-swatch').forEach(s=>{
    s.classList.toggle('on', s.dataset.border===(n.borderColor||'none'));
  });
  // text swatches
  document.querySelectorAll('#rp-text-swatches .rpanel-swatch').forEach(s=>{
    s.classList.toggle('on', s.dataset.tc===(n.textColor||'#1a1a18'));
  });

  renderActionsList(n);
}

function renderActionsList(node) {
  const list = document.getElementById('rp-actions-list');
  list.innerHTML='';
  (node.actions||[]).forEach((act,i)=>{
    const icons={url:'<i class="ti ti-link"></i>',folder:'<i class="ti ti-folder"></i>',card:'<i class="ti ti-square-rounded"></i>',wormhole:'<i class="ti ti-portal"></i>'};
    const div=document.createElement('div');
    div.className='rpanel-action';
    div.innerHTML=`<span style="margin-right:6px;color:var(--text3);">${icons[act.type]||''}</span>
      <div><div class="rpanel-action-label">${act.type==='url'?'Abrir link externo':act.type==='folder'?'Abrir pasta':act.type==='wormhole'?'Wormhole / #Projeto':'Abrir card'}</div>
      <div class="rpanel-action-val">${act.dest}</div></div>
      <button class="rpanel-action-remove" data-i="${i}"><i class="ti ti-x"></i></button>`;
    div.querySelector('.rpanel-action-remove').onclick=(ev)=>{ ev.stopPropagation(); node.actions.splice(i,1); renderActionsList(node); saveHist(); draw(); triggerSave(); };
    div.onclick=()=>runAction(act);
    list.appendChild(div);
  });
}
