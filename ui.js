// ─── TOOLBAR & UI EVENTS ─────────────────────────────────────────
document.querySelectorAll('.sidebar-tool').forEach(btn=>{
  btn.addEventListener('click',()=>{
    mode=btn.dataset.mode;
    document.querySelectorAll('.sidebar-tool').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    if(mode==='select') cvs.style.cursor='default';
    else if(mode==='hand') cvs.style.cursor='grab';
    else cvs.style.cursor='crosshair';
  });
});

document.getElementById('btn-undo').onclick=undo;
document.getElementById('btn-redo').onclick=redo;
document.getElementById('btn-dark').onclick=()=>{
  settings.theme=settings.theme==='dark'?'light':'dark';
  applySettings(); draw(); triggerSave();
};
document.getElementById('btn-search-top').onclick=()=>{ const sb=document.getElementById('search-bar'); sb.classList.toggle('show'); if(sb.classList.contains('show')) document.getElementById('search-inp').focus(); };
document.getElementById('btn-settings').onclick=()=>{ document.getElementById('settings-modal').classList.add('show'); document.getElementById('overlay').classList.add('show'); };
document.getElementById('btn-projects').onclick=()=>{ showDashboard(); };
document.getElementById('sm-close').onclick=()=>{ document.getElementById('settings-modal').classList.remove('show'); document.getElementById('overlay').classList.remove('show'); };

document.getElementById('btn-new').onclick=()=>{
  mode='card';
  document.querySelectorAll('.sidebar-tool').forEach(b=>b.classList.remove('on'));
  document.getElementById('tool-card').classList.add('on');
  cvs.style.cursor='copy';
};

// Zoom controls
document.getElementById('btn-zoom-in').onclick=()=>{ camera.zoom=Math.min(4,camera.zoom*1.2); draw(); };
document.getElementById('btn-zoom-out').onclick=()=>{ camera.zoom=Math.max(0.1,camera.zoom/1.2); draw(); };
document.getElementById('btn-fit').onclick=fitAllNodes;
document.getElementById('btn-export').onclick=()=>{
  document.getElementById('settings-modal').classList.add('show');
  document.getElementById('overlay').classList.add('show');
  document.querySelectorAll('.sm-tab').forEach(t=>t.classList.remove('on'));
  document.querySelectorAll('.sm-section').forEach(s=>s.classList.remove('on'));
  document.querySelector('.sm-tab[data-stab="export"]').classList.add('on');
  document.querySelector('.sm-section[data-ssec="export"]').classList.add('on');
};

// Bottom bar
document.getElementById('bb-delete').onclick=deleteSelected;
document.getElementById('bb-copy').onclick=duplicateNode;
document.getElementById('bb-minimize').onclick=()=>{ if(selectedNode){ selectedNode.minimized=!selectedNode.minimized; saveHist(); draw(); triggerSave(); } };
document.getElementById('bb-lock').onclick=()=>{ if(selectedNode){selectedNode.locked=!selectedNode.locked; saveHist(); draw();} };
document.getElementById('bb-up').onclick=()=>{ if(selectedNode){nodes=nodes.filter(n=>n.id!==selectedNode.id).concat(selectedNode); draw();} };

// Right panel events
document.querySelectorAll('.rpanel-tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.rpanel-tab').forEach(t=>t.classList.remove('on'));
    document.querySelectorAll('.rpanel-tab-content').forEach(c=>c.style.display='none');
    tab.classList.add('on');
    document.getElementById('tab-'+tab.dataset.tab).style.display='block';
  });
});

document.getElementById('rp-title').addEventListener('input',e=>{
  if(selectedNode){selectedNode.title=e.target.value; draw(); triggerSave();}
});
document.getElementById('rp-note').addEventListener('input',e=>{
  if(selectedNode){selectedNode.note=e.target.value; draw(); triggerSave();}
});
document.getElementById('rp-type-select').addEventListener('change',e=>{
  if(selectedNode){selectedNode.type=e.target.value; updatePanel(); saveHist(); draw(); triggerSave();}
});
document.getElementById('rp-icon-preview').addEventListener('click',e=>openEmojiPicker(e.target));
document.getElementById('rp-icon-change-btn').addEventListener('click',e=>openEmojiPicker(e.target));

