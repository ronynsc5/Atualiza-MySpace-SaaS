// ─── CONTEXT MENU ────────────────────────────────────────────────
function showCtxMenu(x,y,node) {
  const m=document.getElementById('ctx-menu');
  m.style.left=x+'px'; m.style.top=y+'px';
  m.classList.add('show');
  document.getElementById('ctx-open-folder').style.display=node.type==='folder'?'flex':'none';
}

function hideContextMenu() { document.getElementById('ctx-menu').classList.remove('show'); }

document.getElementById('ctx-open-folder').onclick=()=>{ if(selectedNode&&selectedNode.type==='folder') openFolder(selectedNode); hideContextMenu(); };
document.getElementById('ctx-edit').onclick=()=>{ if(selectedNode) startInlineEdit(selectedNode,null); hideContextMenu(); };
document.getElementById('ctx-add-sub').onclick=()=>{
  if(selectedNode){const sub=createNode(selectedNode.x+20,selectedNode.y+selectedNode.height+40,'card');nodes.push(sub);connections.push({id:`c${connIdCtr++}`,from:selectedNode.id,to:sub.id,style:settings.defaultConnStyle,width:2,color:'default',opacity:1});saveHist();draw();triggerSave();}
  hideContextMenu();
};
document.getElementById('ctx-minimize').onclick=()=>{ if(selectedNode) selectedNode.minimized=!selectedNode.minimized; saveHist(); draw(); triggerSave(); hideContextMenu(); };
document.getElementById('ctx-duplicate').onclick=()=>{ duplicateNode(); hideContextMenu(); };
document.getElementById('ctx-delete').onclick=()=>{ deleteSelected(); hideContextMenu(); };

// ── NOVOS HANDLERS DO MENU DE CONTEXTO ──
document.getElementById('ctx-lock').onclick=()=>{ if(selectedNode) selectedNode.locked=!selectedNode.locked; saveHist(); draw(); triggerSave(); hideContextMenu(); };
document.getElementById('ctx-add-button').onclick=()=>{ showModal('modal-action'); hideContextMenu(); };
document.getElementById('ctx-add-icon').onclick=()=>{ if(selectedNode){document.getElementById('rp-emoji-btn').click();} hideContextMenu(); };
document.getElementById('ctx-add-image').onclick=()=>{ if(selectedNode){document.getElementById('rp-image-btn').click();} hideContextMenu(); };
document.getElementById('ctx-add-text').onclick=()=>{ 
  if(selectedNode){selectedNode.note=(selectedNode.note||'')+'\nNovo texto';saveHist();draw();triggerSave();} 
  hideContextMenu(); 
};
document.getElementById('ctx-add-note').onclick=()=>{ 
  if(selectedNode){const note=createNode(selectedNode.x+20,selectedNode.y+selectedNode.height+20,'note');note.parentId=selectedNode.id;selectedNode.children=selectedNode.children||[];selectedNode.children.push(note.id);nodes.push(note);saveHist();draw();triggerSave();} 
  hideContextMenu(); 
};
document.getElementById('ctx-add-card').onclick=()=>{ 
  if(selectedNode){const card=createNode(selectedNode.x+40,selectedNode.y+40,'card');card.parentId=selectedNode.id;card.width=selectedNode.width-80;card.height=80;selectedNode.children=selectedNode.children||[];selectedNode.children.push(card.id);nodes.push(card);saveHist();draw();triggerSave();} 
  hideContextMenu(); 
};
document.getElementById('ctx-convert-type').onclick=()=>{ 
  if(selectedNode){
    const types=['card','folder','note'];
    const cur=types.indexOf(selectedNode.type);
    selectedNode.type=types[(cur+1)%types.length];
    selectedNode.bgColor=BG_COLORS[selectedNode.type]||'none';
    selectedNode.borderColor=BORDER_COLORS[selectedNode.type]||'none';
    selectedNode.emoji=EMOJIS_DEFAULT[selectedNode.type]||'';
    saveHist();draw();triggerSave();
  } 
  hideContextMenu(); 
};
document.getElementById('ctx-layer-front').onclick=()=>{ if(selectedNode){selectedNode.zIndex=(selectedNode.zIndex||0)+1;nodes.sort((a,b)=>(a.zIndex||0)-(b.zIndex||0));saveHist();draw();triggerSave();} hideContextMenu(); };
document.getElementById('ctx-layer-back').onclick=()=>{ if(selectedNode){selectedNode.zIndex=(selectedNode.zIndex||0)-1;nodes.sort((a,b)=>(a.zIndex||0)-(b.zIndex||0));saveHist();draw();triggerSave();} hideContextMenu(); };
document.getElementById('ctx-style').onclick=()=>{ showModal('modal-styles'); hideContextMenu(); };
document.getElementById('ctx-shape').onclick=()=>{ showModal('modal-shapes'); hideContextMenu(); };
document.getElementById('ctx-animation').onclick=()=>{ if(selectedNode){selectedNode.animatedBorder=!selectedNode.animatedBorder;saveHist();draw();triggerSave();} hideContextMenu(); };
document.getElementById('ctx-behavior').onclick=()=>{ alert('Editor de comportamento em desenvolvimento'); hideContextMenu(); };
document.getElementById('ctx-links').onclick=()=>{ showModal('modal-wormhole'); hideContextMenu(); };