['width','height','iconsize','iconx','icony','textsize','notesize'].forEach(prop=>{
  const slider=document.getElementById(`rp-${prop}-slider`);
  const val=document.getElementById(`rp-${prop}-val`);
  slider.addEventListener('input',()=>{
    if(!selectedNode) return;
    if(prop==='width') selectedNode.width=+slider.value;
    else if(prop==='height') selectedNode.height=+slider.value;
    else if(prop==='iconsize') selectedNode.iconSize=+slider.value;
    else if(prop==='iconx') selectedNode.iconX=+slider.value;
    else if(prop==='icony') selectedNode.iconY=+slider.value;
    else if(prop==='textsize') selectedNode.textSize=+slider.value;
    else if(prop==='notesize') selectedNode.noteSize=+slider.value;
    val.textContent=slider.value+'px';
    draw(); triggerSave();
  });
});

document.getElementById('rp-bw-slider').addEventListener('input',e=>{
  if(selectedNode){selectedNode.borderWidth=+e.target.value; document.getElementById('rp-bw-val').textContent=e.target.value+'px'; draw(); triggerSave();}
});

document.getElementById('rp-bold-btn').onclick=()=>{ if(selectedNode){selectedNode.textBold = selectedNode.textBold===false; updatePanel(); draw(); triggerSave();} };
document.getElementById('rp-italic-btn').onclick=()=>{ if(selectedNode){selectedNode.textItalic = !selectedNode.textItalic; updatePanel(); draw(); triggerSave();} };
document.getElementById('rp-underline-btn').onclick=()=>{ if(selectedNode){selectedNode.textUnderline = !selectedNode.textUnderline; updatePanel(); draw(); triggerSave();} };
// Alinhamento L/C/R
['left','center','right'].forEach(a=>{
  document.getElementById('rp-align-'+a+'-btn')?.addEventListener('click',()=>{
    if(!selectedNode)return;
    selectedNode.textAlign=a;
    ['left','center','right'].forEach(x=>document.getElementById('rp-align-'+x+'-btn')?.classList.remove('on'));
    document.getElementById('rp-align-'+a+'-btn').classList.add('on');
    saveHist();draw();triggerSave();
  });
});
// Auto / Manual
function setTextMode(manual){
  document.getElementById('rp-text-auto-btn')?.classList.toggle('on',!manual);
  document.getElementById('rp-text-manual-btn')?.classList.toggle('on',manual);
  const mc=document.getElementById('rp-text-manual-controls');
  const ai=document.getElementById('rp-text-auto-info');
  if(mc)mc.style.display=manual?'block':'none';
  if(ai)ai.style.display=manual?'none':'block';
  if(selectedNode){selectedNode.textManual=manual;saveHist();draw();triggerSave();}
}
document.getElementById('rp-text-auto-btn')?.addEventListener('click',()=>setTextMode(false));
document.getElementById('rp-text-manual-btn')?.addEventListener('click',()=>setTextMode(true));
// Sliders manuais
document.getElementById('rp-textpadtop-slider')?.addEventListener('input',e=>{
  if(!selectedNode)return; selectedNode.textPadTop=+e.target.value;
  document.getElementById('rp-textpadtop-val').textContent=e.target.value+'px'; draw();triggerSave();
});
document.getElementById('rp-textpadtop-slider')?.addEventListener('change',()=>saveHist());
document.getElementById('rp-textpadleft-slider')?.addEventListener('input',e=>{
  if(!selectedNode)return; selectedNode.textPadLeft=+e.target.value;
  document.getElementById('rp-textpadleft-val').textContent=e.target.value+'px'; draw();triggerSave();
});
document.getElementById('rp-textpadleft-slider')?.addEventListener('change',()=>saveHist());
document.getElementById('rp-icon-bg-toggle').onclick=()=>{ if(selectedNode){selectedNode.iconBg = !selectedNode.iconBg; updatePanel(); draw(); triggerSave();} };
document.getElementById('rp-image-btn').onclick=()=>document.getElementById('image-file').click();
document.getElementById('rp-remove-image-btn').onclick=()=>{ if(selectedNode){selectedNode.imageUrl=null; selectedNode.imgObj=null; draw(); triggerSave();} };
document.getElementById('image-file').addEventListener('change',e=>{
  const f=e.target.files[0]; if(!f || !selectedNode) return;
  const r=new FileReader();
  r.onload=ev=>{ selectedNode.imageUrl=ev.target.result; loadNodeImage(selectedNode); saveHist(); draw(); triggerSave(); };
  r.readAsDataURL(f);
  e.target.value='';
});