document.addEventListener('click',e=>{ if(!e.target.closest('#ctx-menu')&&!e.target.closest('#cvs')) hideContextMenu(); });

// ─── FOLDER NAV ──────────────────────────────────────────────────
function openFolder(node) {
  workspaces[currentLevel]={nodes:[...nodes],connections:[...connections],camera:{...camera}};
  navStack.push({level:currentLevel,title:node.title});
  currentLevel=node.id;
  if(!workspaces[node.id]) workspaces[node.id]={nodes:[],connections:[],camera:{x:0,y:0,zoom:1}};
  const w=workspaces[node.id];
  nodes=w.nodes||[]; connections=w.connections||[]; camera=w.camera||{x:0,y:0,zoom:1};
  selectNodeObj(null); saveHist(); draw(); triggerSave();
  updateBreadcrumb();
}

function updateBreadcrumb() {
  const bc=document.getElementById('breadcrumb');
  bc.innerHTML='';
  const home=document.createElement('div');
  home.className='breadcrumb-item';
  home.innerHTML='<svg class="breadcrumb-home" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2L2 9h2v9h5v-5h2v5h5V9h2L10 2z"/></svg>';
  home.onclick=()=>{ while(navStack.length) goBack(); };
  bc.appendChild(home);
  navStack.forEach((item,i)=>{
    const sep=document.createElement('span'); sep.className='breadcrumb-sep'; sep.textContent='›'; bc.appendChild(sep);
    const chip=document.createElement('div'); chip.className='breadcrumb-item';
    const c=document.createElement('span'); c.className='breadcrumb-chip'; c.textContent=item.title; chip.appendChild(c);
    chip.onclick=()=>{ const steps=navStack.length-i-1; for(let j=0;j<steps;j++) goBack(); };
    bc.appendChild(chip);
  });
  if(currentLevel!=='root'&&navStack.length>0) {
    const sep=document.createElement('span'); sep.className='breadcrumb-sep'; sep.textContent='›'; bc.appendChild(sep);
    const chip=document.createElement('div'); chip.className='breadcrumb-item';
    const c=document.createElement('span'); c.className='breadcrumb-chip active'; c.textContent=navStack[navStack.length-1]?.title||'Pasta';
    chip.appendChild(c); bc.appendChild(chip);
  }
}

function goBack() {
  if(navStack.length===0) return;
  workspaces[currentLevel]={nodes:[...nodes],connections:[...connections],camera:{...camera}};
  const prev=navStack.pop();
  currentLevel=prev.level;
  const w=workspaces[currentLevel];
  nodes=w.nodes||[]; connections=w.connections||[]; camera=w.camera||{x:0,y:0,zoom:1};
  selectNodeObj(null); saveHist(); draw(); triggerSave(); updateBreadcrumb();
}