const rpBgOpacitySlider = document.getElementById('rp-bg-opacity-slider');
if(rpBgOpacitySlider){
  rpBgOpacitySlider.addEventListener('input',()=>{
    if(!selectedNode) return;
    selectedNode.bgOpacity = Number(rpBgOpacitySlider.value);
    const v=document.getElementById('rp-bg-opacity-val');
    if(v) v.textContent = Math.round(selectedNode.bgOpacity*100)+'%';
    draw(); triggerSave();
  });
  rpBgOpacitySlider.addEventListener('change',()=>{ if(selectedNode && typeof saveHist==='function') saveHist(); });
}

document.querySelectorAll('#rp-bg-swatches .rpanel-swatch').forEach(s=>{
  s.addEventListener('click',()=>{
    if(!selectedNode) return;
    selectedNode.bgColor=s.dataset.bg||'none';
    if(selectedNode.bgOpacity === undefined) selectedNode.bgOpacity = 1;
    document.querySelectorAll('#rp-bg-swatches .rpanel-swatch').forEach(x=>x.classList.remove('on')); s.classList.add('on');
    saveHist(); draw(); triggerSave();
  });
});
document.querySelectorAll('#rp-border-swatches .rpanel-swatch').forEach(s=>{
  s.addEventListener('click',()=>{
    if(!selectedNode) return;
    selectedNode.borderColor=s.dataset.border||'none';
    document.querySelectorAll('#rp-border-swatches .rpanel-swatch').forEach(x=>x.classList.remove('on')); s.classList.add('on');
    saveHist(); draw(); triggerSave();
  });
});
document.querySelectorAll('#rp-text-swatches .rpanel-swatch').forEach(s=>{
  s.addEventListener('click',()=>{
    if(!selectedNode) return;
    selectedNode.textColor=s.dataset.tc||'#1a1a18';
    document.querySelectorAll('#rp-text-swatches .rpanel-swatch').forEach(x=>x.classList.remove('on')); s.classList.add('on');
    saveHist(); draw(); triggerSave();
  });
});

// Actions modal
document.getElementById('rp-add-action-btn').onclick=()=>{
  if(!selectedNode) return;
  document.getElementById('action-dest').value='';
  document.getElementById('modal-action').classList.add('show');
  document.getElementById('overlay').classList.add('show');
};
document.getElementById('action-cancel').onclick=()=>{ document.getElementById('modal-action').classList.remove('show'); document.getElementById('overlay').classList.remove('show'); };
document.getElementById('action-ok').onclick=()=>{
  if(!selectedNode) return;
  const type=document.getElementById('action-type').value;
  const dest=document.getElementById('action-dest').value.trim();
  if(!dest) return;
  selectedNode.actions.push({type,dest});
  renderActionsList(selectedNode); saveHist(); draw(); triggerSave();
  document.getElementById('modal-action').classList.remove('show');
  document.getElementById('overlay').classList.remove('show');
};

// ── FUNÇÕES AUXILIARES DE MODAIS ──
function showModal(modalId) {
  document.getElementById(modalId).classList.add('show');
  document.getElementById('overlay').classList.add('show');
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
  document.getElementById('overlay').classList.remove('show');
}

// ── MODAL DE FORMAS ──
document.querySelectorAll('.shape-option').forEach(opt=>{
  opt.onclick=()=>{
    if(!selectedNode) return;
    selectedNode.shapeType=opt.dataset.shape;
    selectedNode.shape=opt.dataset.shape; // compatibilidade
    saveHist(); draw(); triggerSave();
    hideModal('modal-shapes');
  };
});
document.getElementById('shapes-cancel').onclick=()=>{ hideModal('modal-shapes'); };

// ── MODAL DE ESTILOS ──
document.querySelectorAll('.style-option').forEach(opt=>{
  opt.onclick=()=>{
    if(!selectedNode) return;
    const style=opt.dataset.style;
    selectedNode.stylePreset=style;
    // Aplicar preset de estilo
    applyStylePreset(selectedNode, style);
    saveHist(); draw(); triggerSave();
    hideModal('modal-styles');
  };
});
document.getElementById('styles-cancel').onclick=()=>{ hideModal('modal-styles'); };

function applyStylePreset(node, preset) {
  switch(preset) {
    case 'clean':
      node.bgColor='#ffffff'; node.borderColor='#e5e7eb'; node.borderWidth=1; node.opacity=1; node.glow=0;
      break;
    case 'minimal':
      node.bgColor='#f9fafb'; node.borderColor='#d1d5db'; node.borderWidth=1; node.shadowIntensity=0.5;
      break;
    case 'neon':
      node.bgColor='#1a1a1a'; node.borderColor='#00ffff'; node.borderWidth=2; node.glow=10; node.glowColor='#00ffff';
      break;
    case 'futuristic':
      node.gradient={from:'#667eea',to:'#764ba2',angle:135}; node.borderColor='#764ba2'; node.borderWidth=2;
      break;
    case 'glassmorphism':
      node.bgColor='rgba(255,255,255,0.1)'; node.blur=10; node.borderColor='rgba(255,255,255,0.2)'; node.borderWidth=1;
      break;
    case 'darktech':
      node.bgColor='#1a1a1a'; node.borderColor='#333'; node.shadowIntensity=2;
      break;
    case '3d':
      node.bgColor='#e6e6e6'; node.borderColor='transparent'; node.shadowIntensity=3;
      break;
    case 'soft':
      node.bgColor='#ffffff'; node.borderColor='#e5e7eb'; node.shadowIntensity=2;
      break;
    case 'cyberpunk':
      node.bgColor='#000'; node.borderColor='#ff00de'; node.glow=15; node.glowColor='#ff00de';
      break;
    case 'terminal':
      node.bgColor='#0d1117'; node.borderColor='#30a14e'; node.borderWidth=1; node.glow=5; node.glowColor='#30a14e';
      break;
    case 'material':
      node.bgColor='#ffffff'; node.borderColor='transparent'; node.borderWidth=0; node.shadowIntensity=2;
      break;
    case 'outline':
      node.bgColor='none'; node.borderColor=cssVar('--border2'); node.borderWidth=2; node.glow=0;
      break;
  }
}

// ── MODAL DE WORMHOLES ──
document.getElementById('wormhole-cancel').onclick=()=>{ hideModal('modal-wormhole'); };
document.getElementById('wormhole-ok').onclick=()=>{
  if(!selectedNode) return;
  const type=document.getElementById('wormhole-type').value;
  const target=document.getElementById('wormhole-target').value.trim();
  const label=document.getElementById('wormhole-label').value.trim();
  if(!target||!label) return;
  selectedNode.wormholes=selectedNode.wormholes||[];
  selectedNode.wormholes.push({type,target,label});
  saveHist(); draw(); triggerSave();
  hideModal('modal-wormhole');
};