// ─── SETTINGS ────────────────────────────────────────────────────
function applySettings() {
  document.body.className=settings.theme==='dark'?'theme-dark':'';
  document.querySelectorAll('.theme-opt').forEach(o=>o.classList.toggle('on',o.dataset.theme===settings.theme));
  ['grid','shadows','auto-minimize','arrows','highlight-conn','autosave','restore'].forEach(k=>{
    const el=document.getElementById('toggle-'+k);
    if(el) el.classList.toggle('on', settings[k.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]??settings[k]??true);
  });
  const dcsel=document.getElementById('default-conn-style');
  if(dcsel) dcsel.value=settings.defaultConnStyle||'curved';
}

// ─── ACTIONS ─────────────────────────────────────────────────────
function deleteSelected() {
  if(selectedNode) {
    nodes=nodes.filter(n=>n.id!==selectedNode.id);
    connections=connections.filter(c=>c.from!==selectedNode.id&&c.to!==selectedNode.id);
    selectNodeObj(null); saveHist(); draw(); triggerSave();
  } else if(selectedConn) {
    connections=connections.filter(c=>c.id!==selectedConn.id);
    selectConnObj(null); saveHist(); draw(); triggerSave();
  }
}

function duplicateNode() {
  if(!selectedNode) return;
  const clone=JSON.parse(JSON.stringify(selectedNode));
  clone.id=`n${nodeIdCtr++}`; clone.x+=30; clone.y+=30;
  nodes.push(clone); selectNodeObj(clone); saveHist(); draw(); triggerSave();
}

function fitAllNodes() {
  if(nodes.length===0) return;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  nodes.forEach(n=>{ minX=Math.min(minX,n.x); minY=Math.min(minY,n.y); maxX=Math.max(maxX,n.x+n.width); maxY=Math.max(maxY,n.y+n.height); });
  const pw=W-40, ph=H-80;
  const zoom=Math.min(pw/(maxX-minX+80),ph/(maxY-minY+80),1.5);
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  camera.zoom=zoom; camera.x=W/2-cx*zoom; camera.y=H/2-cy*zoom;
  draw();
}

// ─── EMOJI PICKER ────────────────────────────────────────────────
const emojis=['✨','🎯','💡','🚀','📝','📊','📁','🔍','⚙️','💻','📱','🎨','🎭','🎪','🎬','📷','📚','📖','💰','📈','📉','🗃️','📋','📌','⚡','🌟','🔮','🎲','🏆','🎁','🌈','🔥','💎','🛡️','⚔️','🌍','🏔️','🌊','🎵','🎶','🔔','📞','✉️','🖥️','⌨️','🖱️','🔑','🗝️','🔒','💡','🧩','🔧','🛠️','⚗️','🧪','🧬','🏗️','🏢'];

function openEmojiPicker(targetEl) {
  const picker=document.getElementById('emoji-picker');
  const grid=document.getElementById('emoji-grid');
  grid.innerHTML='';
  emojis.forEach(em=>{
    const it=document.createElement('div'); it.className='emoji-item'; it.textContent=em;
    it.onclick=()=>{
      if(selectedNode){ selectedNode.emoji=em; updatePanel(); saveHist(); draw(); triggerSave(); }
      picker.classList.remove('show');
    };
    grid.appendChild(it);
  });
  const rect=targetEl.getBoundingClientRect();
  picker.style.left=rect.left+'px'; picker.style.top=(rect.bottom+4)+'px';
  picker.classList.add('show');
}

document.addEventListener('click',e=>{
  if(!e.target.closest('#emoji-picker')&&!e.target.closest('#rp-icon-change-btn')&&!e.target.closest('#rp-icon-preview'))
    document.getElementById('emoji-picker').classList.remove('show');
});