// ── MODAL DE PROJETOS ──
document.getElementById('new-project-btn').onclick=()=>{
  const name=prompt('Nome do novo projeto:');
  if(!name||!name.trim()) return;
  const id='project_'+Date.now();
  workspaces[id]={nodes:[],connections:[],camera:{x:0,y:0,zoom:1},name:name.trim()};
  updateProjectsList();
  triggerSave();
};
document.getElementById('projects-close').onclick=()=>{ hideModal('modal-projects'); };

function updateProjectsList() {
  const list=document.getElementById('projects-list');
  list.innerHTML='';
  Object.keys(workspaces).forEach(key=>{
    const w=workspaces[key];
    const div=document.createElement('div');
    div.style.cssText='padding:10px;border:1px solid var(--border);border-radius:6px;margin-bottom:8px;cursor:pointer;';
    div.innerHTML=`<div style="font-weight:500;">${w.name||key}</div><div style="font-size:11px;color:var(--text3);">${(w.nodes||[]).length} cards</div>`;
    div.onclick=()=>{
      workspaces[currentLevel]={nodes:[...nodes],connections:[...connections],camera:{...camera}};
      currentLevel=key;
      const ws=workspaces[key];
      nodes=ws.nodes||[]; connections=ws.connections||[]; camera=ws.camera||{x:0,y:0,zoom:1};
      selectNodeObj(null); saveHist(); draw(); triggerSave(); updateBreadcrumb();
      hideModal('modal-projects');
    };
    list.appendChild(div);
  });
}

// Conn panel events
document.getElementById('rp-conn-style').addEventListener('change',e=>{
  if(selectedConn){selectedConn.style=e.target.value; draw(); triggerSave();}
});
document.getElementById('rp-conn-width').addEventListener('input',e=>{
  if(selectedConn){selectedConn.width=+e.target.value; document.getElementById('rp-conn-width-val').textContent=e.target.value+'px'; draw(); triggerSave();}
});
document.getElementById('rp-conn-opacity').addEventListener('input',e=>{
  if(selectedConn){selectedConn.opacity=+e.target.value; document.getElementById('rp-conn-opacity-val').textContent=Math.round(e.target.value*100)+'%'; draw(); triggerSave();}
});
document.getElementById('rp-conn-curve').addEventListener('input',e=>{
  if(selectedConn){selectedConn.curve=+e.target.value; document.getElementById('rp-conn-curve-val').textContent=e.target.value; draw(); triggerSave();}
});
document.querySelectorAll('.cdot').forEach(d=>{
  d.addEventListener('click',()=>{
    if(selectedConn){selectedConn.color=d.dataset.cc; document.querySelectorAll('.cdot').forEach(x=>x.classList.remove('on')); d.classList.add('on'); draw(); triggerSave();}
  });
});
document.getElementById('rp-delete-conn-btn').onclick=()=>{ deleteSelected(); };

// Settings modal tabs
document.querySelectorAll('.sm-tab').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('.sm-tab').forEach(x=>x.classList.remove('on'));
    document.querySelectorAll('.sm-section').forEach(x=>x.classList.remove('on'));
    t.classList.add('on');
    document.querySelector(`.sm-section[data-ssec="${t.dataset.stab}"]`).classList.add('on');
  });
});

// Toggles in settings
function wireToggle(id, key) {
  const el=document.getElementById(id);
  if(!el) return;
  el.addEventListener('click',()=>{
    settings[key]=!settings[key];
    el.classList.toggle('on',settings[key]);
    applySettings(); draw(); triggerSave();
  });
}
wireToggle('toggle-grid','showGrid');
wireToggle('toggle-shadows','showShadows');
wireToggle('toggle-auto-minimize','autoMinimize');
wireToggle('toggle-arrows','showArrows');
wireToggle('toggle-highlight-conn','highlightConn');
wireToggle('toggle-autosave','autoSave');
wireToggle('toggle-restore','autoRestore');

document.querySelectorAll('.theme-opt').forEach(o=>{
  o.addEventListener('click',()=>{settings.theme=o.dataset.theme; applySettings(); draw(); triggerSave();});
});

document.getElementById('default-conn-style').addEventListener('change',e=>{
  settings.defaultConnStyle=e.target.value; triggerSave();
});

document.getElementById('clear-save-btn').onclick=()=>{ if(confirm('Limpar dados?')){localStorage.removeItem('myspace-v2'); alert('Limpo!');} };

document.getElementById('btn-export-json').onclick=()=>{
  workspaces[currentLevel]={nodes:[...nodes],connections:[...connections],camera:{...camera}};
  const d=JSON.stringify({workspaces,currentLevel,navStack,settings},null,2);
  const a=document.createElement('a'); a.href='data:application/json,'+encodeURIComponent(d); a.download='myspace.json'; a.click();
};
document.getElementById('btn-import-json').onclick=()=>document.getElementById('import-file').click();
document.getElementById('import-file').addEventListener('change',e=>{
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader(); r.onload=ev=>{
    try{const d=JSON.parse(ev.target.result); if(d.workspaces){workspaces=d.workspaces;currentLevel=d.currentLevel||'root';navStack=d.navStack||[];settings={...settings,...(d.settings||{})};const w=workspaces[currentLevel]||workspaces.root;nodes=w.nodes||[];connections=w.connections||[];camera=w.camera||{x:0,y:0,zoom:1};updateBreadcrumb();applySettings();}else{nodes=d.nodes||[];connections=d.connections||[];camera=d.camera||{x:0,y:0,zoom:1};}hydrateImages();saveHist();draw();triggerSave();}catch(err){alert('Arquivo inválido');}
  }; r.readAsText(f);
});

// Search
let searchRes=[], searchIdx=0;
document.getElementById('search-inp').addEventListener('input',e=>{
  const q=e.target.value.toLowerCase().trim();
  if(!q){searchRes=[];draw();return;}
  searchRes=nodes.filter(n=>n.title.toLowerCase().includes(q)||n.note.toLowerCase().includes(q));
  searchIdx=0;
  if(searchRes.length>0){selectNodeObj(searchRes[0]);camera.x=W/2-searchRes[0].x*camera.zoom;camera.y=H/2-searchRes[0].y*camera.zoom;draw();}
});
document.getElementById('search-next').onclick=()=>{ if(!searchRes.length)return; searchIdx=(searchIdx+1)%searchRes.length; const n=searchRes[searchIdx];selectNodeObj(n);camera.x=W/2-n.x*camera.zoom;camera.y=H/2-n.y*camera.zoom;draw(); };
document.getElementById('search-prev').onclick=()=>{ if(!searchRes.length)return; searchIdx=(searchIdx-1+searchRes.length)%searchRes.length;const n=searchRes[searchIdx];selectNodeObj(n);camera.x=W/2-n.x*camera.zoom;camera.y=H/2-n.y*camera.zoom;draw(); };
document.getElementById('search-close').onclick=()=>{ document.getElementById('search-bar').classList.remove('show'); searchRes=[]; draw(); };

// Keyboard
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT') return;
  if(e.ctrlKey||e.metaKey) {
    if(e.key==='z'){e.preventDefault();undo();}
    if(e.key==='y'||e.key==='Z'){e.preventDefault();redo();}
    if(e.key==='d'){e.preventDefault();duplicateNode();}
    if(e.key==='f'){e.preventDefault();document.getElementById('btn-search-top').click();}
  }
  if(e.key==='Delete'||e.key==='Backspace') deleteSelected();
  if(e.key==='Escape'){selectNodeObj(null);selectConnObj(null);commitInlineEdit();mode='select';document.querySelectorAll('.sidebar-tool').forEach(b=>b.classList.remove('on'));document.getElementById('tool-select').classList.add('on');cvs.style.cursor='default';draw();}
  if(e.key==='v'&&!e.ctrlKey){document.getElementById('tool-select').click();}
  if(e.key==='c'&&!e.ctrlKey){document.getElementById('tool-card').click();}
  if(e.key==='f'&&!e.ctrlKey){document.getElementById('tool-folder').click();}
  if(e.key==='n'&&!e.ctrlKey){document.getElementById('tool-note').click();}
  if(e.key==='l'&&!e.ctrlKey){document.getElementById('tool-connect').click();}
  if(e.key==='h'&&!e.ctrlKey){document.getElementById('tool-hand').click();}
  if(e.key==='i'&&!e.ctrlKey){document.getElementById('tool-image').click();}

  // ── Redimensionar com teclado (card selecionado + não editando) ──
  if(selectedNode && !selectedNode.locked && !inlineEditing) {
    if(e.key==='=' || e.key==='+') {
      e.preventDefault();
      selectedNode.width += 20; selectedNode.height += 20;
      saveHist(); draw(); triggerSave(); updatePanel();
    }
    if(e.key==='-' || e.key==='_') {
      e.preventDefault();
      selectedNode.width  = Math.max(selectedNode.type==='icon'?24:80, selectedNode.width  - 20);
      selectedNode.height = Math.max(selectedNode.type==='icon'?24:50, selectedNode.height - 20);
      saveHist(); draw(); triggerSave(); updatePanel();
    }
    if(e.shiftKey && (e.key==='+' || e.key==='=')) {
      e.preventDefault();
      selectedNode.iconSize = Math.min(200, (selectedNode.iconSize||28) + 4);
      saveHist(); draw(); triggerSave(); updatePanel();
    }
    if(e.shiftKey && e.key==='-') {
      e.preventDefault();
      selectedNode.iconSize = Math.max(10, (selectedNode.iconSize||28) - 4);
      saveHist(); draw(); triggerSave(); updatePanel();
    }
  }
  if(e.key==='w'&&!e.ctrlKey){document.getElementById('tool-wormhole').click();}
});

// ══════════════════════════════════════════════════════════════
// ── DASHBOARD DE PROJETOS ────────────────────────────────────
// ══════════════════════════════════════════════════════════════

function showDashboard() {
  document.getElementById('project-dashboard').style.display = 'block';
  document.getElementById('topbar').style.display = 'none';
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('canvas-wrap').style.display = 'none';
  document.getElementById('right-panel').style.display = 'none';
  document.getElementById('bottom-bar').style.display = 'none';
  document.getElementById('status-bar').style.display = 'none';
  renderDashboardProjects();
}

function hideDashboard() {
  document.getElementById('project-dashboard').style.display = 'none';
  document.getElementById('topbar').style.display = 'flex';
  document.getElementById('sidebar').style.display = 'flex';
  document.getElementById('canvas-wrap').style.display = 'block';
  document.getElementById('right-panel').style.display = 'block';
  document.getElementById('bottom-bar').style.display = 'flex';
  document.getElementById('status-bar').style.display = 'block';
}

function escapeHtml(txt) {
  return String(txt ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}

function renderDashboardProjects() {
  const grid = document.getElementById('dash-projects-grid');
  if(!grid) return;
  
  grid.innerHTML = '';
  
  Object.keys(workspaces).forEach(key => {
    const ws = workspaces[key];
    const name = ws.name || (key === 'root' ? 'Início' : key);
    const nodeCount = (ws.nodes || []).length;
    const connCount = (ws.connections || []).length;
    const icon = key === 'root' ? '🏠' : '📁';
    
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.projectId = key;
    card.innerHTML = `
      <div class="project-card-header">
        <div class="project-card-icon">${icon}</div>
        <button class="project-card-menu" title="Opções do projeto"><i class="ti ti-dots-vertical"></i></button>
      </div>
      <div class="project-card-name">${escapeHtml(name)}</div>
      <div class="project-card-meta">
        <div class="project-card-stat"><i class="ti ti-layout-cards"></i>${nodeCount}</div>
        <div class="project-card-stat"><i class="ti ti-line"></i>${connCount}</div>
      </div>
    `;
    
    card.onclick = (e) => {
      const menuBtn = e.target.closest('.project-card-menu');
      if(menuBtn) { e.stopPropagation(); showProjectMenu(key, menuBtn); return; }
      openProjectFromDashboard(key);
    };
    
    grid.appendChild(card);
  });
}

function persistCurrentWorkspaceState() {
  const old = workspaces[currentLevel] || {};
  workspaces[currentLevel] = { ...old, nodes:[...nodes], connections:[...connections], camera:{...camera} };
}

function showProjectMenu(projectId, anchor) {
  const menu = document.getElementById('project-card-menu-popover');
  if(!menu) return;
  const isRoot = projectId === 'root';
  menu.innerHTML = `
    <div class="project-menu-item" data-action="open"><i class="ti ti-folder-open"></i><span>Abrir / editar</span></div>
    <div class="project-menu-item" data-action="rename"><i class="ti ti-edit"></i><span>Renomear</span></div>
    <div class="project-menu-item danger ${isRoot ? 'disabled' : ''}" data-action="delete"><i class="ti ti-trash"></i><span>Excluir</span></div>
  `;
  const r = anchor.getBoundingClientRect();
  menu.style.left = Math.min(r.left, window.innerWidth - 190) + 'px';
  menu.style.top = (r.bottom + 6) + 'px';
  menu.classList.add('show');
  menu.onclick = (ev) => {
    const item = ev.target.closest('.project-menu-item');
    if(!item || item.classList.contains('disabled')) return;
    const action = item.dataset.action;
    hideProjectMenu();
    if(action === 'open') openProjectFromDashboard(projectId);
    if(action === 'rename') renameDashboardProject(projectId);
    if(action === 'delete') deleteDashboardProject(projectId);
  };
}

function hideProjectMenu() {
  const menu = document.getElementById('project-card-menu-popover');
  if(menu) menu.classList.remove('show');
}

document.addEventListener('click', e => {
  if(!e.target.closest('#project-card-menu-popover') && !e.target.closest('.project-card-menu')) hideProjectMenu();
});

function renameDashboardProject(projectId) {
  const ws = workspaces[projectId];
  if(!ws) return;
  const currentName = ws.name || (projectId === 'root' ? 'Início' : projectId);
  const newName = prompt('Novo nome do projeto:', currentName);
  if(!newName || !newName.trim()) return;
  ws.name = newName.trim();
  renderDashboardProjects();
  updateBreadcrumb();
  triggerSave();
}

function deleteDashboardProject(projectId) {
  if(projectId === 'root') { alert('O projeto inicial não pode ser excluído.'); return; }
  const ws = workspaces[projectId];
  if(!ws) return;
  const name = ws.name || projectId;
  if(!confirm(`Excluir o projeto "${name}"? Essa ação não pode ser desfeita.`)) return;
  delete workspaces[projectId];
  if(currentLevel === projectId) {
    currentLevel = 'root';
    navStack = [];
    const root = workspaces.root || {nodes:[], connections:[], camera:{x:0,y:0,zoom:1}, name:'Início'};
    workspaces.root = root;
    nodes = root.nodes || [];
    connections = root.connections || [];
    camera = root.camera || {x:0,y:0,zoom:1};
    selectNodeObj(null);
    draw();
  }
  renderDashboardProjects();
  updateBreadcrumb();
  triggerSave();
}

function openProjectFromDashboard(projectId) {
  navigateToProject(projectId);
  hideDashboard();
}

function createNewProject() {
  const name = prompt('Nome do novo projeto:');
  if(!name || !name.trim()) return;
  
  const id = 'project_' + Date.now();
  workspaces[id] = {
    nodes: [],
    connections: [],
    camera: {x:0, y:0, zoom:1},
    name: name.trim()
  };
  
  renderDashboardProjects();
  triggerSave();
}

// Event handlers do dashboard
document.getElementById('dash-new-project').onclick = createNewProject;
document.getElementById('dash-settings').onclick = () => {
  hideDashboard();
  document.getElementById('btn-settings').click();
};
