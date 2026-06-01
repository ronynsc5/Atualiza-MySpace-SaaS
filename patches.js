

</script>
<script>
(function professionalBehaviorPatch(){
  'use strict';
  const oldCreateNode = window.createNode || createNode;
  const oldDraw = window.draw || draw;
  const NOTE_TYPES = new Set(['note']);
  const FOLDER_TYPES = new Set(['folder']);

  function ensurePatchCss(){
    if(document.getElementById('professional-behavior-patch-css')) return;
    const st=document.createElement('style');
    st.id='professional-behavior-patch-css';
    st.textContent=`
      #note-window{position:fixed;z-index:2200;right:32px;top:84px;width:min(520px,calc(100vw - 64px));height:min(620px,calc(100vh - 120px));background:var(--bg);border:1px solid var(--border);border-radius:14px;box-shadow:0 20px 70px var(--shadow2);display:none;flex-direction:column;overflow:hidden;}
      #note-window.show{display:flex;}
      #note-window .nw-hdr{height:48px;display:flex;align-items:center;gap:10px;padding:0 14px;border-bottom:1px solid var(--border);background:var(--bg2);cursor:move;}
      #note-window .nw-icon{font-size:21px;line-height:1;}
      #note-window .nw-title{flex:1;border:0;background:transparent;color:var(--text);font:600 14px Inter,sans-serif;outline:0;min-width:0;}
      #note-window .nw-close{border:0;background:transparent;color:var(--text3);font-size:20px;cursor:pointer;padding:6px;border-radius:7px;}
      #note-window .nw-close:hover{background:var(--bg3);color:var(--text);}
      #note-window .nw-body{flex:1;display:flex;min-height:0;background:var(--bg);}
      #note-window .nw-text{flex:1;width:100%;height:100%;resize:none;border:0;outline:0;padding:18px 20px;font:14px/1.6 Inter,sans-serif;color:var(--text);background:var(--bg);overflow:auto;}
      .rpanel-conn-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;}
      .rpanel-conn-grid label{font-size:11px;color:var(--text3);display:block;margin-bottom:4px;}
      @media(max-width:760px){#note-window{left:12px;right:12px;top:68px;width:auto;height:calc(100vh - 92px);}}
    `;
    document.head.appendChild(st);
  }

  function ensureNoteWindow(){
    ensurePatchCss();
    let nw=document.getElementById('note-window');
    if(nw) return nw;
    nw=document.createElement('div');
    nw.id='note-window';
    nw.innerHTML=`<div class="nw-hdr"><span class="nw-icon">🗒️</span><input class="nw-title" id="nw-title"><button class="nw-close" id="nw-close" title="Fechar">×</button></div><div class="nw-body"><textarea class="nw-text" id="nw-text" placeholder="Escreva sua nota..."></textarea></div>`;
    document.body.appendChild(nw);
    document.getElementById('nw-close').onclick=()=>nw.classList.remove('show');
    document.getElementById('nw-title').addEventListener('input',e=>{ const n=getOpenNote(); if(n){ n.title=e.target.value; triggerSave(); draw(); }});
    document.getElementById('nw-text').addEventListener('input',e=>{ const n=getOpenNote(); if(n){ n.note=e.target.value; triggerSave(); }});
    return nw;
  }
  function getOpenNote(){ const id=document.getElementById('note-window')?.dataset.nodeId; return nodes.find(n=>n.id===id); }
  window.openNoteWindow=function(node){
    const nw=ensureNoteWindow();
    nw.dataset.nodeId=node.id;
    nw.querySelector('.nw-icon').textContent=node.emoji||'🗒️';
    nw.querySelector('#nw-title').value=node.title||'Nota';
    nw.querySelector('#nw-text').value=node.note||'';
    nw.classList.add('show');
    nw.querySelector('#nw-text').focus();
  };

  window.createNode=function(x,y,type='card'){
    const n=oldCreateNode(x,y,type);
    n.iconBg=false;
    n.bgColor = type==='card' ? 'none' : n.bgColor;
    n.borderColor = type==='card' ? 'none' : n.borderColor;
    if(type==='card') { n.emoji=''; n.iconOptional=true; n.width=220; n.height=140; }
    if(type==='folder') { n.emoji='📁'; n.bgColor='none'; n.borderColor='none'; n.borderWidth=0; n.width=112; n.height=94; n.title=n.title||'Nova Pasta'; }
    if(type==='note') { n.emoji='🗒️'; n.bgColor='none'; n.borderColor='none'; n.borderWidth=0; n.width=112; n.height=94; n.title=n.title||'Nota'; }
    if(type==='icon') { n.type='icon'; n.title=''; n.note=''; n.emoji='⭐'; n.bgColor='none'; n.borderColor='none'; n.borderWidth=0; n.width=58; n.height=58; n.iconSize=42; }
    return n;
  };

  function getTxColor(node){
    const bgFill = colorOf(node.bgColor, cssVar('--bg'));
    return readableTextColor(bgFill, colorOf(node.textColor, cssVar('--text')));
  }
  function drawIconOnly(node,isSel){
    const h=node.height, w=node.width, x=node.x, y=node.y;
    const icon=node.emoji || (node.type==='folder'?'📁':node.type==='note'?'🗒️':'⭐');
    const size=node.iconSize || (node.type==='icon'?42:44); // proporcional
    const title=String(node.title||'').trim();
    ctx.save();

    // seleção discreta: contorno só na área do ícone, nunca um card/fundo atrás dele
    if(isSel){
      ctx.strokeStyle='#3b82f6';
      ctx.lineWidth=1.5/camera.zoom;
      ctx.setLineDash([5/camera.zoom,4/camera.zoom]);
      roundRect(ctx,x+6/camera.zoom,y+4/camera.zoom,w-12/camera.zoom,Math.max(42/camera.zoom,h*0.62),10/camera.zoom);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ícone solto, sem fundo
    ctx.font=`${size}px Arial`;
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText(icon,x+w/2+(node.iconX||0),y+Math.min(h*0.44, 44/camera.zoom)+(node.iconY||0));

    // nome abaixo, estilo Windows, fora do corpo do ícone e com contraste legível
    if(node.type!=='icon' && title){
      const labelFont=(node.textSize||12)/camera.zoom;
      const labelY=y+Math.max(h*0.72, (node.iconSize||44) + 12);
      const maxLabelW=Math.max(46/camera.zoom,w+28/camera.zoom);
      ctx.font=`600 ${labelFont}px Inter`;
      ctx.textBaseline='top';
      ctx.textAlign='center';
      const label=fitText(ctx,title,maxLabelW);
      const bgLum=luminance(cssVar('--bg'));
      const labelColor=colorOf(node.textColor, bgLum < .45 ? '#ffffff' : '#111827');
      ctx.save();
      ctx.shadowColor='transparent';
      ctx.fillStyle=labelColor;
      ctx.fillText(label,x+w/2,labelY);
      ctx.restore();
    }

    if(node.locked){
      ctx.font=`${12/camera.zoom}px Arial`;
      ctx.textAlign='right';
      ctx.textBaseline='top';
      ctx.fillStyle='rgba(80,80,80,.65)';
      ctx.fillText('🔒',x+w-4/camera.zoom,y+2/camera.zoom);
    }
    if(isSel && !node.locked){ ctx.fillStyle='#3b82f6'; ctx.beginPath(); ctx.arc(x+w,y+h,5/camera.zoom,0,Math.PI*2); ctx.fill(); }
    ctx.restore();
  }
  function drawContainedCard(node,isSel,isMin){
    const h=isMin?44:node.height, w=node.width, x=node.x, y=node.y;
    renderShape(ctx,node,isSel,isMin);
    ctx.save();
    drawCardShape(ctx,{...node,height:h});
    ctx.clip();
    const pad=14/camera.zoom;
    const txCol=getTxColor(node);
    const titleSz=(node.textSize||13)/camera.zoom;
    const noteSz=(node.noteSize||11)/camera.zoom;
    let textY=y+pad;
    if(isMin){
      ctx.font=`600 ${titleSz}px Inter`; ctx.fillStyle=txCol; ctx.textBaseline='middle'; ctx.textAlign='left';
      ctx.fillText(fitText(ctx,node.title||'',w-pad*2),x+pad,y+h/2);
      ctx.restore(); return;
    }
    if(node.imageUrl && node.imgObj instanceof HTMLImageElement){
      const imgH=Math.min(h*0.42,h-52/camera.zoom);
      ctx.drawImage(node.imgObj,x+2/camera.zoom,y+2/camera.zoom,w-4/camera.zoom,imgH);
      textY=y+imgH+8/camera.zoom;
    }
    if(node.emoji || node.iconUrl){ renderIcon(ctx,node,false); textY += (node.iconSize||28)+8 + Math.max(0,node.iconY||0); }
    const cw=w-pad*2;
    const remaining=h-(textY-y)-pad;
    ctx.fillStyle=txCol; ctx.strokeStyle=txCol; ctx.textAlign=node.textAlign||'left'; ctx.textBaseline='top';
    const lx = ctx.textAlign==='center' ? x+w/2 : ctx.textAlign==='right' ? x+w-pad : x+pad;
    ctx.font=`${node.textItalic?'italic ':''}${node.textBold===false?500:700} ${titleSz}px Inter`;
    const titleLines=wrapLines(ctx,node.title||'',cw,Math.max(1,Math.floor(remaining/(titleSz+4/camera.zoom))));
    titleLines.forEach((ln,i)=>ctx.fillText(ln,lx,textY+i*(titleSz+4/camera.zoom)));
    textY += titleLines.length*(titleSz+4/camera.zoom)+6/camera.zoom;
    if(node.note){
      const maxLines=Math.max(0,Math.floor((y+h-pad-textY)/(noteSz+4/camera.zoom)));
      ctx.font=`${node.textItalic?'italic ':''}400 ${noteSz}px Inter`;
      wrapLines(ctx,node.note,cw,maxLines).forEach((ln,i)=>ctx.fillText(ln,lx,textY+i*(noteSz+4/camera.zoom)));
    }
    ctx.restore();
    if(isSel && !node.locked){ ctx.save(); ctx.fillStyle='#3b82f6'; ctx.beginPath(); ctx.arc(x+w,y+h,5/camera.zoom,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  }
  window.drawNode=function(node){
    if(inlineEditing && inlineEditing.id===node.id) return;
    if(node.imageUrl && !node.imgObj) loadNodeImage(node);
    const isSel=selectedNode && selectedNode.id===node.id;
    const isMin=node.minimized || (settings.autoMinimize && !isSel);
    if(node.type==='folder' || node.type==='note' || node.type==='icon') return drawIconOnly(node,isSel);
    return drawContainedCard(node,isSel,isMin);
  };

  // Área clicável inclui o nome abaixo do ícone, como em uma pasta do Windows
  const oldGetNodeAtLabelAware = window.getNodeAt || getNodeAt;
  window.getNodeAt=function(x,y){
    for(let i=nodes.length-1;i>=0;i--){
      const n=nodes[i];
      if(n.type==='folder'||n.type==='note'||n.type==='icon'){
        const labelExtra = n.title ? 28/camera.zoom : 0;
        if(x>=n.x-14/camera.zoom && x<=n.x+n.width+14/camera.zoom && y>=n.y && y<=n.y+n.height+labelExtra) return n;
      }
    }
    return oldGetNodeAtLabelAware(x,y);
  };

  function anchor(n,side){
    const h=n.minimized?44:n.height, x=n.x, y=n.y, w=n.width;
    if(side==='left') return [x,y+h/2];
    if(side==='right') return [x+w,y+h/2];
    if(side==='top') return [x+w/2,y];
    if(side==='bottom') return [x+w/2,y+h];
    return [x+w/2,y+h/2];
  }
  window.drawConn=function(conn){
    const from=nodes.find(n=>n.id===conn.from), to=nodes.find(n=>n.id===conn.to); if(!from||!to) return;
    const autoSide=(a,b)=> Math.abs((b.x+b.width/2)-(a.x+a.width/2)) > Math.abs((b.y+b.height/2)-(a.y+a.height/2)) ? ((b.x>a.x)?'right':'left') : ((b.y>a.y)?'bottom':'top');
    const [x1,y1]=anchor(from, conn.fromSide&&conn.fromSide!=='auto'?conn.fromSide:autoSide(from,to));
    const [x2,y2]=anchor(to, conn.toSide&&conn.toSide!=='auto'?conn.toSide:autoSide(to,from));
    const style=conn.style||settings.defaultConnStyle, lw=conn.width||2, col=conn.color==='default'||!conn.color?cssVar('--connection-color'):conn.color;
    const curve=conn.curve??70;
    ctx.save(); ctx.strokeStyle=(selectedConn&&selectedConn.id===conn.id)?'#f59e0b':col; ctx.lineWidth=lw/camera.zoom; ctx.globalAlpha=conn.opacity||1;
    if(style==='dashed') ctx.setLineDash([8/camera.zoom,5/camera.zoom]);
    ctx.beginPath();
    if(style==='straight'||style==='dashed'||style==='direct'){ ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); }
    else if(style==='curved'){ const dx=x2-x1,dy=y2-y1,len=Math.max(1,Math.hypot(dx,dy)),nx=-dy/len,ny=dx/len,mx=(x1+x2)/2,my=(y1+y2)/2; ctx.moveTo(x1,y1); ctx.quadraticCurveTo(mx+nx*curve,my+ny*curve,x2,y2); }
    else { const mid=conn.stepDistance? x1+(conn.stepDistance/camera.zoom) : (x1+x2)/2; ctx.moveTo(x1,y1); ctx.lineTo(mid,y1); ctx.lineTo(mid,y2); ctx.lineTo(x2,y2); }
    ctx.stroke(); ctx.setLineDash([]);
    if(settings.showArrows){ const ang=Math.atan2(y2-y1,x2-x1), as=9/camera.zoom; ctx.translate(x2,y2); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-as,-as/2.2); ctx.lineTo(-as,as/2.2); ctx.closePath(); ctx.fillStyle=ctx.strokeStyle; ctx.fill(); }
    ctx.restore();
  };

  // Clique simples abre nota/pasta; clique duplo continua funcionando também.
  let downInfo=null;
  cvs.addEventListener('mousedown',e=>{ downInfo={x:e.clientX,y:e.clientY,t:Date.now()}; },true);
  cvs.addEventListener('click',e=>{
    if(!downInfo || Math.hypot(e.clientX-downInfo.x,e.clientY-downInfo.y)>4) return;
    const rect=cvs.getBoundingClientRect();
    const mx=(e.clientX-rect.left-camera.x)/camera.zoom, my=(e.clientY-rect.top-camera.y)/camera.zoom;
    const n=getNodeAt(mx,my); if(!n) return;
    if(n.type==='note'){ e.preventDefault(); e.stopPropagation(); selectNodeObj(n); openNoteWindow(n); }
    if(n.type==='folder'){ e.preventDefault(); e.stopPropagation(); openFolder(n); }
  },true);

  const oldActivate=window.activateNode || activateNode;
  window.activateNode=function(node){ if(!node) return false; if(node.type==='note'){openNoteWindow(node); return true;} if(node.type==='folder'){openFolder(node); return true;} return oldActivate(node); };

  function migrateExisting(){
    (nodes||[]).forEach(n=>{
      n.iconBg=false;
      if(n.type==='card' && !n.userAddedIcon){ n.emoji=''; }
      if(n.type==='folder'){ n.emoji=n.emoji||'📁'; n.bgColor='none'; n.borderColor='none'; n.borderWidth=0; n.width=Math.max(96,Math.min(n.width||112,130)); n.height=Math.max(82,Math.min(n.height||94,112)); }
      if(n.type==='note'){ n.emoji=n.emoji||'🗒️'; n.bgColor='none'; n.borderColor='none'; n.borderWidth=0; n.width=Math.max(96,Math.min(n.width||112,130)); n.height=Math.max(82,Math.min(n.height||94,112)); }
    });
  }
  migrateExisting();

  // Corrige menu: adicionar ícone cria um ícone livre/filho, sem fundo.
  const addIcon=document.getElementById('ctx-add-icon');
  if(addIcon){ addIcon.onclick=()=>{ if(selectedNode){ const ic=window.createNode(selectedNode.x+selectedNode.width+16, selectedNode.y, 'icon'); ic.parentId=selectedNode.id; selectedNode.children=selectedNode.children||[]; selectedNode.children.push(ic.id); nodes.push(ic); selectNodeObj(ic); saveHist(); draw(); triggerSave(); } hideContextMenu(); }; }

  // Controles extras de direção da conexão.
  function ensureConnDirectionUI(){
    const tab=document.getElementById('tab-conn'); if(!tab || document.getElementById('rp-conn-from-side')) return;
    const sec=document.createElement('div'); sec.className='rpanel-section';
    sec.innerHTML=`<div class="rpanel-label">Direção da conexão</div><div class="rpanel-conn-grid"><div><label>Saída</label><select id="rp-conn-from-side" class="rpanel-input rpanel-select"><option value="auto">Auto</option><option value="left">Esquerda</option><option value="right">Direita</option><option value="top">Topo</option><option value="bottom">Base</option></select></div><div><label>Entrada</label><select id="rp-conn-to-side" class="rpanel-input rpanel-select"><option value="auto">Auto</option><option value="left">Esquerda</option><option value="right">Direita</option><option value="top">Topo</option><option value="bottom">Base</option></select></div></div>`;
    tab.insertBefore(sec, tab.firstChild);
    ['from','to'].forEach(k=>document.getElementById(`rp-conn-${k}-side`).addEventListener('change',e=>{ if(selectedConn){ selectedConn[k+'Side']=e.target.value; draw(); triggerSave(); }}));
  }
  ensureConnDirectionUI();
  const oldPopulate=window.populateConnPanel || populateConnPanel;
  window.populateConnPanel=function(conn){ oldPopulate(conn); ensureConnDirectionUI(); document.getElementById('rp-conn-from-side').value=conn.fromSide||'auto'; document.getElementById('rp-conn-to-side').value=conn.toSide||'auto'; };

  // Atualiza painel para deixar claro que ícone é opcional.
  const oldUpdatePanel=window.updatePanel || updatePanel;
  window.updatePanel=function(){ oldUpdatePanel(); if(selectedNode){ const prev=document.getElementById('rp-icon-preview'); if(prev){ prev.textContent=selectedNode.emoji || '—'; prev.title='Ícone opcional: vazio = sem ícone/fundo'; } } };

  draw(); triggerSave();
})();

</script>


<!-- PATCH: editor de texto profissional e anti-vazamento -->
<style id="professional-text-editor-patch">
  #inline-editor.pro-editor {
    position: fixed !important;
    z-index: 2500 !important;
    display: none;
    background: var(--bg);
    border: 1px solid var(--border2);
    border-radius: 14px;
    box-shadow: 0 18px 60px var(--shadow2);
    padding: 10px;
    pointer-events: auto;
    min-width: 280px;
    max-width: min(620px, calc(100vw - 28px));
    max-height: min(72vh, 620px);
    overflow: hidden;
  }
  #inline-editor.pro-editor.show { display: flex !important; flex-direction: column; gap: 8px; }
  .pro-editor-bar {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 2px 2px 8px; border-bottom: 1px solid var(--border);
    cursor: default; user-select: none;
  }
  .pro-editor-title { font-size: 12px; font-weight: 700; color: var(--text2); display: flex; align-items: center; gap: 6px; }
  .pro-editor-actions { display: flex; gap: 6px; }
  .pro-editor-btn {
    border: 1px solid var(--border); background: var(--bg2); color: var(--text);
    border-radius: 8px; padding: 7px 10px; font-size: 12px; font-weight: 600;
    font-family: 'Inter', sans-serif; cursor: pointer;
  }
  .pro-editor-btn:hover { background: var(--bg3); }
  .pro-editor-btn.primary { background: var(--accent); color: var(--bg); border-color: var(--accent); }
  #inline-title-input, #inline-note-input {
    display: block !important;
    background: var(--bg2) !important;
    border: 1px solid var(--border) !important;
    border-radius: 10px !important;
    color: var(--text) !important;
    padding: 10px 12px !important;
    width: 100% !important;
    min-width: 0 !important;
    resize: vertical !important;
    overflow: auto !important;
    line-height: 1.45 !important;
    white-space: pre-wrap !important;
    overflow-wrap: anywhere !important;
  }
  #inline-title-input { min-height: 44px !important; max-height: 120px !important; font-weight: 700 !important; }
  #inline-note-input { min-height: 120px !important; max-height: 380px !important; }
  .pro-editor-help { font-size: 11px; color: var(--text3); padding: 0 2px 2px; }
</style>
<script id="professional-text-editor-patch-js">
(function(){
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
  function ensureEditorChrome(){
    const ie=document.getElementById('inline-editor');
    if(!ie || ie.dataset.proReady==='1') return ie;
    ie.classList.add('pro-editor');
    const bar=document.createElement('div');
    bar.className='pro-editor-bar';
    bar.innerHTML='<div class="pro-editor-title"><i class="ti ti-edit"></i><span>Editar texto</span></div><div class="pro-editor-actions"><button type="button" class="pro-editor-btn" id="pro-cancel-text">Cancelar</button><button type="button" class="pro-editor-btn primary" id="pro-save-text">Salvar</button></div>';
    const help=document.createElement('div');
    help.className='pro-editor-help';
    help.textContent='Enter cria nova linha. Ctrl+Enter salva. Esc cancela.';
    ie.insertBefore(bar, ie.firstChild);
    ie.appendChild(help);
    document.getElementById('pro-save-text').onclick=function(){ commitInlineEdit(); };
    document.getElementById('pro-cancel-text').onclick=function(){ cancelInlineEdit(); };
    ['mousedown','mousemove','mouseup','click','dblclick','wheel','contextmenu'].forEach(ev=>{
      ie.addEventListener(ev,function(e){ e.stopPropagation(); }, {passive:false});
    });
    ie.dataset.proReady='1';
    return ie;
  }

  window.wrapLines = function(c, text, maxW, maxLines) {
    const lines=[];
    const paragraphs=String(text||'').replace(/\r/g,'').split('\n');
    const pushLine=(s)=>{ lines.push(s); return maxLines && lines.length>=maxLines; };
    const breakLongWord=(word)=>{
      let piece='';
      for(const ch of String(word)){
        const test=piece+ch;
        if(piece && c.measureText(test).width>maxW){ if(pushLine(piece)) return ''; piece=ch; }
        else piece=test;
      }
      return piece;
    };
    for(const para of paragraphs){
      if(para.trim()===''){ if(pushLine('')) return lines; continue; }
      const words=para.split(/\s+/).filter(Boolean);
      let cur='';
      for(let word of words){
        if(c.measureText(word).width>maxW){
          if(cur){ if(pushLine(cur)) return lines; cur=''; }
          const tail=breakLongWord(word);
          if(maxLines && lines.length>=maxLines) return lines;
          cur=tail;
          continue;
        }
        const test=cur?cur+' '+word:word;
        if(cur && c.measureText(test).width>maxW){ if(pushLine(cur)) return lines; cur=word; }
        else cur=test;
      }
      if(cur && pushLine(cur)) return lines;
    }
    return lines;
  };

  window.startInlineEdit = startInlineEdit = function(node, evt){
    if(!node) return;
    ensureEditorChrome();
    inlineEditing=node;
    node.__editSnapshot={title:node.title||'', note:node.note||''};
    const ie=document.getElementById('inline-editor');
    const ti=document.getElementById('inline-title-input');
    const ni=document.getElementById('inline-note-input');
    const rect=document.getElementById('canvas-wrap').getBoundingClientRect();
    const rightPanel=document.getElementById('right-panel');
    const rpOpen=rightPanel && rightPanel.classList.contains('show') ? rightPanel.getBoundingClientRect().width : 0;
    const sx=node.x*camera.zoom + camera.x + rect.left;
    const sy=node.y*camera.zoom + camera.y + rect.top;
    const desiredW=Math.max(320, Math.min(620, node.width*camera.zoom + 80));
    const maxLeft=window.innerWidth - rpOpen - desiredW - 14;
    const left=clamp(sx, 14, Math.max(14, maxLeft));
    const top=clamp(sy, 64, Math.max(64, window.innerHeight-360));
    ie.style.left=left+'px';
    ie.style.top=top+'px';
    ie.style.width=desiredW+'px';
    ti.value=node.title||'';
    ni.value=node.note||'';
    ti.placeholder='Título';
    ni.placeholder=node.type==='note' ? 'Escreva a nota aqui...' : 'Texto dentro do card...';
    ti.style.fontSize=Math.max(14, Math.min(20, (node.textSize||14)*camera.zoom))+'px';
    ni.style.fontSize=Math.max(13, Math.min(18, (node.noteSize||13)*camera.zoom))+'px';
    ie.classList.add('show');
    setTimeout(()=>{ ti.focus(); ti.select(); },0);
    draw();
  };

  window.commitInlineEdit = commitInlineEdit = function(){
    if(!inlineEditing) return;
    const ti=document.getElementById('inline-title-input');
    const ni=document.getElementById('inline-note-input');
    inlineEditing.title=ti.value;
    inlineEditing.note=ni.value;
    delete inlineEditing.__editSnapshot;
    inlineEditing=null;
    document.getElementById('inline-editor').classList.remove('show');
    if(selectedNode) updatePanel();
    saveHist(); draw(); triggerSave();
  };

  window.cancelInlineEdit = cancelInlineEdit = function(){
    if(!inlineEditing) return;
    if(inlineEditing.__editSnapshot){
      inlineEditing.title=inlineEditing.__editSnapshot.title;
      inlineEditing.note=inlineEditing.__editSnapshot.note;
      delete inlineEditing.__editSnapshot;
    }
    inlineEditing=null;
    document.getElementById('inline-editor').classList.remove('show');
    draw();
  };

  ['inline-title-input','inline-note-input'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.addEventListener('keydown',function(e){
      if(e.key==='Enter' && (e.ctrlKey||e.metaKey)){ e.preventDefault(); commitInlineEdit(); }
      if(e.key==='Escape'){ e.preventDefault(); cancelInlineEdit(); }
    }, true);
  });
})();
</script>



<!-- PATCH: acabamento UI - scroll de menus, estados ativos, cadeado e tamanho de ícones -->
<style id="ui-polish-scroll-lock-icon-patch-css">
  /* Menu do botão direito: não estoura mais para fora da tela e aceita scroll do mouse */
  #ctx-menu {
    max-height: calc(100vh - 24px) !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    overscroll-behavior: contain;
    min-width: 210px !important;
    max-width: min(320px, calc(100vw - 24px)) !important;
    scrollbar-width: thin;
  }
  #ctx-menu .ctx-item { min-height: 36px; }
  #ctx-menu .ctx-item.active,
  #ctx-menu .ctx-item[aria-pressed="true"] {
    background: var(--accent) !important;
    color: var(--bg) !important;
    font-weight: 700;
  }
  #ctx-menu .ctx-item.active i,
  #ctx-menu .ctx-item[aria-pressed="true"] i { color: var(--bg) !important; }

  /* Barra inferior: estado desligado mais fraco, ligado mais evidente */
  #bottom-bar .bb-btn {
    opacity: .54;
    position: relative;
  }
  #bottom-bar .bb-btn:hover { opacity: .86; }
  #bottom-bar .bb-btn.active,
  #bottom-bar .bb-btn[aria-pressed="true"] {
    opacity: 1 !important;
    background: var(--accent) !important;
    color: var(--bg) !important;
    box-shadow: 0 0 0 1px var(--accent), 0 6px 18px var(--shadow2);
  }
  #bottom-bar .bb-btn.active i,
  #bottom-bar .bb-btn[aria-pressed="true"] i { color: var(--bg) !important; }
  #bottom-bar .bb-btn.danger { opacity: .78; }

  /* Painel de tamanho do ícone mais amplo */
  #rp-iconsize-slider { min-width: 0; }
  .icon-size-hint {
    font-size: 11px;
    color: var(--text3);
    margin-top: 6px;
    line-height: 1.35;
  }
</style>
<script id="ui-polish-scroll-lock-icon-patch-js">
(function(){
  'use strict';

  function byId(id){ return document.getElementById(id); }

  // Slider de ícones maior para permitir realmente aumentar/diminuir ícones livres, notas e pastas.
  function prepareIconSizeControls(){
    const sl=byId('rp-iconsize-slider');
    if(sl){ sl.min='8'; sl.max='160'; sl.step='1'; }
    const row=sl && sl.closest('.rpanel-size-row');
    if(row && !byId('icon-size-hint')){
      const hint=document.createElement('div');
      hint.id='icon-size-hint';
      hint.className='icon-size-hint';
      hint.textContent='Para ícones livres, este controle altera o tamanho real do ícone. Também dá para puxar pelo canto do item selecionado.';
      row.insertAdjacentElement('afterend', hint);
    }
  }

  function syncBottomBarState(){
    const n = selectedNode || null;
    const lock=byId('bb-lock');
    const min=byId('bb-minimize');
    if(lock){
      const on=!!(n && n.locked);
      lock.classList.toggle('active', on);
      lock.setAttribute('aria-pressed', on ? 'true' : 'false');
      lock.title = on ? 'Bloqueado — clique para desbloquear' : 'Bloquear';
    }
    if(min){
      const on=!!(n && n.minimized);
      min.classList.toggle('active', on);
      min.setAttribute('aria-pressed', on ? 'true' : 'false');
      min.title = on ? 'Minimizado — clique para expandir' : 'Minimizar compacto';
    }
  }

  function syncContextMenuState(){
    const n = selectedNode || null;
    const lock=byId('ctx-lock');
    const min=byId('ctx-minimize');
    if(lock){
      const on=!!(n && n.locked);
      lock.classList.toggle('active', on);
      lock.setAttribute('aria-pressed', on ? 'true' : 'false');
      const s=lock.querySelector('span');
      if(s) s.textContent = on ? 'Desbloquear' : 'Bloquear';
    }
    if(min){
      const on=!!(n && n.minimized);
      min.classList.toggle('active', on);
      min.setAttribute('aria-pressed', on ? 'true' : 'false');
      const s=min.querySelector('span');
      if(s) s.textContent = on ? 'Expandir' : 'Minimizar';
    }
  }

  // Reposiciona o menu depois que ele aparece, mantendo dentro da viewport e habilitando scroll.
  const oldShowCtx = window.showCtxMenu || showCtxMenu;
  window.showCtxMenu = showCtxMenu = function(x,y,node){
    oldShowCtx(x,y,node);
    const m=byId('ctx-menu');
    if(!m) return;
    const margin=12;
    m.style.maxHeight = Math.max(180, window.innerHeight - margin*2) + 'px';
    m.style.overflowY = 'auto';
    m.style.overflowX = 'hidden';
    // Precisa medir depois de mostrar.
    const r=m.getBoundingClientRect();
    const left=Math.min(Math.max(margin, x), Math.max(margin, window.innerWidth - r.width - margin));
    const top=Math.min(Math.max(margin, y), Math.max(margin, window.innerHeight - r.height - margin));
    m.style.left=left+'px';
    m.style.top=top+'px';
    syncContextMenuState();
  };

  // Evita o scroll do menu virar zoom/pan do canvas.
  const cm=byId('ctx-menu');
  if(cm){
    ['wheel','touchmove','pointermove'].forEach(ev=>cm.addEventListener(ev,function(e){ e.stopPropagation(); }, {passive:false}));
  }

  // Sinal visual de cadeado discreto no próprio item bloqueado.
  const oldDrawNode = window.drawNode || drawNode;
  window.drawNode = drawNode = function(node){
    oldDrawNode(node);
    if(!node || !node.locked) return;
    try{
      const h = node.minimized ? 44 : node.height;
      const size = Math.max(10/camera.zoom, Math.min(15/camera.zoom, (node.type==='icon' ? (node.iconSize||42)*0.28/camera.zoom : 13/camera.zoom)));
      const pad = 6/camera.zoom;
      const x = node.x + node.width - size - pad;
      const y = node.y + pad;
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = colorOf(node.textColor, cssVar('--text')) || '#111';
      ctx.font = `${size}px Arial`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('🔒', x, y);
      ctx.restore();
    }catch(err){}
  };

  // Atualiza estado visual sempre que seleção/painel muda.
  const oldSelectNode = window.selectNodeObj || selectNodeObj;
  window.selectNodeObj = selectNodeObj = function(node){
    oldSelectNode(node);
    prepareIconSizeControls();
    syncBottomBarState();
    syncContextMenuState();
  };
  const oldSelectConn = window.selectConnObj || selectConnObj;
  window.selectConnObj = selectConnObj = function(conn){
    oldSelectConn(conn);
    syncBottomBarState();
  };

  const oldUpdatePanel = window.updatePanel || updatePanel;
  window.updatePanel = updatePanel = function(){
    const noteLabel=document.getElementById('rp-note-label');
    const noteEl=document.getElementById('rp-note');
    const titleEl=document.getElementById('rp-title');
    if(noteLabel) noteLabel.textContent='Nota dentro do card';
    if(noteEl) noteEl.placeholder='Escreva uma nota...';
    if(titleEl) titleEl.placeholder='Nome do card';
    oldUpdatePanel();
    prepareIconSizeControls();
    if(selectedNode){
      const sl=byId('rp-iconsize-slider'), val=byId('rp-iconsize-val');
      if(sl){ sl.value = selectedNode.iconSize || (selectedNode.type==='icon'?42:28); }
      if(val){ val.textContent=(selectedNode.iconSize || (selectedNode.type==='icon'?42:28))+'px'; }
    }
    syncBottomBarState();
  };

  // Sincroniza o slider do painel direito quando redimensionando ícone
  document.addEventListener('mousemove', function(){
    try{
      if(typeof isResizing !== 'undefined' && isResizing && resizeNode && resizeNode.type==='icon'){
        const sl=byId('rp-iconsize-slider'), val=byId('rp-iconsize-val');
        if(selectedNode && selectedNode.id===resizeNode.id){
          const s = resizeNode.iconSize || 42;
          if(sl) sl.value=s;
          if(val) val.textContent=s+'px';
        }

      }
    }catch(err){}
  }, true);

  // Os botões que alternam estado agora refletem imediatamente a alteração.
  ['bb-lock','bb-minimize','ctx-lock','ctx-minimize'].forEach(id=>{
    const el=byId(id);
    if(!el) return;
    el.addEventListener('click', function(){ setTimeout(()=>{ syncBottomBarState(); syncContextMenuState(); draw(); }, 0); }, true);
  });

  window.addEventListener('resize', function(){
    const m=byId('ctx-menu');
    if(m && m.classList.contains('show') && selectedNode){
      const r=m.getBoundingClientRect();
      const margin=12;
      m.style.left=Math.min(Math.max(margin,r.left),Math.max(margin,window.innerWidth-r.width-margin))+'px';
      m.style.top=Math.min(Math.max(margin,r.top),Math.max(margin,window.innerHeight-r.height-margin))+'px';
      m.style.maxHeight=Math.max(180,window.innerHeight-margin*2)+'px';
    }
  });

  prepareIconSizeControls();
  syncBottomBarState();
  draw();
})();
</script>



<!-- PATCH: legenda externa de cards e subcards presos ao card-pai -->
<style id="card-label-nesting-patch">
  /* Respiro extra para nomes/legendas abaixo dos objetos */
  #cvs { touch-action: none; }
</style>
<script id="card-label-nesting-patch-js">
(function(){
  if(window.__cardLabelNestingPatch) return;
  window.__cardLabelNestingPatch = true;

  function safe(v,d){ return (v===undefined || v===null) ? d : v; }
  function labelHeight(node){
    if(!node || !String(node.title||'').trim() || node.type==='icon') return 0;
    return Math.max(24/camera.zoom, ((node.textSize||12)+10)/camera.zoom);
  }
  function nodeBodyH(node){ return node.minimized ? 44 : node.height; }
  function getParent(node){ return node && node.parentId ? nodes.find(n=>n.id===node.parentId) : null; }
  function childMargin(){ return 10/camera.zoom; }

  function drawExternalName(node){
    const title=String(node.title||'').trim();
    if(!title || node.type==='icon') return;
    const x=node.x, y=node.y, w=node.width, h=nodeBodyH(node);
    const fs=(node.textSize||12)/camera.zoom;
    const maxW=Math.max(54/camera.zoom, w+34/camera.zoom);
    ctx.save();
    ctx.font=`700 ${fs}px Inter`;
    ctx.textAlign='center';
    ctx.textBaseline='top';
    const txt=typeof fitText==='function' ? fitText(ctx,title,maxW) : title;
    const bg=typeof cssVar==='function' ? cssVar('--bg') : '#fff';
    const bgLum=typeof luminance==='function' ? luminance(bg) : .8;
    const fallback=bgLum < .45 ? '#fff' : '#111827';
    const py=y+h+5/camera.zoom;
    ctx.shadowColor='transparent';
    ctx.fillStyle=(typeof colorOf==='function') ? colorOf(node.textColor,fallback) : fallback;
    ctx.fillText(txt,x+w/2,py);
    ctx.restore();
  }

  function drawCardBodyOnly(node,isSel,isMin){
    const h=isMin?44:node.height, w=node.width, x=node.x, y=node.y;
    if(typeof renderShape==='function') renderShape(ctx,node,isSel,isMin);
    else { ctx.save(); ctx.strokeStyle='#999'; ctx.strokeRect(x,y,w,h); ctx.restore(); }
    ctx.save();
    if(typeof drawCardShape==='function') { drawCardShape(ctx,{...node,height:h}); ctx.clip(); }
    const pad=14/camera.zoom;
    const txCol=(typeof colorOf==='function') ? colorOf(node.textColor, (typeof cssVar==='function'?cssVar('--text'):'#111')) : '#111';
    const noteSz=(node.noteSize||11)/camera.zoom;
    let textY=y+pad;

    if(node.imageUrl && node.imgObj instanceof HTMLImageElement){
      const imgH=Math.min(h*0.48,h-36/camera.zoom);
      try{ ctx.drawImage(node.imgObj,x+2/camera.zoom,y+2/camera.zoom,w-4/camera.zoom,imgH); }catch(e){}
      textY=y+imgH+8/camera.zoom;
    }
    // Dentro do card não renderiza o nome/título. Aqui fica só conteúdo livre/nota.
    if(node.note){
      const cw=w-pad*2;
      const maxLines=Math.max(0,Math.floor((y+h-pad-textY)/(noteSz+4/camera.zoom)));
      ctx.fillStyle=txCol; ctx.textAlign=node.textAlign||'left'; ctx.textBaseline='top';
      const lx = ctx.textAlign==='center' ? x+w/2 : ctx.textAlign==='right' ? x+w-pad : x+pad;
      ctx.font=`${node.textItalic?'italic ':''}400 ${noteSz}px Inter`;
      const lines=(typeof wrapLines==='function') ? wrapLines(ctx,node.note,cw,maxLines) : String(node.note).split('\n').slice(0,maxLines);
      lines.forEach((ln,i)=>ctx.fillText(ln,lx,textY+i*(noteSz+4/camera.zoom)));
    }
    ctx.restore();
    if(isSel && !node.locked){ ctx.save(); ctx.fillStyle='#3b82f6'; ctx.beginPath(); ctx.arc(x+w,y+h,5/camera.zoom,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    drawExternalName(node);
  }

  function clampChildToParent(child){
    const parent=getParent(child); if(!parent) return;
    const m=childMargin();
    const ph=nodeBodyH(parent);
    const lh=labelHeight(child);
    const maxW=Math.max(34/camera.zoom,parent.width-m*2);
    const maxH=Math.max(28/camera.zoom,ph-m*2-lh);
    child.width=Math.min(child.width,maxW);
    child.height=Math.min(child.height,maxH);
    const minX=parent.x+m, minY=parent.y+m;
    const maxX=parent.x+parent.width-m-child.width;
    const maxY=parent.y+ph-m-child.height-lh;
    child.x=Math.min(Math.max(child.x,minX),Math.max(minX,maxX));
    child.y=Math.min(Math.max(child.y,minY),Math.max(minY,maxY));
  }
  function normalizeNesting(){
    (nodes||[]).forEach(n=>{ if(!Array.isArray(n.children)) n.children=[]; });
    (nodes||[]).forEach(n=>{
      if(n.parentId){
        const p=getParent(n);
        if(p && !p.children.includes(n.id)) p.children.push(n.id);
      }
    });
    (nodes||[]).forEach(n=>{ if(n.parentId) clampChildToParent(n); });
  }
  function ensureChildFront(child){
    if(!child || !child.parentId) return;
    const p=getParent(child); if(!p) return;
    nodes = nodes.filter(n=>n.id!==p.id && n.id!==child.id).concat(p,child);
  }
  function parentCandidateFor(node){
    if(!node || node.parentId) return null;
    const cx=node.x+node.width/2, cy=node.y+node.height/2;
    let best=null;
    for(const p of nodes){
      if(!p || p.id===node.id || p.type!=='card') continue;
      if(cx>=p.x && cx<=p.x+p.width && cy>=p.y && cy<=p.y+nodeBodyH(p)){
        if(!best || (p.width*p.height)<(best.width*best.height)) best=p;
      }
    }
    return best;
  }
  function attachToParent(child,parent){
    if(!child || !parent || child.id===parent.id) return;
    child.parentId=parent.id;
    parent.children=parent.children||[];
    if(!parent.children.includes(child.id)) parent.children.push(child.id);
    clampChildToParent(child);
    ensureChildFront(child);
  }

  // Sobrescreve desenho final: card com legenda externa, conteúdo dentro.
  const prevDrawNode = window.drawNode || drawNode;
  window.drawNode = drawNode = function(node){
    if(!node) return;
    if(inlineEditing && inlineEditing.id===node.id) return;
    if(node.imageUrl && !node.imgObj && typeof loadNodeImage==='function') loadNodeImage(node);
    const isSel=selectedNode && selectedNode.id===node.id;
    const isMin=node.minimized || (settings.autoMinimize && !isSel);
    if(node.type==='card') drawCardBodyOnly(node,isSel,isMin);
    else prevDrawNode(node);
    // Cadeado discreto continua visível após novo desenho.
    if(node.locked){
      try{
        const h=nodeBodyH(node), size=12/camera.zoom, pad=6/camera.zoom;
        ctx.save(); ctx.globalAlpha=.72; ctx.font=`${size}px Arial`; ctx.textAlign='left'; ctx.textBaseline='top';
        ctx.fillStyle=(typeof cssVar==='function'?cssVar('--text'):'#111'); ctx.fillText('🔒',node.x+node.width-size-pad,node.y+pad); ctx.restore();
      }catch(e){}
    }
  };

  // Área clicável passa a incluir legenda externa também para cards.
  const oldGetNodeAt = window.getNodeAt || getNodeAt;
  window.getNodeAt = getNodeAt = function(x,y){
    for(let i=nodes.length-1;i>=0;i--){
      const n=nodes[i], h=nodeBodyH(n), extra=labelHeight(n);
      const pad=14/camera.zoom;
      if(x>=n.x-pad && x<=n.x+n.width+pad && y>=n.y && y<=n.y+h+extra+8/camera.zoom) return n;
    }
    return oldGetNodeAt(x,y);
  };

  // Ao redimensionar/mover, filhos ficam presos e filhos sempre na frente.
  const oldResizeChildren = window.resizeChildrenProportionally || resizeChildrenProportionally;
  let resizingChildrenGuard = false;
  window.resizeChildrenProportionally = resizeChildrenProportionally = function(parentNode,oldWidth,oldHeight){
    if(resizingChildrenGuard) return;
    resizingChildrenGuard = true;
    try{
      if(typeof oldResizeChildren === 'function') oldResizeChildren(parentNode,oldWidth,oldHeight);
      const seen = new Set();
      (parentNode && parentNode.children || []).forEach(id=>{
        if(seen.has(id)) return;
        seen.add(id);
        const ch=nodes.find(n=>n && n.id===id);
        if(ch && typeof clampChildToParent === 'function') clampChildToParent(ch);
      });
    } finally {
      resizingChildrenGuard = false;
    }
  };

  document.addEventListener('mousemove', function(){
    try{
      if(typeof dragNode!=='undefined' && dragNode && dragNode.parentId) clampChildToParent(dragNode);
      if(typeof resizeNode!=='undefined' && resizeNode && resizeNode.parentId) clampChildToParent(resizeNode);
    }catch(e){}
  }, true);

  document.addEventListener('mouseup', function(){
    try{
      // Se um card solto for largado dentro de outro card, vira subcard preso.
      if(typeof dragNode!=='undefined' && dragNode && !dragNode.parentId && dragNode.type==='card'){
        const p=parentCandidateFor(dragNode);
        if(p) attachToParent(dragNode,p);
      }
      normalizeNesting();
      draw();
    }catch(e){}
  }, true);

  // Reforça os botões de adicionar item interno para criar filho real e preso.
  function rewireInternalButton(id,type){
    const el=document.getElementById(id); if(!el) return;
    el.onclick=function(){
      if(selectedNode && selectedNode.type==='card'){
        const p=selectedNode;
        const ch=createNode(p.x+22/camera.zoom,p.y+22/camera.zoom,type);
        if(type==='card'){ ch.width=Math.min(180,Math.max(90,p.width-44/camera.zoom)); ch.height=Math.min(110,Math.max(60,p.height-58/camera.zoom)); ch.title=ch.title||'Subcard'; ch.note=ch.note||''; }
        attachToParent(ch,p);
        nodes.push(ch); ensureChildFront(ch); selectNodeObj(ch); saveHist(); draw(); triggerSave();
      }
      if(typeof hideContextMenu==='function') hideContextMenu();
    };
  }
  rewireInternalButton('ctx-add-card','card');
  rewireInternalButton('ctx-add-note','note');

  // Se dados antigos têm filhos fora da borda, corrige na abertura.
  normalizeNesting();
  draw();
})();
</script>



<!-- PATCH FINAL: títulos sem fundo + contraste automático + curvatura manual das conexões -->
<script id="titles-and-manual-connection-curve-patch">
(function(){
  if(window.__titlesAndManualConnectionCurvePatch) return;
  window.__titlesAndManualConnectionCurvePatch = true;

  const CONN_SELECT_COLOR = '#f59e0b';
  const CONN_RELATED_COLOR = '#f59e0b';
  let draggingConnPoint = null;

  function themeTitleColor(){
    const bg = (typeof cssVar === 'function') ? cssVar('--bg') : '#ffffff';
    const lum = (typeof luminance === 'function') ? luminance(bg) : 0.8;
    return lum < .45 ? '#ffffff' : '#111827';
  }

  function nodeBodyH(node){ return node && node.minimized ? 44 : (node ? node.height : 0); }

  function autoTitleSize(node){
    const base = node.textSize || 13;
    const byW = Math.max(9, Math.min(18, node.width / 9));
    return Math.max(9, Math.min(base, byW));
  }

  function fitTextToWidth(c, text, maxW){
    if(typeof fitText === 'function') return fitText(c, text, maxW);
    if(c.measureText(text).width <= maxW) return text;
    let t = text;
    while(t.length && c.measureText(t + '…').width > maxW) t = t.slice(0,-1);
    return t + '…';
  }

  // Título externo: somente letras, sem caixa/fundo/borda/sombra.
  window.drawExternalName = drawExternalName = function(node){
    const title = String(node && node.title || '').trim();
    if(!title || node.type === 'icon') return;
    const x = node.x, y = node.y, w = node.width, h = nodeBodyH(node);
    const fs = autoTitleSize(node) / camera.zoom;
    const maxW = Math.max(44/camera.zoom, w + 10/camera.zoom);
    ctx.save();
    ctx.font = `${node.textBold === false ? 600 : 700} ${fs}px Inter`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = themeTitleColor();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 0;
    const txt = fitTextToWidth(ctx, title, maxW);
    const py = y + h + Math.max(4/camera.zoom, Math.min(7/camera.zoom, h * 0.06));
    ctx.fillText(txt, x + w/2, py);
    if(node.textUnderline && typeof drawUnderline === 'function'){
      ctx.strokeStyle = ctx.fillStyle;
      drawUnderline(ctx, txt, x + w/2, py, fs, 'center');
    }
    ctx.restore();
  };

  // Reaplica o desenho de node para garantir que cards também usem a legenda limpa.
  if(typeof drawCardBodyOnly === 'function'){
    const previousDrawNode = window.drawNode || drawNode;
    window.drawNode = drawNode = function(node){
      if(!node) return;
      if(typeof inlineEditing !== 'undefined' && inlineEditing && inlineEditing.id === node.id) return;
      if(node.imageUrl && !node.imgObj && typeof loadNodeImage === 'function') loadNodeImage(node);
      const isSel = selectedNode && selectedNode.id === node.id;
      const isMin = node.minimized || (settings.autoMinimize && !isSel);
      if(node.type === 'card') drawCardBodyOnly(node, isSel, isMin);
      else previousDrawNode(node);
      if(node.locked){
        try{
          const h = nodeBodyH(node), size = 12/camera.zoom, pad = 6/camera.zoom;
          ctx.save(); ctx.globalAlpha = .72; ctx.font = `${size}px Arial`; ctx.textAlign='left'; ctx.textBaseline='top';
          ctx.fillStyle = (typeof cssVar === 'function' ? cssVar('--text') : '#111');
          ctx.fillText('🔒', node.x + node.width - size - pad, node.y + pad); ctx.restore();
        }catch(e){}
      }
    };
  }

  function anchor(n, side){
    const h = n.minimized ? 44 : n.height, x = n.x, y = n.y, w = n.width;
    if(side === 'left') return {x:x, y:y+h/2};
    if(side === 'right') return {x:x+w, y:y+h/2};
    if(side === 'top') return {x:x+w/2, y:y};
    if(side === 'bottom') return {x:x+w/2, y:y+h};
    return {x:x+w/2, y:y+h/2};
  }
  function autoSide(a,b){
    return Math.abs((b.x+b.width/2)-(a.x+a.width/2)) > Math.abs((b.y+b.height/2)-(a.y+a.height/2))
      ? ((b.x>a.x)?'right':'left') : ((b.y>a.y)?'bottom':'top');
  }
  function connEndpoints(conn){
    const from = nodes.find(n=>n.id===conn.from), to = nodes.find(n=>n.id===conn.to);
    if(!from || !to) return null;
    const p1 = anchor(from, conn.fromSide && conn.fromSide !== 'auto' ? conn.fromSide : autoSide(from,to));
    const p2 = anchor(to, conn.toSide && conn.toSide !== 'auto' ? conn.toSide : autoSide(to,from));
    return {from,to,p1,p2};
  }
  function defaultControl(conn, p1, p2){
    const curve = conn.curve ?? 70;
    const dx = p2.x-p1.x, dy = p2.y-p1.y, len = Math.max(1, Math.hypot(dx,dy));
    return {x:(p1.x+p2.x)/2 + (-dy/len)*curve, y:(p1.y+p2.y)/2 + (dx/len)*curve};
  }
  function connPoints(conn){
    const ep = connEndpoints(conn); if(!ep) return null;
    const cps = Array.isArray(conn.controlPoints) && conn.controlPoints.length ? conn.controlPoints : [];
    return [ep.p1, ...cps, ep.p2];
  }
  function drawSmoothPath(c, pts){
    c.moveTo(pts[0].x, pts[0].y);
    if(pts.length === 2){ c.lineTo(pts[1].x, pts[1].y); return; }
    if(pts.length === 3){ c.quadraticCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y); return; }
    for(let i=1;i<pts.length-2;i++){
      const mid = {x:(pts[i].x+pts[i+1].x)/2, y:(pts[i].y+pts[i+1].y)/2};
      c.quadraticCurveTo(pts[i].x, pts[i].y, mid.x, mid.y);
    }
    const last = pts[pts.length-2], end = pts[pts.length-1];
    c.quadraticCurveTo(last.x, last.y, end.x, end.y);
  }
  function sampleQuad(p0,p1,p2,t){
    const a=(1-t)*(1-t), b=2*(1-t)*t, c=t*t;
    return {x:a*p0.x+b*p1.x+c*p2.x, y:a*p0.y+b*p1.y+c*p2.y};
  }
  function sampledPathPoints(conn){
    const ep = connEndpoints(conn); if(!ep) return [];
    const style = conn.style || settings.defaultConnStyle;
    const cps = Array.isArray(conn.controlPoints) && conn.controlPoints.length ? conn.controlPoints : [];
    let pts = [ep.p1, ...cps, ep.p2];
    if(style === 'straight' || style === 'dashed' || style === 'direct') return pts;
    if(!cps.length && style === 'curved') pts = [ep.p1, defaultControl(conn, ep.p1, ep.p2), ep.p2];
    const out = [];
    if(pts.length === 3){ for(let i=0;i<=32;i++) out.push(sampleQuad(pts[0],pts[1],pts[2],i/32)); return out; }
    if(pts.length > 3){
      out.push(pts[0]);
      for(let i=1;i<pts.length-2;i++){
        const mid = {x:(pts[i].x+pts[i+1].x)/2, y:(pts[i].y+pts[i+1].y)/2};
        const start = out[out.length-1];
        for(let j=1;j<=16;j++) out.push(sampleQuad(start,pts[i],mid,j/16));
      }
      const start = out[out.length-1], last = pts[pts.length-2], end = pts[pts.length-1];
      for(let j=1;j<=16;j++) out.push(sampleQuad(start,last,end,j/16));
      return out;
    }
    return pts;
  }
  function distToSegment(px,py,a,b){
    const dx=b.x-a.x, dy=b.y-a.y, len2=dx*dx+dy*dy;
    if(!len2) return Math.hypot(px-a.x,py-a.y);
    const t=Math.max(0,Math.min(1,((px-a.x)*dx+(py-a.y)*dy)/len2));
    return Math.hypot(px-(a.x+t*dx), py-(a.y+t*dy));
  }
  function distToConnPath(conn,x,y){
    const pts = sampledPathPoints(conn); let best = Infinity;
    for(let i=0;i<pts.length-1;i++) best = Math.min(best, distToSegment(x,y,pts[i],pts[i+1]));
    return best;
  }
  function nearestConn(x,y){
    const thr = 12/camera.zoom;
    let best = null, bestD = Infinity;
    for(const c of connections){
      const d = distToConnPath(c,x,y);
      if(d < thr && d < bestD){ best = c; bestD = d; }
    }
    return best;
  }
  function handleAt(conn,x,y){
    const cps = conn && Array.isArray(conn.controlPoints) ? conn.controlPoints : [];
    const r = 10/camera.zoom;
    for(let i=cps.length-1;i>=0;i--){
      if(Math.hypot(x-cps[i].x, y-cps[i].y) <= r) return i;
    }
    return -1;
  }
  function insertControlPoint(conn,x,y){
    if(!Array.isArray(conn.controlPoints)) conn.controlPoints = [];
    conn.controlPoints.push({x,y});
    return conn.controlPoints.length - 1;
  }

  window.drawConn = drawConn = function(conn){
    const ep = connEndpoints(conn); if(!ep) return;
    const style = conn.style || settings.defaultConnStyle;
    const lw = conn.width || 2;
    const col = conn.color === 'default' || !conn.color ? cssVar('--connection-color') : conn.color;
    const isSel = selectedConn && selectedConn.id === conn.id;
    const isRelated = settings.highlightConn && selectedNode && (conn.from === selectedNode.id || conn.to === selectedNode.id);
    const stroke = isSel ? CONN_SELECT_COLOR : (isRelated ? CONN_RELATED_COLOR : col);
    let pts = connPoints(conn);
    if(!pts) return;
    const manual = Array.isArray(conn.controlPoints) && conn.controlPoints.length;

    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = (isSel ? Math.max(lw,3) : lw) / camera.zoom;
    ctx.globalAlpha = conn.opacity || 1;
    if(style === 'dashed') ctx.setLineDash([8/camera.zoom,5/camera.zoom]);
    ctx.beginPath();
    if((style === 'straight' || style === 'dashed' || style === 'direct') && !manual){
      ctx.moveTo(ep.p1.x, ep.p1.y); ctx.lineTo(ep.p2.x, ep.p2.y);
    } else if(style === 'stepped' && !manual){
      const mid = conn.stepDistance ? ep.p1.x + (conn.stepDistance/camera.zoom) : (ep.p1.x + ep.p2.x)/2;
      ctx.moveTo(ep.p1.x,ep.p1.y); ctx.lineTo(mid,ep.p1.y); ctx.lineTo(mid,ep.p2.y); ctx.lineTo(ep.p2.x,ep.p2.y);
    } else {
      if(!manual && style === 'curved') pts = [ep.p1, defaultControl(conn, ep.p1, ep.p2), ep.p2];
      drawSmoothPath(ctx, pts);
    }
    ctx.stroke(); ctx.setLineDash([]);

    if(settings.showArrows){
      const samples = sampledPathPoints(conn);
      const a = samples.length > 1 ? samples[samples.length-2] : ep.p1;
      const b = samples.length ? samples[samples.length-1] : ep.p2;
      const ang = Math.atan2(b.y-a.y,b.x-a.x), as = 9/camera.zoom;
      ctx.save(); ctx.translate(ep.p2.x,ep.p2.y); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-as,-as/2.2); ctx.lineTo(-as,as/2.2); ctx.closePath();
      ctx.fillStyle = stroke; ctx.fill(); ctx.restore();
    }

    if(isSel && Array.isArray(conn.controlPoints)){
      conn.controlPoints.forEach(p=>{
        ctx.beginPath();
        ctx.fillStyle = '#fff7ed';
        ctx.strokeStyle = CONN_SELECT_COLOR;
        ctx.lineWidth = 2/camera.zoom;
        ctx.arc(p.x,p.y,6/camera.zoom,0,Math.PI*2);
        ctx.fill(); ctx.stroke();
      });
    }
    ctx.restore();
  };

  window.getConnAt = getConnAt = function(x,y){ return nearestConn(x,y); };

  cvs.addEventListener('mousedown', function(e){
    if(mode !== 'select' || e.button !== 0) return;
    const rect = cvs.getBoundingClientRect();
    const mx = (e.clientX-rect.left-camera.x)/camera.zoom;
    const my = (e.clientY-rect.top-camera.y)/camera.zoom;
    if(getNodeAt(mx,my)) return;

    let conn = selectedConn || nearestConn(mx,my);
    if(!conn) return;
    const h = handleAt(conn,mx,my);
    let idx = h;
    if(idx < 0){
      conn = nearestConn(mx,my);
      if(!conn) return;
      idx = insertControlPoint(conn,mx,my);
    }
    selectConnObj(conn);
    draggingConnPoint = {conn, idx};
    e.preventDefault(); e.stopImmediatePropagation();
    draw();
  }, true);

  cvs.addEventListener('mousemove', function(e){
    if(!draggingConnPoint) return;
    const rect = cvs.getBoundingClientRect();
    const mx = (e.clientX-rect.left-camera.x)/camera.zoom;
    const my = (e.clientY-rect.top-camera.y)/camera.zoom;
    const pts = draggingConnPoint.conn.controlPoints || [];
    if(pts[draggingConnPoint.idx]){ pts[draggingConnPoint.idx].x = mx; pts[draggingConnPoint.idx].y = my; }
    e.preventDefault(); e.stopImmediatePropagation();
    draw();
  }, true);

  window.addEventListener('mouseup', function(e){
    if(!draggingConnPoint) return;
    draggingConnPoint = null;
    if(typeof saveHist === 'function') saveHist();
    if(typeof triggerSave === 'function') triggerSave();
    e.preventDefault();
    draw();
  }, true);

  draw();
})();
</script>


<script>
(function imagePolaroidAspectPatch(){
  'use strict';

  function isPhotoNode(n){ return !!n && (n.type === 'image' || (n.imageUrl && n.photoOnly === true)); }
  function photoPad(){ return 12; } // sem /camera.zoom — pad fixo em canvas units
  function photoBottom(){ return 34; } // sem /camera.zoom — bottom fixo em canvas units
  function minPhotoW(){ return 90; }
  function photoRatio(n){
    if(n && n.photoRatio) return n.photoRatio;
    if(n && n.imgObj && n.imgObj.naturalWidth && n.imgObj.naturalHeight) return n.imgObj.naturalWidth / n.imgObj.naturalHeight;
    return 4/3;
  }
  function photoOuterHeightForWidth(n, w){
    const pad = 12, bottom = 34;
    const innerW = Math.max(20, w - pad * 2);
    return Math.max(70, Math.round(innerW / photoRatio(n) + pad + bottom));
  }
  function fitPhotoToNatural(n){
    const r = photoRatio(n);
    n.photoRatio = r;
    n.type = 'image';
    n.photoOnly = true;
    n.title = '';
    if(n.note === undefined) n.note = '';
    n.emoji = '';
    n.bgColor = 'none';
    n.borderColor = 'none';
    n.borderWidth = 0;
    n.width = Math.max(minPhotoW(), Math.min(320, n.width || 260));
    n.height = photoOuterHeightForWidth(n, n.width);
  }

  window.drawPhotoPolaroidNode = function(node, isSel){
    const x=node.x, y=node.y, w=node.width, h=node.height;
    const pad=photoPad(), bottom=photoBottom();
    const innerX=x+pad, innerY=y+pad;
    const innerW=Math.max(10, w-pad*2), innerH=Math.max(10, h-pad-bottom);

    ctx.save();
    ctx.shadowColor='rgba(26,26,24,0.16)';
    ctx.shadowBlur=14/camera.zoom;
    ctx.shadowOffsetY=5/camera.zoom;
    ctx.fillStyle='#fffdf8';
    ctx.strokeStyle='rgba(0,0,0,0.08)';
    ctx.lineWidth=1/camera.zoom;
    ctx.beginPath();
    roundRect(ctx,x,y,w,h,4/camera.zoom);
    ctx.fill();
    ctx.shadowColor='transparent';
    ctx.stroke();

    ctx.fillStyle='#f3f0e8';
    ctx.fillRect(innerX,innerY,innerW,innerH);
    if(node.imageUrl && !node.imgObj && typeof loadNodeImage==='function') loadNodeImage(node);
    if(node.imgObj instanceof HTMLImageElement){
      try{
        const r=photoRatio(node), boxR=innerW/innerH;
        let dw=innerW, dh=innerH, dx=innerX, dy=innerY;
        if(r > boxR){ dh=innerW/r; dy=innerY+(innerH-dh)/2; }
        else { dw=innerH*r; dx=innerX+(innerW-dw)/2; }
        ctx.drawImage(node.imgObj, dx, dy, dw, dh);
      }catch(e){}
    }

    if(isSel && !node.locked){
      ctx.fillStyle='#3b82f6';
      ctx.beginPath(); ctx.arc(x+w,y+h,5/camera.zoom,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  };

  const previousDrawNode = window.drawNode || drawNode;
  window.drawNode = drawNode = function(node){
    if(isPhotoNode(node)){
      if(typeof inlineEditing !== 'undefined' && inlineEditing && inlineEditing.id === node.id) return;
      if(node.imageUrl && !node.imgObj && typeof loadNodeImage === 'function') loadNodeImage(node);
      drawPhotoPolaroidNode(node, selectedNode && selectedNode.id === node.id);
      return;
    }
    return previousDrawNode(node);
  };

  const previousGetNodeAt = window.getNodeAt || getNodeAt;
  window.getNodeAt = getNodeAt = function(x,y){
    for(let i=nodes.length-1;i>=0;i--){
      const n=nodes[i];
      if(isPhotoNode(n) && x>=n.x && x<=n.x+n.width && y>=n.y && y<=n.y+n.height) return n;
    }
    return previousGetNodeAt(x,y);
  };

  const previousIsResizeHandle = window.isResizeHandle || isResizeHandle;
  window.isResizeHandle = isResizeHandle = function(node,x,y){
    if(isPhotoNode(node)){
      const thr=10/camera.zoom;
      return Math.hypot(x-(node.x+node.width), y-(node.y+node.height)) < thr;
    }
    return previousIsResizeHandle(node,x,y);
  };

  cvs.addEventListener('mousemove', function(e){
    if(!(typeof isResizing !== 'undefined' && isResizing && resizeNode && isPhotoNode(resizeNode))) return;
    const rect=cvs.getBoundingClientRect();
    const mx=(e.clientX-rect.left-camera.x)/camera.zoom;
    const dx=mx-resizeStart.mx;
    resizeNode.width=Math.max(minPhotoW(), resizeStart.w+dx);
    resizeNode.height=photoOuterHeightForWidth(resizeNode, resizeNode.width);
    if(typeof updatePanel === 'function') updatePanel();
    draw();
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  ['width','height'].forEach(function(prop){
    const slider=document.getElementById('rp-'+prop+'-slider');
    const val=document.getElementById('rp-'+prop+'-val');
    if(!slider) return;
    slider.addEventListener('input', function(e){
      if(!isPhotoNode(selectedNode)) return;
      const currentRatio = selectedNode.width / selectedNode.height;
      if(prop === 'width') selectedNode.width = Math.max(minPhotoW(), +slider.value);
      else selectedNode.width = Math.max(minPhotoW(), Math.round(+slider.value * currentRatio));
      selectedNode.height = photoOuterHeightForWidth(selectedNode, selectedNode.width);
      if(val) val.textContent = (prop === 'width' ? selectedNode.width : selectedNode.height) + 'px';
      if(typeof updatePanel === 'function') updatePanel();
      draw(); if(typeof triggerSave === 'function') triggerSave();
      e.preventDefault(); e.stopImmediatePropagation();
    }, true);
  });

  const fileInput=document.getElementById('image-file');
  if(fileInput){
    fileInput.addEventListener('change', function(e){
      const f=e.target.files && e.target.files[0];
      if(!f || !selectedNode) return;
      const target=selectedNode;
      const reader=new FileReader();
      reader.onload=function(ev){
        const img=new Image();
        img.onload=function(){
          target.imageUrl=ev.target.result;
          target.imgObj=img;
          fitPhotoToNatural(target);
          if(typeof updatePanel === 'function') updatePanel();
          if(typeof saveHist === 'function') saveHist();
          draw(); if(typeof triggerSave === 'function') triggerSave();
        };
        img.src=ev.target.result;
      };
      reader.readAsDataURL(f);
    }, true);
  }

  const oldUpdatePanel = window.updatePanel || updatePanel;
  window.updatePanel = updatePanel = function(){
    const noteLabel=document.getElementById('rp-note-label');
    const noteEl=document.getElementById('rp-note');
    const titleEl=document.getElementById('rp-title');
    if(noteLabel) noteLabel.textContent='Nota dentro do card';
    if(noteEl) noteEl.placeholder='Escreva uma nota...';
    if(titleEl) titleEl.placeholder='Nome do card';
    oldUpdatePanel();
    if(isPhotoNode(selectedNode)){
      const typeText=document.getElementById('rp-type-text');
      const typeIcon=document.getElementById('rp-type-icon');
      const typeSelect=document.getElementById('rp-type-select');
      if(typeText) typeText.textContent='Imagem';
      if(typeIcon) typeIcon.textContent='🖼️';
      if(typeSelect) typeSelect.value='card';
      const title=document.getElementById('rp-title');
      const note=document.getElementById('rp-note');
      const noteLabel=document.getElementById('rp-note-label');
      if(title) { title.value=''; title.placeholder='Imagem sem título'; }
      if(note) { note.value=selectedNode.note||''; note.placeholder='Escreva uma descrição para esta imagem...'; }
      if(noteLabel) noteLabel.textContent='Descrição da imagem';
    }
  };



  const oldShowCtxMenuForImageDescription = window.showCtxMenu || showCtxMenu;
  window.showCtxMenu = showCtxMenu = function(x,y,node){
    oldShowCtxMenuForImageDescription(x,y,node);
    const edit = document.getElementById('ctx-edit');
    if(edit && isPhotoNode(node)) edit.querySelector('span').textContent = 'Editar descrição';
    else if(edit) edit.querySelector('span').textContent = 'Editar texto';
  };

  const oldCtxEditClick = document.getElementById('ctx-edit').onclick;
  document.getElementById('ctx-edit').onclick = function(){
    if(isPhotoNode(selectedNode)){
      selectNodeObj(selectedNode);
      const panel=document.getElementById('right-panel');
      if(panel) panel.classList.add('show');
      const propsTab=document.querySelector('.rpanel-tab[data-tab="props"]');
      if(propsTab) propsTab.click();
      const note=document.getElementById('rp-note');
      if(note) setTimeout(()=>note.focus(), 50);
      hideContextMenu();
      return;
    }
    if(typeof oldCtxEditClick === 'function') oldCtxEditClick();
  };

  try{ draw(); }catch(e){}
})();
</script>


<!-- PATCH DEFINITIVO: filhos nunca ficam atrás do card pai -->
<script id="parent-child-layer-lock-final-patch">
(function(){
  if(window.__parentChildLayerLockFinalPatch) return;
  window.__parentChildLayerLockFinalPatch = true;

  function nodeBodyH(node){ return node && node.minimized ? 44 : (node ? node.height : 0); }
  function getParent(node){ return node && node.parentId ? nodes.find(n => n.id === node.parentId) : null; }
  function originalIndexMap(){ const m = new Map(); (nodes || []).forEach((n,i)=>m.set(n.id,i)); return m; }
  function byLayerThenOriginal(idx){
    return function(a,b){
      const za = a && Number.isFinite(a.zIndex) ? a.zIndex : 0;
      const zb = b && Number.isFinite(b.zIndex) ? b.zIndex : 0;
      if(za !== zb) return za - zb;
      return (idx.get(a.id) || 0) - (idx.get(b.id) || 0);
    };
  }

  function normalizeParentChildLinks(){
    if(!Array.isArray(nodes)) return;
    nodes.forEach(n => { if(n && !Array.isArray(n.children)) n.children = []; });
    nodes.forEach(n => {
      if(!n || !n.parentId) return;
      const p = getParent(n);
      if(!p){ n.parentId = null; return; }
      p.children = p.children || [];
      if(!p.children.includes(n.id)) p.children.push(n.id);
    });
    nodes.forEach(p => {
      if(!p || !Array.isArray(p.children)) return;
      p.children = p.children.filter(id => {
        const ch = nodes.find(n => n.id === id);
        return !!ch && ch.parentId === p.id;
      });
    });
  }

  function hierarchyDepth(node){
    let d = 0, cur = node, guard = 0;
    while(cur && cur.parentId && guard++ < 50){
      const p = getParent(cur);
      if(!p) break;
      d++; cur = p;
    }
    return d;
  }

  function enforceChildLayerNumbers(){
    normalizeParentChildLinks();
    const orderedByDepth = [...(nodes || [])].sort((a,b)=>hierarchyDepth(a)-hierarchyDepth(b));
    orderedByDepth.forEach(n => {
      const p = getParent(n);
      if(p){
        const minZ = (Number.isFinite(p.zIndex) ? p.zIndex : 0) + 1;
        if(!Number.isFinite(n.zIndex) || n.zIndex < minZ) n.zIndex = minZ;
      } else if(!Number.isFinite(n.zIndex)) {
        n.zIndex = 0;
      }
    });
  }

  function renderOrder(){
    enforceChildLayerNumbers();
    const idx = originalIndexMap();
    const result = [];
    const visited = new Set();
    const sortFn = byLayerThenOriginal(idx);

    function visit(n){
      if(!n || visited.has(n.id)) return;
      visited.add(n.id);
      result.push(n);
      const kids = (n.children || [])
        .map(id => nodes.find(x => x.id === id))
        .filter(Boolean)
        .sort(sortFn);
      kids.forEach(visit);
    }

    const roots = (nodes || []).filter(n => !n.parentId || !getParent(n)).sort(sortFn);
    roots.forEach(visit);
    (nodes || []).filter(n => !visited.has(n.id)).sort(sortFn).forEach(visit);
    return result;
  }

  function syncArrayToRenderOrder(){
    const ordered = renderOrder();
    if(ordered.length === nodes.length) nodes = ordered;
  }

  // Desenho definitivo: o pai sempre é desenhado antes dos filhos.
  const previousDraw = window.draw || draw;
  window.draw = draw = function(){
    try{ syncArrayToRenderOrder(); }catch(e){}
    ctx.clearRect(0,0,W,H);
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);
    if(settings.showGrid && typeof drawGrid === 'function') drawGrid();
    connections.forEach(drawConn);
    renderOrder().forEach(drawNode);
    ctx.restore();
    const zv = document.getElementById('zoom-val');
    if(zv) zv.textContent = Math.round(camera.zoom*100)+'%';
    const st = document.getElementById('status-text');
    if(st) st.textContent = `Cards: ${nodes.length} | Conexões: ${connections.length} | Zoom: ${Math.round(camera.zoom*100)}%`;
  };

  // Clique/seleção também respeita a camada visual: filhos são detectados antes do pai.
  const oldGetNodeAt = window.getNodeAt || getNodeAt;
  window.getNodeAt = getNodeAt = function(x,y){
    const ordered = renderOrder();
    for(let i = ordered.length - 1; i >= 0; i--){
      const n = ordered[i];
      if(!n) continue;
      const h = nodeBodyH(n);
      const extra = (typeof labelHeight === 'function') ? labelHeight(n) : 26/camera.zoom;
      const pad = 14/camera.zoom;
      if(x >= n.x - pad && x <= n.x + n.width + pad && y >= n.y && y <= n.y + h + extra + 8/camera.zoom) return n;
    }
    return oldGetNodeAt(x,y);
  };

  function bringChildrenAbove(parent){
    if(!parent) return;
    enforceChildLayerNumbers();
    (parent.children || []).forEach(id => {
      const ch = nodes.find(n => n.id === id);
      if(ch){
        ch.zIndex = Math.max(ch.zIndex || 0, (parent.zIndex || 0) + 1);
        bringChildrenAbove(ch);
      }
    });
    syncArrayToRenderOrder();
  }

  function clampSelectedBehindParent(){
    if(!selectedNode) return;
    const p = getParent(selectedNode);
    if(p){
      selectedNode.zIndex = Math.max(selectedNode.zIndex || 0, (p.zIndex || 0) + 1);
    }
    bringChildrenAbove(selectedNode);
  }

  // Menu de camadas: não deixa um filho ser enviado para trás do pai.
  const frontBtn = document.getElementById('ctx-layer-front');
  const backBtn = document.getElementById('ctx-layer-back');
  if(frontBtn) frontBtn.onclick = function(){
    if(selectedNode){ selectedNode.zIndex = (selectedNode.zIndex || 0) + 1; clampSelectedBehindParent(); saveHist(); draw(); triggerSave(); }
    if(typeof hideContextMenu === 'function') hideContextMenu();
  };
  if(backBtn) backBtn.onclick = function(){
    if(selectedNode){
      const p = getParent(selectedNode);
      selectedNode.zIndex = p ? Math.max((p.zIndex || 0) + 1, (selectedNode.zIndex || 0) - 1) : (selectedNode.zIndex || 0) - 1;
      clampSelectedBehindParent(); saveHist(); draw(); triggerSave();
    }
    if(typeof hideContextMenu === 'function') hideContextMenu();
  };

  const upBtn = document.getElementById('bb-up');
  if(upBtn) upBtn.onclick = function(){
    if(selectedNode){ selectedNode.zIndex = (selectedNode.zIndex || 0) + 1; clampSelectedBehindParent(); saveHist(); draw(); triggerSave(); }
  };

  // Depois de qualquer arraste, resize, criação, importação ou carregamento antigo, reorganiza as camadas.
  document.addEventListener('mouseup', function(){
    try{ enforceChildLayerNumbers(); syncArrayToRenderOrder(); draw(); if(typeof triggerSave === 'function') triggerSave(); }catch(e){}
  }, true);

  const oldTriggerSave = window.triggerSave || triggerSave;
  window.triggerSave = triggerSave = function(){
    try{ enforceChildLayerNumbers(); syncArrayToRenderOrder(); }catch(e){}
    return oldTriggerSave.apply(this, arguments);
  };

  try{ enforceChildLayerNumbers(); syncArrayToRenderOrder(); draw(); }catch(e){}
})();
</script>



<!-- PATCH FINAL: cores premium, título/texto separados, ícone sem fundo, animações e conexões reais -->
<style id="premium-canvas-final-patch-css">
  .premium-toggle-colors{width:100%;margin-top:8px;border:1px solid var(--border);background:var(--bg2);color:var(--text2);border-radius:8px;padding:7px 9px;font:600 11px Inter,sans-serif;cursor:pointer;transition:all .15s;}
  .premium-toggle-colors:hover{background:var(--bg3);color:var(--text);border-color:var(--accent)}
  .rpanel-colors.premium-compact .rpanel-swatch.premium-extra,
  .color-dots.premium-compact .cdot.premium-extra{display:none;}
  .rpanel-colors.premium-compact.expanded .rpanel-swatch.premium-extra,
  .color-dots.premium-compact.expanded .cdot.premium-extra{display:block;}
  .rpanel-swatch,.cdot{box-shadow:inset 0 0 0 1px rgba(0,0,0,.05),0 1px 3px var(--shadow);}
  .rpanel-swatch.on,.cdot.on{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--accent),0 4px 12px var(--shadow2);transform:scale(1.04);}
  .premium-section-note{font-size:11px;color:var(--text3);margin-top:6px;line-height:1.35;}
  #rp-animation-select{margin-top:6px;}
  .premium-hidden-option{display:none!important;}
</style>
<script id="premium-canvas-final-patch-js">
(function(){
  'use strict';
  if(window.__premiumCanvasFinalPatch) return;
  window.__premiumCanvasFinalPatch=true;

  const PREMIUM_COLORS=[
    ['Preto','#111827','#111827'],['Branco','#ffffff','#ffffff'],['Cinza','#6b7280','#e5e7eb'],['Grafite','#374151','#d1d5db'],
    ['Vermelho','#ef4444','#fee2e2'],['Vermelho coral','#f43f5e','#ffe4e6'],['Coral','#fb7185','#fff1f2'],['Coral laranja','#f97316','#ffedd5'],
    ['Laranja','#fb923c','#fed7aa'],['Âmbar','#f59e0b','#fef3c7'],['Amarelo ouro','#eab308','#fef9c3'],['Amarelo lima','#a3e635','#ecfccb'],
    ['Lima','#84cc16','#ecfccb'],['Verde claro','#4ade80','#dcfce7'],['Verde','#22c55e','#dcfce7'],['Esmeralda','#10b981','#d1fae5'],
    ['Menta','#14b8a6','#ccfbf1'],['Teal','#0d9488','#ccfbf1'],['Ciano','#06b6d4','#cffafe'],['Azul céu','#0ea5e9','#e0f2fe'],
    ['Azul','#3b82f6','#dbeafe'],['Azul índigo','#6366f1','#e0e7ff'],['Índigo','#4f46e5','#e0e7ff'],['Violeta','#8b5cf6','#ede9fe'],
    ['Roxo','#a855f7','#f3e8ff'],['Magenta','#c026d3','#fae8ff'],['Fúcsia','#d946ef','#fae8ff'],['Rosa','#ec4899','#fce7f3'],
    ['Rose','#f43f5e','#ffe4e6'],['Marrom','#92400e','#fef3c7']
  ];
  const FIRST_COUNT=14;
  const byId=id=>document.getElementById(id);
  const cssVar=name=>getComputedStyle(document.documentElement).getPropertyValue(name).trim()||getComputedStyle(document.body).getPropertyValue(name).trim();
  function colorOf(v,f){ return (!v||v==='none'||v==='default')?f:v; }
  function now(){ return performance.now()/1000; }
  function ensureArray(v){ return Array.isArray(v)?v:[]; }

  function makeSwatch(color, datasetKey, value, label, i, round=true){
    const el=document.createElement('div');
    el.className=round?'rpanel-swatch':'cdot';
    if(i>=FIRST_COUNT) el.classList.add('premium-extra');
    el.style.background=color;
    el.title=label;
    el.dataset[datasetKey]=value;
    return el;
  }
  function makeNoneSwatch(datasetKey,label){
    const el=document.createElement('div');
    el.className='rpanel-swatch swatch-none';
    el.title=label||'Sem cor';
    el.dataset[datasetKey]='none';
    return el;
  }
  function addToggleAfter(container){
    if(!container || container.nextElementSibling?.classList?.contains('premium-toggle-colors')) return;
    container.classList.add('premium-compact');
    const btn=document.createElement('button');
    btn.type='button'; btn.className='premium-toggle-colors'; btn.textContent='Ver mais cores';
    btn.onclick=()=>{ container.classList.toggle('expanded'); btn.textContent=container.classList.contains('expanded')?'Ver menos cores':'Ver mais cores'; };
    container.insertAdjacentElement('afterend',btn);
  }
  function buildPremiumPalette(containerId, datasetKey, mode, includeNone=true){
    const c=byId(containerId); if(!c) return;
    c.innerHTML='';
    if(includeNone) c.appendChild(makeNoneSwatch(datasetKey,'Sem cor'));
    PREMIUM_COLORS.forEach((p,i)=>c.appendChild(makeSwatch(mode==='soft'?p[2]:p[1],datasetKey,mode==='soft'?p[2]:p[1],p[0]+' '+(mode==='soft'?'suave':'forte'),i)));
    addToggleAfter(c);
  }
  function buildConnPalette(){
    const c=byId('rp-conn-colors'); if(!c) return;
    c.innerHTML='';
    const def=makeSwatch(cssVar('--border2')||'#d1d5db','cc','default','Padrão',0,false); c.appendChild(def);
    PREMIUM_COLORS.forEach((p,i)=>c.appendChild(makeSwatch(p[1],'cc',p[1],p[0]+' forte',i,false)));
    addToggleAfter(c);
  }
  function ensurePanelUI(){
    buildPremiumPalette('rp-bg-swatches','bg','soft',true);
    buildPremiumPalette('rp-border-swatches','border','strong',true);
    buildPremiumPalette('rp-text-swatches','tc','strong',false);
    buildConnPalette();

    const textSection=byId('rp-text-swatches')?.closest('.rpanel-section');
    if(textSection){
      const label=textSection.querySelector('.rpanel-label'); if(label) label.textContent='Texto interno / nota';
      if(!byId('rp-title-swatches')){
        const sec=document.createElement('div'); sec.className='rpanel-section';
        sec.innerHTML='<div class="rpanel-label">Cor do título</div><div class="rpanel-colors" id="rp-title-swatches"></div><div class="premium-section-note">A cor do título controla apenas o nome exibido fora do card.</div>';
        textSection.parentNode.insertBefore(sec,textSection);
      }
      buildPremiumPalette('rp-title-swatches','titlec','strong',false);
    }
    const styleTab=byId('tab-style');
    if(styleTab && !byId('rp-animation-select')){
      const sec=document.createElement('div'); sec.className='rpanel-section';
      sec.innerHTML='<div class="rpanel-label">Animação real no canvas</div><select id="rp-animation-select" class="rpanel-input rpanel-select"><option value="none">Sem animação</option><option value="hover">Hover suave</option><option value="glow">Glow</option><option value="pulse">Pulsar</option><option value="float">Flutuar</option><option value="zoom">Zoom</option><option value="fade">Fade</option><option value="shake">Shake</option></select>';
      styleTab.appendChild(sec);
      byId('rp-animation-select').addEventListener('change',e=>{ if(selectedNode){ selectedNode.animation=e.target.value; saveHist(); draw(); triggerSave(); }});
    }
    const connTab=byId('tab-conn');
    if(connTab && !byId('rp-conn-glow-toggle')){
      const sec=document.createElement('div'); sec.className='rpanel-section';
      sec.innerHTML='<div class="rpanel-label">Efeitos da linha</div><div class="rpanel-row"><label>Glow</label><div class="toggle" id="rp-conn-glow-toggle"><div class="toggle-knob"></div></div></div><div class="rpanel-row"><label>Animação</label><div class="toggle" id="rp-conn-anim-toggle"><div class="toggle-knob"></div></div></div>';
      const del=byId('rp-delete-conn-btn'); connTab.insertBefore(sec,del||null);
      byId('rp-conn-glow-toggle').onclick=()=>{ if(selectedConn){ selectedConn.glow=!selectedConn.glow; updateConnEffectsPanel(); draw(); triggerSave(); }};
      byId('rp-conn-anim-toggle').onclick=()=>{ if(selectedConn){ selectedConn.animated=!selectedConn.animated; updateConnEffectsPanel(); draw(); triggerSave(); }};
    }
    // Oculta itens sem implementação real em vez de deixar menus fake.
    ['ctx-behavior','ctx-links','bb-group','bb-crop','bb-more'].forEach(id=>{ const el=byId(id); if(el) el.classList.add('premium-hidden-option'); });
  }

  function migrateNode(n){
    if(!n) return;
    if(!('titleColor' in n)) n.titleColor=n.textColor||'#1a1a18';
    if(!('textColor' in n)) n.textColor='#525250';
    if(!('animation' in n)) n.animation='none';
    if(!('iconBg' in n)) n.iconBg=false;
    if(!Array.isArray(n.children)) n.children=[];
  }
  function migrateAll(){
    Object.values(workspaces||{}).forEach(w=>{
      ensureArray(w.nodes).forEach(migrateNode);
      ensureArray(w.connections).forEach(c=>{ if(!('glow' in c)) c.glow=false; if(!('animated' in c)) c.animated=false; });
    });
    ensureArray(nodes).forEach(migrateNode);
    ensureArray(connections).forEach(c=>{ if(!('glow' in c)) c.glow=false; if(!('animated' in c)) c.animated=false; });
  }

  let hoverNode=null;
  cvs.addEventListener('mousemove',function(e){
    const r=cvs.getBoundingClientRect();
    const x=(e.clientX-r.left-camera.x)/camera.zoom, y=(e.clientY-r.top-camera.y)/camera.zoom;
    const h=(typeof getNodeAt==='function')?getNodeAt(x,y):null;
    if(h!==hoverNode){ hoverNode=h; draw(); }
  },true);
  cvs.addEventListener('mouseleave',()=>{ if(hoverNode){ hoverNode=null; draw(); }},true);

  function labelColor(node){ return colorOf(node.titleColor, colorOf(node.textColor, cssVar('--text')||'#111827')); }
  function noteColor(node){ return colorOf(node.textColor, cssVar('--text2')||'#525250'); }
  function bodyH(node,isMin){ return isMin?44:node.height; }
  function drawExternalTitle(node,isMin){
    const title=String(node.title||'').trim(); if(!title || node.type==='icon') return;
    const x=node.x, y=node.y, w=node.width, h=bodyH(node,isMin);
    const fs=(node.textSize||13)/camera.zoom;
    ctx.save(); ctx.font=`700 ${fs}px Inter`; ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillStyle=labelColor(node); ctx.shadowColor='transparent';
    ctx.fillText(fitText(ctx,title,Math.max(60/camera.zoom,w+42/camera.zoom)),x+w/2,y+h+6/camera.zoom);
    ctx.restore();
  }
  function applyNodeMotion(node,isSel,drawBody){
    const t=now(), anim=node.animation||'none', hovering=hoverNode&&hoverNode.id===node.id;
    let dx=0,dy=0,scale=1,alpha=1,shadow=0;
    if(hovering || anim==='hover') scale*=hovering?1.035:1;
    if(anim==='pulse') scale*=1+Math.sin(t*3.2)*0.025;
    if(anim==='float') dy+=Math.sin(t*2.1+node.x*.01)*5/camera.zoom;
    if(anim==='zoom') scale*=1+Math.sin(t*2.4)*0.018;
    if(anim==='fade') alpha*=0.78+Math.sin(t*2.2)*0.18;
    if(anim==='shake') dx+=Math.sin(t*18)*2.4/camera.zoom;
    if(anim==='glow' || hovering || isSel) shadow=(anim==='glow'?18:(hovering?10:0));
    ctx.save();
    const cx=node.x+node.width/2, cy=node.y+bodyH(node,node.minimized)/2;
    ctx.translate(cx+dx,cy+dy); ctx.scale(scale,scale); ctx.translate(-cx,-cy);
    ctx.globalAlpha*=alpha;
    if(shadow){ ctx.shadowColor=labelColor(node); ctx.shadowBlur=shadow/camera.zoom; }
    drawBody();
    ctx.restore();
  }
  function drawIconNode(node,isSel){
    const x=node.x,y=node.y,w=node.width,h=node.height;
    const icon=node.emoji || (node.type==='folder'?'📁':node.type==='note'?'🗒️':'');
    if(!icon) { drawExternalTitle(node,false); return; }
    ctx.save();
    const size=node.iconSize||(node.type==='icon'?42:44); // proporcional
    const cy=y+Math.min(h*.44,44/camera.zoom)+(node.iconY||0);
    const cx=x+w/2+(node.iconX||0);
    if(node.iconBg){
      ctx.fillStyle=colorOf(node.bgColor,cssVar('--bg3')||'#e5e7eb');
      ctx.strokeStyle=colorOf(node.borderColor,cssVar('--border')||'#d1d5db');
      ctx.lineWidth=Math.max(1,node.borderWidth||1)/camera.zoom;
      roundRect(ctx,cx-size*.68,cy-size*.68,size*1.36,size*1.36,12/camera.zoom);
      ctx.fill(); ctx.stroke();
    }
    ctx.shadowColor='transparent'; ctx.font=`${size}px Arial`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(icon,cx,cy);
    if(isSel){ ctx.strokeStyle='#3b82f6'; ctx.lineWidth=1.5/camera.zoom; ctx.setLineDash([5/camera.zoom,4/camera.zoom]); roundRect(ctx,x+5/camera.zoom,y+4/camera.zoom,w-10/camera.zoom,Math.max(42/camera.zoom,h*.62),10/camera.zoom); ctx.stroke(); ctx.setLineDash([]); }
    if(node.locked){ ctx.font=`${12/camera.zoom}px Arial`; ctx.textAlign='right'; ctx.textBaseline='top'; ctx.fillStyle='rgba(80,80,80,.65)'; ctx.fillText('🔒',x+w-4/camera.zoom,y+2/camera.zoom); }
    ctx.restore();
    drawExternalTitle(node,false);
  }
  function drawCardNode(node,isSel,isMin){
    const x=node.x,y=node.y,w=node.width,h=bodyH(node,isMin);
    const pad=14; // proporcional ao card — sem dividir por zoom
    renderShape(ctx,node,isSel,isMin);
    ctx.save();
    if(typeof drawCardShape==='function'){ drawCardShape(ctx,{...node,height:h}); ctx.clip(); }
    let textY=y+pad;
    if(node.imageUrl && node.imgObj){
      const imgH=Math.min(h*.48,h-36);
      try{ ctx.drawImage(node.imgObj,x+2,y+2,w-4,imgH); }catch(e){}
      textY=y+imgH+8;
    }
    if(node.emoji || node.iconUrl){ renderIcon(ctx,node,false); textY += (node.iconSize||28)+8 + Math.max(0,node.iconY||0); }
    if(node.note && !isMin){
      // noteSz e lineH em coordenadas de canvas (escalam com o card, sem dividir por zoom)
      const noteSz=node.noteSize||11;
      const lineH=noteSz+4;
      const sh=(node.shapeType||node.shape||'rectangle').toLowerCase();
      const sc={circle:{wf:.66,cy:.50},hexagon:{wf:.72,cy:.50},octagon:{wf:.76,cy:.50},diamond:{wf:.50,cy:.50},triangle:{wf:.46,cy:.64},star:{wf:.46,cy:.50},pill:{wf:.70,cy:.50}}[sh];
      const isManual=!!node.textManual;
      const cw=(!isManual&&sc)?Math.min(w,h)*sc.wf:w-pad*2;
      ctx.font=`${node.textItalic?'italic ':''}400 ${noteSz}px Inter`;
      ctx.textAlign=(!isManual&&sc)?'center':(node.textAlign||'left');
      ctx.textBaseline='top';
      ctx.fillStyle=noteColor(node); ctx.strokeStyle=noteColor(node);
      const padLeft=(node.textPadLeft||0);
      const lx=ctx.textAlign==='center'?x+w/2+padLeft:(ctx.textAlign==='right'?x+w-pad+padLeft:x+pad+padLeft);
      if(!isManual&&sc){
        const allLines=wrapLines(ctx,node.note,cw,50);
        const totalH=allLines.length*lineH;
        const centerY=y+h*sc.cy;
        const tY=Math.max(textY,centerY-totalH/2);
        const maxL=Math.max(0,Math.floor((y+h-pad-tY)/lineH));
        allLines.slice(0,maxL).forEach((ln,i)=>{ const ly=tY+i*lineH; ctx.fillText(ln,lx,ly); if(node.textUnderline)drawUnderline(ctx,ln,lx,ly,noteSz,ctx.textAlign); });
      } else {
        const manualY=textY+(node.textPadTop||0);
        const maxLines=Math.max(0,Math.floor((y+h-pad-manualY)/lineH));
        wrapLines(ctx,node.note,cw,maxLines).forEach((ln,i)=>{ const ly=manualY+i*lineH; ctx.fillText(ln,lx,ly); if(node.textUnderline)drawUnderline(ctx,ln,lx,ly,noteSz,ctx.textAlign); });
      }
    }
    ctx.restore();
    drawExternalTitle(node,isMin);
    if(isSel && !node.locked){ ctx.save(); ctx.fillStyle='#3b82f6'; ctx.beginPath(); ctx.arc(x+w,y+h,5/camera.zoom,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  }
  const previousDrawNode=window.drawNode || drawNode;
  window.drawNode=drawNode=function(node){
    migrateNode(node);
    if(inlineEditing && inlineEditing.id===node.id) return;
    if(node.imageUrl && !node.imgObj) loadNodeImage(node);
    const isSel=selectedNode&&selectedNode.id===node.id;
    const isMin=node.minimized || (settings.autoMinimize && !isSel);
    applyNodeMotion(node,isSel,()=>{
      if(node.type==='folder'||node.type==='note'||node.type==='icon') drawIconNode(node,isSel);
      else drawCardNode(node,isSel,isMin);
    });
  };

  function connEndpoints(conn){
    const f=nodes.find(n=>n.id===conn.from), t=nodes.find(n=>n.id===conn.to); if(!f||!t) return null;
    return {x1:f.x+f.width/2,y1:f.y+(f.minimized?44:f.height)/2,x2:t.x+t.width/2,y2:t.y+(t.minimized?44:t.height)/2};
  }
  window.drawConn=drawConn=function(conn){
    const ep=connEndpoints(conn); if(!ep) return;
    const style=conn.style||settings.defaultConnStyle, lw=conn.width||2, col=conn.color==='default'||!conn.color?cssVar('--connection-color'):conn.color;
    const isSel=selectedConn&&selectedConn.id===conn.id, isRelated=settings.highlightConn&&selectedNode&&(conn.from===selectedNode.id||conn.to===selectedNode.id);
    function strongFromPalette(value){
      if(!value || value==='none' || value==='default') return '';
      const found=PREMIUM_COLORS.find(p=>p[1].toLowerCase()===String(value).toLowerCase() || p[2].toLowerCase()===String(value).toLowerCase());
      return found?found[1]:value;
    }
    function selectedElementColor(){
      if(!selectedNode) return col;
      return strongFromPalette(selectedNode.borderColor) || strongFromPalette(selectedNode.bgColor) || strongFromPalette(selectedNode.titleColor) || strongFromPalette(selectedNode.textColor) || col;
    }
    const stroke=isRelated?selectedElementColor():(isSel?col:col);
    const curve=conn.curve??70, t=now();
    ctx.save(); ctx.strokeStyle=stroke; ctx.lineWidth=(isSel?Math.max(3,lw):lw)/camera.zoom; ctx.globalAlpha=conn.opacity||1;
    if(conn.glow||isSel){ ctx.shadowColor=stroke; ctx.shadowBlur=(conn.glow?14:8)/camera.zoom; }
    if(style==='dashed'||conn.animated){ ctx.setLineDash([8/camera.zoom,5/camera.zoom]); ctx.lineDashOffset=conn.animated?-t*18/camera.zoom:0; }
    ctx.beginPath();
    if(style==='straight'||style==='dashed'){ ctx.moveTo(ep.x1,ep.y1); ctx.lineTo(ep.x2,ep.y2); }
    else if(style==='stepped'){ const mx=(ep.x1+ep.x2)/2; ctx.moveTo(ep.x1,ep.y1); ctx.lineTo(mx,ep.y1); ctx.lineTo(mx,ep.y2); ctx.lineTo(ep.x2,ep.y2); }
    else { const dx=ep.x2-ep.x1,dy=ep.y2-ep.y1,len=Math.max(1,Math.hypot(dx,dy)),nx=-dy/len,ny=dx/len,mx=(ep.x1+ep.x2)/2,my=(ep.y1+ep.y2)/2; ctx.moveTo(ep.x1,ep.y1); ctx.quadraticCurveTo(mx+nx*curve,my+ny*curve,ep.x2,ep.y2); }
    ctx.stroke(); ctx.setLineDash([]);
    if(settings.showArrows){ const ang=Math.atan2(ep.y2-ep.y1,ep.x2-ep.x1), as=9/camera.zoom; ctx.save(); ctx.translate(ep.x2,ep.y2); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-as,-as/2.2); ctx.lineTo(-as,as/2.2); ctx.closePath(); ctx.fillStyle=stroke; ctx.fill(); ctx.restore(); }
    ctx.restore();
  };

  function updateConnEffectsPanel(){
    if(!selectedConn) return;
    const g=byId('rp-conn-glow-toggle'), a=byId('rp-conn-anim-toggle');
    if(g) g.classList.toggle('on',!!selectedConn.glow);
    if(a) a.classList.toggle('on',!!selectedConn.animated);
  }
  const oldPopulate=window.populateConnPanel || (typeof populateConnPanel==='function'?populateConnPanel:null);
  window.populateConnPanel=populateConnPanel=function(conn){ if(oldPopulate) oldPopulate(conn); updateConnEffectsPanel(); };

  const oldUpdate=window.updatePanel || updatePanel;
  window.updatePanel=updatePanel=function(){
    if(oldUpdate) oldUpdate();
    if(!selectedNode) return;
    migrateNode(selectedNode);
    const anim=byId('rp-animation-select'); if(anim) anim.value=selectedNode.animation||'none';
    byId('rp-title-swatches')?.querySelectorAll('.rpanel-swatch').forEach(s=>s.classList.toggle('on',s.dataset.titlec===(selectedNode.titleColor||'#1a1a18')));
    byId('rp-text-swatches')?.querySelectorAll('.rpanel-swatch').forEach(s=>s.classList.toggle('on',s.dataset.tc===(selectedNode.textColor||'#525250')));
    const tog=byId('rp-icon-bg-toggle'); if(tog) tog.classList.toggle('on',!selectedNode.iconBg);
  };

  function bindPaletteClicks(){
    byId('rp-title-swatches')?.querySelectorAll('.rpanel-swatch').forEach(s=>s.onclick=()=>{ if(selectedNode){ selectedNode.titleColor=s.dataset.titlec||'#1a1a18'; updatePanel(); saveHist(); draw(); triggerSave(); }});
    byId('rp-text-swatches')?.querySelectorAll('.rpanel-swatch').forEach(s=>s.onclick=()=>{ if(selectedNode){ selectedNode.textColor=s.dataset.tc||'#525250'; updatePanel(); saveHist(); draw(); triggerSave(); }});
    byId('rp-bg-swatches')?.querySelectorAll('.rpanel-swatch').forEach(s=>s.onclick=()=>{ if(selectedNode){ selectedNode.bgColor=s.dataset.bg||'none'; if(selectedNode.bgOpacity===undefined) selectedNode.bgOpacity=1; updatePanel(); saveHist(); draw(); triggerSave(); }});
    byId('rp-border-swatches')?.querySelectorAll('.rpanel-swatch').forEach(s=>s.onclick=()=>{ if(selectedNode){ selectedNode.borderColor=s.dataset.border||'none'; updatePanel(); saveHist(); draw(); triggerSave(); }});
    byId('rp-conn-colors')?.querySelectorAll('.cdot').forEach(s=>s.onclick=()=>{ if(selectedConn){ selectedConn.color=s.dataset.cc||'default'; byId('rp-conn-colors').querySelectorAll('.cdot').forEach(x=>x.classList.remove('on')); s.classList.add('on'); saveHist(); draw(); triggerSave(); }});
  }

  const oldCreate=window.createNode || createNode;
  window.createNode=createNode=function(x,y,type='card'){
    const n=oldCreate(x,y,type); migrateNode(n); n.titleColor=n.titleColor||'#1a1a18'; n.textColor=n.textColor||'#525250'; return n;
  };

  const oldLoad=window.loadSave || (typeof loadSave==='function'?loadSave:null);
  if(oldLoad){ window.loadSave=loadSave=function(){ const ok=oldLoad(); migrateAll(); return ok; }; }
  const oldDoSave=window.doSave || (typeof doSave==='function'?doSave:null);
  if(oldDoSave){ window.doSave=doSave=function(){ migrateAll(); return oldDoSave(); }; }

  ensurePanelUI();
  bindPaletteClicks();
  migrateAll();
  updateConnEffectsPanel();
  if(selectedNode) updatePanel();
  let animFrame=null;
  function tick(){
    const active=(nodes||[]).some(n=>n.animation&&n.animation!=='none') || (connections||[]).some(c=>c.animated);
    if(active) { draw(); animFrame=requestAnimationFrame(tick); } else { animFrame=null; }
  }
  const oldDraw=window.draw || draw;
  window.draw=draw=function(){ oldDraw(); if(!animFrame){ const active=(nodes||[]).some(n=>n.animation&&n.animation!=='none') || (connections||[]).some(c=>c.animated); if(active) animFrame=requestAnimationFrame(tick); } };
  draw();
})();
</script>


<style id="palette-order-fix-css">
  .rpanel-swatch[style*="255, 255, 255"], .rpanel-swatch[style*="#ffffff"], .cdot[style*="#ffffff"]{border-color:var(--border2);}
</style>


<!-- PATCH FINAL 2: paletas uniformes + conexões selecionadas/relacionadas + ajuste manual preservado -->
<style id="uniform-palettes-and-manual-lines-css">
  .rpanel-colors.premium-compact .rpanel-swatch.premium-extra,
  .color-dots.premium-compact .cdot.premium-extra{display:none;}
  .rpanel-colors.premium-compact.expanded .rpanel-swatch.premium-extra,
  .color-dots.premium-compact.expanded .cdot.premium-extra{display:block;}
  .rpanel-swatch[title="Branco"], .cdot[title="Branco"]{border-color:var(--border2)!important;}
</style>
<script id="uniform-palettes-and-manual-lines-js">
(function(){
  'use strict';
  if(window.__uniformPalettesAndManualLinesPatch) return;
  window.__uniformPalettesAndManualLinesPatch = true;

  const NODE_SELECTED_BLUE = '#3b82f6';
  const CONN_SELECTED_ORANGE = '#f97316';
  const FIRST_COUNT = 14;
  const PAL = [
    ['Preto','#111827'],['Branco','#ffffff'],['Cinza','#6b7280'],
    ['Vermelho','#ef4444'],['Vermelho coral','#f43f5e'],['Coral','#fb7185'],
    ['Coral laranja','#f97316'],['Laranja','#fb923c'],['Âmbar','#f59e0b'],
    ['Amarelo','#eab308'],['Amarelo lima','#a3e635'],['Lima','#84cc16'],
    ['Verde claro','#4ade80'],['Verde','#22c55e'],['Esmeralda','#10b981'],
    ['Menta','#14b8a6'],['Teal','#0d9488'],['Ciano','#06b6d4'],
    ['Azul céu','#0ea5e9'],['Azul','#3b82f6'],['Azul índigo','#6366f1'],
    ['Índigo','#4f46e5'],['Violeta','#8b5cf6'],['Roxo','#a855f7'],
    ['Magenta','#c026d3'],['Fúcsia','#d946ef'],['Rosa','#ec4899'],
    ['Rose','#f43f5e'],['Marrom','#92400e'],['Dourado','#b45309']
  ];
  const byId = id => document.getElementById(id);
  const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || getComputedStyle(document.body).getPropertyValue(name).trim();

  function noneSwatch(key){
    const el=document.createElement('div');
    el.className='rpanel-swatch swatch-none';
    el.dataset[key]='none';
    el.title='Sem cor';
    return el;
  }
  function swatch(color,key,label,i,klass='rpanel-swatch'){
    const el=document.createElement('div');
    el.className=klass;
    if(i>=FIRST_COUNT) el.classList.add('premium-extra');
    el.style.background=color;
    el.dataset[key]=color;
    el.title=label;
    return el;
  }
  function ensureToggle(container){
    if(!container) return;
    container.classList.add('premium-compact');
    let btn=container.nextElementSibling;
    if(!btn || !btn.classList || !btn.classList.contains('premium-toggle-colors')){
      btn=document.createElement('button');
      btn.type='button'; btn.className='premium-toggle-colors';
      container.insertAdjacentElement('afterend',btn);
    }
    btn.textContent=container.classList.contains('expanded')?'Ver menos cores':'Ver mais cores';
    btn.onclick=function(){ container.classList.toggle('expanded'); btn.textContent=container.classList.contains('expanded')?'Ver menos cores':'Ver mais cores'; };
  }
  function buildPalette(id,key,includeNone,onClick){
    const c=byId(id); if(!c) return;
    const oldExpanded=c.classList.contains('expanded');
    c.innerHTML='';
    if(includeNone) c.appendChild(noneSwatch(key));
    PAL.forEach((p,i)=>c.appendChild(swatch(p[1],key,p[0],i)));
    if(oldExpanded) c.classList.add('expanded');
    ensureToggle(c);
    c.querySelectorAll('.rpanel-swatch').forEach(el=>el.onclick=onClick(el));
  }
  function buildConnPalette(){
    const c=byId('rp-conn-colors'); if(!c) return;
    const oldExpanded=c.classList.contains('expanded');
    c.innerHTML='';
    const def=swatch(cssVar('--border2')||'#d1d5db','cc','Padrão',0,'cdot'); def.dataset.cc='default'; c.appendChild(def);
    PAL.forEach((p,i)=>c.appendChild(swatch(p[1],'cc',p[0],i,'cdot')));
    if(oldExpanded) c.classList.add('expanded');
    ensureToggle(c);
    c.querySelectorAll('.cdot').forEach(el=>el.onclick=function(){
      if(!selectedConn) return;
      selectedConn.color=el.dataset.cc||'default';
      c.querySelectorAll('.cdot').forEach(x=>x.classList.remove('on'));
      el.classList.add('on');
      if(typeof saveHist==='function') saveHist();
      draw(); if(typeof triggerSave==='function') triggerSave();
    });
  }
  function rebuildUniformPalettes(){
    buildPalette('rp-bg-swatches','bg',true,el=>function(){ if(selectedNode){ selectedNode.bgColor=el.dataset.bg||'none'; if(selectedNode.bgOpacity===undefined) selectedNode.bgOpacity=1; updatePanel(); if(typeof saveHist==='function') saveHist(); draw(); if(typeof triggerSave==='function') triggerSave(); }});
    buildPalette('rp-border-swatches','border',true,el=>function(){ if(selectedNode){ selectedNode.borderColor=el.dataset.border||'none'; updatePanel(); if(typeof saveHist==='function') saveHist(); draw(); if(typeof triggerSave==='function') triggerSave(); }});
    buildPalette('rp-title-swatches','titlec',false,el=>function(){ if(selectedNode){ selectedNode.titleColor=el.dataset.titlec; updatePanel(); if(typeof saveHist==='function') saveHist(); draw(); if(typeof triggerSave==='function') triggerSave(); }});
    buildPalette('rp-text-swatches','tc',false,el=>function(){ if(selectedNode){ selectedNode.textColor=el.dataset.tc; updatePanel(); if(typeof saveHist==='function') saveHist(); draw(); if(typeof triggerSave==='function') triggerSave(); }});
    buildConnPalette();
  }

  function ensureStepControl(){
    const curve = byId('rp-conn-curve');
    const connTab = byId('tab-conn');
    if(!connTab || byId('rp-conn-step')) return;
    const sec=document.createElement('div');
    sec.className='rpanel-section';
    sec.innerHTML='<div class="rpanel-label">Direção / degrau da linha</div><div class="rpanel-size-row" style="margin-top:6px;"><input type="range" class="rpanel-slider" id="rp-conn-step" min="-300" max="300" step="5" value="0"><span class="rpanel-size-val" id="rp-conn-step-val">Auto</span></div><div class="premium-section-note">Use em linhas em degrau para empurrar a quebra para esquerda/direita. Para curvas, clique e arraste a linha para criar/ajustar pontos manuais.</div>';
    const curveSec = curve ? curve.closest('.rpanel-section') : null;
    if(curveSec) curveSec.insertAdjacentElement('afterend',sec); else connTab.insertBefore(sec, connTab.firstChild);
    byId('rp-conn-step').addEventListener('input',function(e){
      if(!selectedConn) return;
      selectedConn.stepDistance=+e.target.value;
      byId('rp-conn-step-val').textContent=(+e.target.value===0)?'Auto':e.target.value;
      draw(); if(typeof triggerSave==='function') triggerSave();
    });
  }

  const oldPopulate = window.populateConnPanel || (typeof populateConnPanel==='function'?populateConnPanel:null);
  window.populateConnPanel = populateConnPanel = function(conn){
    if(oldPopulate) oldPopulate(conn);
    ensureStepControl();
    if(conn){
      const sl=byId('rp-conn-step'), val=byId('rp-conn-step-val');
      if(sl){ sl.value=conn.stepDistance||0; }
      if(val){ val.textContent=(conn.stepDistance||0)===0?'Auto':String(conn.stepDistance); }
      const dots=byId('rp-conn-colors');
      if(dots) dots.querySelectorAll('.cdot').forEach(d=>d.classList.toggle('on',(d.dataset.cc||'default')===(conn.color||'default')));
    }
  };

  function anchor(n, side){
    const h = n.minimized ? 44 : n.height, x=n.x, y=n.y, w=n.width;
    if(side==='left') return {x:x,y:y+h/2};
    if(side==='right') return {x:x+w,y:y+h/2};
    if(side==='top') return {x:x+w/2,y:y};
    if(side==='bottom') return {x:x+w/2,y:y+h};
    return {x:x+w/2,y:y+h/2};
  }
  function autoSide(a,b){
    return Math.abs((b.x+b.width/2)-(a.x+a.width/2)) > Math.abs((b.y+b.height/2)-(a.y+a.height/2)) ? ((b.x>a.x)?'right':'left') : ((b.y>a.y)?'bottom':'top');
  }
  function endpoints(conn){
    const from=nodes.find(n=>n.id===conn.from), to=nodes.find(n=>n.id===conn.to);
    if(!from||!to) return null;
    return {from,to,p1:anchor(from,conn.fromSide&&conn.fromSide!=='auto'?conn.fromSide:autoSide(from,to)),p2:anchor(to,conn.toSide&&conn.toSide!=='auto'?conn.toSide:autoSide(to,from))};
  }
  function defaultControl(conn,p1,p2){
    const curve=conn.curve??70, dx=p2.x-p1.x, dy=p2.y-p1.y, len=Math.max(1,Math.hypot(dx,dy));
    return {x:(p1.x+p2.x)/2+(-dy/len)*curve,y:(p1.y+p2.y)/2+(dx/len)*curve};
  }
  function drawSmoothPath(c,pts){
    c.moveTo(pts[0].x,pts[0].y);
    if(pts.length===2){ c.lineTo(pts[1].x,pts[1].y); return; }
    if(pts.length===3){ c.quadraticCurveTo(pts[1].x,pts[1].y,pts[2].x,pts[2].y); return; }
    for(let i=1;i<pts.length-2;i++){
      const mid={x:(pts[i].x+pts[i+1].x)/2,y:(pts[i].y+pts[i+1].y)/2};
      c.quadraticCurveTo(pts[i].x,pts[i].y,mid.x,mid.y);
    }
    const last=pts[pts.length-2], end=pts[pts.length-1];
    c.quadraticCurveTo(last.x,last.y,end.x,end.y);
  }
  function sampleQuad(p0,p1,p2,t){ const a=(1-t)*(1-t), b=2*(1-t)*t, c=t*t; return {x:a*p0.x+b*p1.x+c*p2.x,y:a*p0.y+b*p1.y+c*p2.y}; }
  function sampled(conn){
    const ep=endpoints(conn); if(!ep) return [];
    const style=conn.style||settings.defaultConnStyle;
    const manual=Array.isArray(conn.controlPoints)&&conn.controlPoints.length;
    if((style==='straight'||style==='dashed'||style==='direct')&&!manual) return [ep.p1,ep.p2];
    if(style==='stepped'&&!manual){ const mid=(conn.stepDistance&&conn.stepDistance!==0)?ep.p1.x+(conn.stepDistance/camera.zoom):(ep.p1.x+ep.p2.x)/2; return [ep.p1,{x:mid,y:ep.p1.y},{x:mid,y:ep.p2.y},ep.p2]; }
    let pts=[ep.p1,...(manual?conn.controlPoints:[defaultControl(conn,ep.p1,ep.p2)]),ep.p2];
    const out=[];
    if(pts.length===3){ for(let i=0;i<=32;i++) out.push(sampleQuad(pts[0],pts[1],pts[2],i/32)); return out; }
    return pts;
  }
  function distSeg(px,py,a,b){ const dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy; if(!len2) return Math.hypot(px-a.x,py-a.y); const t=Math.max(0,Math.min(1,((px-a.x)*dx+(py-a.y)*dy)/len2)); return Math.hypot(px-(a.x+t*dx),py-(a.y+t*dy)); }
  function nearestConn(x,y){
    const thr=12/camera.zoom; let best=null,bestD=Infinity;
    for(const c of connections){ const pts=sampled(c); for(let i=0;i<pts.length-1;i++){ const d=distSeg(x,y,pts[i],pts[i+1]); if(d<thr&&d<bestD){best=c;bestD=d;} } }
    return best;
  }

  window.getConnAt = getConnAt = function(x,y){ return nearestConn(x,y); };
  window.drawConn = drawConn = function(conn){
    const ep=endpoints(conn); if(!ep) return;
    const style=conn.style||settings.defaultConnStyle;
    const lw=conn.width||2;
    const base=(conn.color==='default'||!conn.color)?(cssVar('--connection-color')||'#aaaaaa'):conn.color;
    const isSel=selectedConn&&selectedConn.id===conn.id;
    const isRelated=settings.highlightConn&&selectedNode&&(conn.from===selectedNode.id||conn.to===selectedNode.id);
    const stroke=isSel?CONN_SELECTED_ORANGE:(isRelated?NODE_SELECTED_BLUE:base);
    const manual=Array.isArray(conn.controlPoints)&&conn.controlPoints.length;
    ctx.save();
    ctx.strokeStyle=stroke;
    ctx.lineWidth=(isSel?Math.max(lw,3):lw)/camera.zoom;
    ctx.globalAlpha=conn.opacity||1;
    if(conn.glow||isSel||isRelated){ ctx.shadowColor=stroke; ctx.shadowBlur=(conn.glow?14:8)/camera.zoom; }
    if(style==='dashed'||conn.animated){ ctx.setLineDash([8/camera.zoom,5/camera.zoom]); ctx.lineDashOffset=conn.animated?-(performance.now()/1000)*18/camera.zoom:0; }
    ctx.beginPath();
    if((style==='straight'||style==='dashed'||style==='direct')&&!manual){
      ctx.moveTo(ep.p1.x,ep.p1.y); ctx.lineTo(ep.p2.x,ep.p2.y);
    } else if(style==='stepped'&&!manual){
      const mid=(conn.stepDistance&&conn.stepDistance!==0)?ep.p1.x+(conn.stepDistance/camera.zoom):(ep.p1.x+ep.p2.x)/2;
      ctx.moveTo(ep.p1.x,ep.p1.y); ctx.lineTo(mid,ep.p1.y); ctx.lineTo(mid,ep.p2.y); ctx.lineTo(ep.p2.x,ep.p2.y);
    } else {
      const pts=[ep.p1,...(manual?conn.controlPoints:[defaultControl(conn,ep.p1,ep.p2)]),ep.p2];
      drawSmoothPath(ctx,pts);
    }
    ctx.stroke(); ctx.setLineDash([]);
    if(settings.showArrows){
      const pts=sampled(conn), a=pts.length>1?pts[pts.length-2]:ep.p1, b=pts.length?pts[pts.length-1]:ep.p2;
      const ang=Math.atan2(b.y-a.y,b.x-a.x), as=9/camera.zoom;
      ctx.save(); ctx.translate(ep.p2.x,ep.p2.y); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-as,-as/2.2); ctx.lineTo(-as,as/2.2); ctx.closePath(); ctx.fillStyle=stroke; ctx.fill(); ctx.restore();
    }
    if(isSel && Array.isArray(conn.controlPoints)){
      conn.controlPoints.forEach(p=>{ ctx.beginPath(); ctx.fillStyle='#fff7ed'; ctx.strokeStyle=CONN_SELECTED_ORANGE; ctx.lineWidth=2/camera.zoom; ctx.arc(p.x,p.y,6/camera.zoom,0,Math.PI*2); ctx.fill(); ctx.stroke(); });
    }
    ctx.restore();
  };

  rebuildUniformPalettes();
  ensureStepControl();
  if(selectedConn) populateConnPanel(selectedConn);
  if(selectedNode && typeof updatePanel==='function') updatePanel();
  draw();
})();
</script>


<!-- PATCH RONY: remover bolinhas das linhas + editar animação funcional + polimento visual dos cards -->
<style id="rony-line-dots-animation-card-polish-css">
  .rony-highlight-control {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 12%, transparent);
  }
  .rony-panel-hint {
    font-size: 11px;
    color: var(--text3);
    line-height: 1.35;
    margin-top: 6px;
  }
</style>
<script id="rony-line-dots-animation-card-polish-js">
(function(){
  'use strict';
  if(window.__ronyLineDotsAnimationCardPolish) return;
  window.__ronyLineDotsAnimationCardPolish = true;

  const byId = (id) => document.getElementById(id);

  function safeSave(){
    if(typeof saveHist === 'function') saveHist();
    if(typeof draw === 'function') draw();
    if(typeof triggerSave === 'function') triggerSave();
  }

  function showRightPanelTab(tabName){
    const panel = byId('right-panel');
    if(panel) panel.classList.add('show');
    document.querySelectorAll('.rpanel-tab').forEach(t => {
      const on = t.dataset.tab === tabName;
      t.classList.toggle('on', on);
    });
    document.querySelectorAll('.rpanel-tab-content').forEach(sec => sec.style.display = 'none');
    const target = byId('tab-' + tabName);
    if(target) target.style.display = 'block';
  }

  function ensureRemoveLineDotsOption(){
    const connTab = byId('tab-conn');
    if(!connTab || byId('rp-clear-line-dots-btn')) return;

    const section = document.createElement('div');
    section.className = 'rpanel-section';
    section.id = 'rp-line-dots-section';
    section.innerHTML = `
      <div class="rpanel-label">Pontos manuais da linha</div>
      <button class="panel-btn" id="rp-clear-line-dots-btn" type="button">
        <i class="ti ti-eraser"></i> Remover bolinhas da linha
      </button>
      <div class="rony-panel-hint">Remove os pontos/bolinhas criados ao ajustar a curva manualmente, sem apagar a conexão.</div>
    `;

    const deleteBtn = byId('rp-delete-conn-btn');
    if(deleteBtn && deleteBtn.parentElement === connTab) connTab.insertBefore(section, deleteBtn);
    else connTab.appendChild(section);

    byId('rp-clear-line-dots-btn').onclick = function(){
      if(!window.selectedConn && typeof selectedConn === 'undefined') return;
      const conn = window.selectedConn || selectedConn;
      if(!conn) return;
      conn.controlPoints = [];
      delete conn.controlPoints;
      conn.manualPoints = [];
      delete conn.manualPoints;
      safeSave();
      if(typeof populateConnPanel === 'function') populateConnPanel(conn);
    };
  }

  function ensureAnimationPanelFunction(){
    const styleTab = byId('tab-style');
    if(!styleTab) return;

    if(!byId('rp-animation-select')){
      const sec = document.createElement('div');
      sec.className = 'rpanel-section';
      sec.id = 'rp-animation-section';
      sec.innerHTML = `
        <div class="rpanel-label">Animação</div>
        <select id="rp-animation-select" class="rpanel-input rpanel-select" style="margin-top:6px;">
          <option value="none">Sem animação</option>
          <option value="hover">Hover suave</option>
          <option value="glow">Glow</option>
          <option value="pulse">Pulsar</option>
          <option value="float">Flutuar</option>
          <option value="zoom">Zoom</option>
          <option value="fade">Fade</option>
          <option value="shake">Tremer</option>
        </select>
        <div class="rony-panel-hint">A animação é aplicada diretamente no card selecionado.</div>
      `;
      styleTab.appendChild(sec);
      byId('rp-animation-select').addEventListener('change', function(e){
        if(!window.selectedNode && typeof selectedNode === 'undefined') return;
        const node = window.selectedNode || selectedNode;
        if(!node) return;
        node.animation = e.target.value || 'none';
        safeSave();
      });
    }

    const ctxAnimation = byId('ctx-animation');
    if(ctxAnimation){
      ctxAnimation.onclick = function(){
        const node = (typeof selectedNode !== 'undefined') ? selectedNode : window.selectedNode;
        if(!node){ if(typeof hideContextMenu === 'function') hideContextMenu(); return; }
        if(!('animation' in node)) node.animation = 'none';
        showRightPanelTab('style');
        if(typeof updatePanel === 'function') updatePanel();
        const sel = byId('rp-animation-select');
        if(sel){
          sel.value = node.animation || 'none';
          sel.scrollIntoView({block:'center', behavior:'smooth'});
          sel.classList.add('rony-highlight-control');
          setTimeout(() => sel.classList.remove('rony-highlight-control'), 1400);
          sel.focus({preventScroll:true});
        }
        if(typeof hideContextMenu === 'function') hideContextMenu();
      };
    }
  }

  function polishCardDefaults(){
    if(!Array.isArray(window.nodes) && typeof nodes === 'undefined') return;
    const list = window.nodes || nodes;
    (list || []).forEach(n => {
      if(!n || n.__ronyPolished) return;
      n.__ronyPolished = true;
      if(n.type === 'card'){
        if(!n.cornerRadius) n.cornerRadius = 8;
        if(!n.shadowIntensity || n.shadowIntensity < 1.15) n.shadowIntensity = 1.15;
        if(!n.borderWidth || n.borderWidth < 1.5) n.borderWidth = 1.5;
      }
    });
  }

  // Polimento leve no desenho: brilho interno bem sutil, sem alterar paleta, texto, tamanho ou identidade visual.
  const oldRenderShape = window.renderShape || (typeof renderShape === 'function' ? renderShape : null);
  if(oldRenderShape){
    window.renderShape = renderShape = function(c, node, isSel, isMin){
      oldRenderShape(c, node, isSel, isMin);
      if(!node || isMin || node.type === 'icon') return;
      const finite = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
      const x=finite(node.x, 0), y=finite(node.y, 0), w=finite(node.width, 0), h=finite(node.height, 0);
      const z = Math.max(0.05, Math.abs(finite((window.camera && window.camera.zoom) || (typeof camera !== 'undefined' && camera.zoom), 1)));
      if(w <= 0 || h <= 0) return;
      c.save();
      if(typeof drawCardShape === 'function'){
        drawCardShape(c, {...node, x, y, width:w, height:h});
        c.clip();
      } else if(typeof roundRect === 'function') {
        roundRect(c,x,y,w,h,finite(node.cornerRadius,14)/z);
        c.clip();
      }
      const g = c.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, 'rgba(255,255,255,0.16)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.03)');
      g.addColorStop(1, 'rgba(0,0,0,0.035)');
      c.fillStyle = g;
      c.fillRect(x, y, w, h);
      c.strokeStyle = 'rgba(255,255,255,0.20)';
      c.lineWidth = 1 / z;
      if(typeof drawCardShape === 'function'){
        drawCardShape(c, {...node, height:h});
        c.stroke();
      }
      c.restore();
    };
  }

  const oldCreateNode = window.createNode || (typeof createNode === 'function' ? createNode : null);
  if(oldCreateNode){
    window.createNode = createNode = function(x,y,type){
      const n = oldCreateNode(x,y,type);
      if(n && type === 'card'){
        n.cornerRadius = Math.max(n.cornerRadius || 0, 16);
        n.shadowIntensity = Math.max(n.shadowIntensity || 0, 1.15);
        n.borderWidth = Math.max(n.borderWidth || 0, 1.5);
      }
      return n;
    };
  }

  const oldUpdatePanel = window.updatePanel || (typeof updatePanel === 'function' ? updatePanel : null);
  if(oldUpdatePanel){
    window.updatePanel = updatePanel = function(){
      oldUpdatePanel();
      ensureRemoveLineDotsOption();
      ensureAnimationPanelFunction();
      const node = (typeof selectedNode !== 'undefined') ? selectedNode : window.selectedNode;
      const sel = byId('rp-animation-select');
      if(node && sel) sel.value = node.animation || 'none';
    };
  }

  ensureRemoveLineDotsOption();
  ensureAnimationPanelFunction();
  polishCardDefaults();
  if(typeof draw === 'function') draw();
})();
</script>


<!-- PATCH RONY FINAL: tracejado, atalhos, seleção do ícone e rota clara -->
<style id="rony-final-adjustments-css">
  .rpanel-colors,
  .color-dots { align-items:center; }
  .project-card,
  .modal,
  #right-panel,
  #bottom-bar { border-radius: 14px; }
</style>
<script id="rony-final-adjustments-js">
(function(){
  'use strict';
  if(window.__ronyFinalAdjustments) return;
  window.__ronyFinalAdjustments = true;

  const BLUE = '#3b82f6';
  const ORANGE = '#f59e0b';
  const byId = id => document.getElementById(id);
  let multiSelected = [];
  let clip = null;

  function isTypingTarget(e){
    const t = e && e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  }
  function changed(){
    if(typeof saveHist === 'function') saveHist();
    if(typeof draw === 'function') draw();
    if(typeof triggerSave === 'function') triggerSave();
  }
  function normalizeCard(node){
    if(!node || node.type !== 'card') return node;
    if(!node.cornerRadius) node.cornerRadius = 8;
    if(!node.borderWidth || node.borderWidth < 1.5) node.borderWidth = 1.5;
    if(!node.width || node.width < 180) node.width = 220;
    if(!node.height || node.height < 110) node.height = 132;
    return node;
  }
  function cloneNode(n, dx, dy){
    const c = JSON.parse(JSON.stringify(n));
    c.id = 'n' + Date.now() + Math.floor(Math.random()*100000);
    c.x = (c.x || 0) + dx;
    c.y = (c.y || 0) + dy;
    c.children = [];
    delete c.imgObj; delete c.iconObj; delete c.__ronyPolished;
    normalizeCard(c);
    return c;
  }
  function selectedList(){
    if(multiSelected.length) return multiSelected.map(id => nodes.find(n => n.id === id)).filter(Boolean);
    return selectedNode ? [selectedNode] : [];
  }
  function setAllSelected(){
    multiSelected = (nodes || []).map(n => n.id);
    if(nodes && nodes[0]) { selectedNode = nodes[0]; selectedConn = null; if(typeof updatePanel==='function') updatePanel(); }
    if(typeof draw === 'function') draw();
  }
  function copySelection(cut){
    const list = selectedList();
    if(!list.length) return;
    const ids = new Set(list.map(n=>n.id));
    clip = {
      nodes: list.map(n => JSON.parse(JSON.stringify(n))),
      connections: (connections || []).filter(c => ids.has(c.from) && ids.has(c.to)).map(c => JSON.parse(JSON.stringify(c)))
    };
    if(cut){
      nodes = nodes.filter(n => !ids.has(n.id));
      connections = connections.filter(c => !ids.has(c.from) && !ids.has(c.to));
      multiSelected=[]; selectedNode=null; selectedConn=null; changed();
    }
  }
  function pasteSelection(){
    if(!clip || !clip.nodes || !clip.nodes.length) return;
    const idMap = new Map();
    const pasted = clip.nodes.map(n => {
      const c = cloneNode(n, 28/camera.zoom, 28/camera.zoom);
      idMap.set(n.id, c.id);
      return c;
    });
    const pastedConns = (clip.connections || []).map(c => ({...c, id:'c'+Date.now()+Math.floor(Math.random()*100000), from:idMap.get(c.from), to:idMap.get(c.to)})).filter(c=>c.from&&c.to);
    nodes.push(...pasted);
    connections.push(...pastedConns);
    multiSelected = pasted.map(n=>n.id);
    selectedNode = pasted[pasted.length-1] || null;
    selectedConn = null;
    if(typeof updatePanel==='function') updatePanel();
    changed();
  }
  function deleteSelection(){
    const ids = new Set(selectedList().map(n=>n.id));
    if(!ids.size) return false;
    nodes = nodes.filter(n => !ids.has(n.id));
    connections = connections.filter(c => !ids.has(c.from) && !ids.has(c.to));
    multiSelected=[]; selectedNode=null; selectedConn=null; changed();
    return true;
  }

  // Garante que a opção Tracejada nunca suma do painel e das configurações.
  function ensureDashedOptions(){
    [['rp-conn-style','Tracejada'], ['default-conn-style','Tracejada']].forEach(([id,label])=>{
      const s = byId(id); if(!s) return;
      if(!Array.from(s.options).some(o => o.value === 'dashed')){
        const o = document.createElement('option'); o.value='dashed'; o.textContent=label; s.appendChild(o);
      }
    });
  }

  // Linhas relacionadas ao elemento selecionado ficam sempre na cor da seleção, inclusive ao traçar rota.
  function relatedColor(){ return BLUE; }
  const previousDrawConn = window.drawConn || (typeof drawConn === 'function' ? drawConn : null);
  if(previousDrawConn){
    window.drawConn = drawConn = function(conn){
      const f = nodes.find(n=>n.id===conn.from), t = nodes.find(n=>n.id===conn.to);
      if(!f || !t) return previousDrawConn(conn);
      const selectedRelated = selectedNode && (conn.from === selectedNode.id || conn.to === selectedNode.id);
      const selectedConnection = selectedConn && selectedConn.id === conn.id;
      const oldColor = conn.color;
      if(selectedRelated) conn.color = relatedColor();
      previousDrawConn(conn);
      conn.color = oldColor;
      if(selectedConnection && !selectedRelated){
        // mantém a conexão individual em laranja quando a própria linha está selecionada
      }
    };
  }

  // Seleção de ícones/pastas/notas: contorno acompanha o ícone, não um card retangular grande.
  const previousDrawNode = window.drawNode || (typeof drawNode === 'function' ? drawNode : null);
  if(previousDrawNode){
    window.drawNode = drawNode = function(node){
      normalizeCard(node);
      previousDrawNode(node);
      if(!node || !(node.type === 'icon' || node.type === 'folder' || node.type === 'note')) return;
      const isSel = selectedNode && selectedNode.id === node.id;
      const isMulti = multiSelected.includes(node.id);
      if(!isSel && !isMulti) return;
      const z = camera.zoom || 1;
      const size = (node.iconSize || (node.type === 'icon' ? 42 : 44)) / z;
      const cx = node.x + node.width/2 + (node.iconX || 0);
      const cy = node.y + Math.min(node.height * .44, 44/z) + (node.iconY || 0);
      ctx.save();
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 2/z;
      ctx.setLineDash([5/z,4/z]);
      if(node.iconBg){
        roundRect(ctx, cx-size*.74, cy-size*.74, size*1.48, size*1.48, 12/z);
      } else {
        ctx.beginPath(); ctx.arc(cx, cy, size*.68, 0, Math.PI*2);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = BLUE;
      ctx.beginPath(); ctx.arc(cx + size*.64, cy + size*.64, 4.5/z, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    };
  }

  // Sobreposição visual para Ctrl+A em todos os elementos sem recriar sistema de seleção.
  const previousDraw = window.draw || (typeof draw === 'function' ? draw : null);
  if(previousDraw){
    window.draw = draw = function(){
      previousDraw();
      if(!multiSelected.length) return;
      ctx.save(); ctx.translate(camera.x,camera.y); ctx.scale(camera.zoom,camera.zoom);
      for(const id of multiSelected){
        const n = nodes.find(x=>x.id===id); if(!n) continue;
        if(n.type === 'icon' || n.type === 'folder' || n.type === 'note') continue;
        const h = n.minimized ? 44 : n.height;
        ctx.strokeStyle = BLUE; ctx.lineWidth = 1.5/camera.zoom; ctx.setLineDash([5/camera.zoom,4/camera.zoom]);
        ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.restore();
    };
  }

  const oldCreateNode = window.createNode || (typeof createNode === 'function' ? createNode : null);
  if(oldCreateNode){
    window.createNode = createNode = function(x,y,type){
      const n = oldCreateNode(x,y,type);
      normalizeCard(n);
      return n;
    };
  }

  const oldSelectNode = window.selectNodeObj || (typeof selectNodeObj === 'function' ? selectNodeObj : null);
  if(oldSelectNode){
    window.selectNodeObj = selectNodeObj = function(node){
      if(node) multiSelected=[];
      return oldSelectNode(node);
    };
  }
  const oldSelectConn = window.selectConnObj || (typeof selectConnObj === 'function' ? selectConnObj : null);
  if(oldSelectConn){
    window.selectConnObj = selectConnObj = function(conn){
      if(conn) multiSelected=[];
      return oldSelectConn(conn);
    };
  }

  // Atalhos completos: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+D, Delete, Undo/Redo e busca.
  document.addEventListener('keydown', function(e){
    if(isTypingTarget(e)) return;
    const k = String(e.key || '').toLowerCase();
    if(e.ctrlKey || e.metaKey){
      if(k === 'a'){ e.preventDefault(); e.stopImmediatePropagation(); setAllSelected(); return; }
      if(k === 'c'){ e.preventDefault(); e.stopImmediatePropagation(); copySelection(false); return; }
      if(k === 'x'){ e.preventDefault(); e.stopImmediatePropagation(); copySelection(true); return; }
      if(k === 'v'){ e.preventDefault(); e.stopImmediatePropagation(); pasteSelection(); return; }
      if(k === 'd'){ e.preventDefault(); e.stopImmediatePropagation(); copySelection(false); pasteSelection(); return; }
    }
    if((e.key === 'Delete' || e.key === 'Backspace') && multiSelected.length){
      e.preventDefault(); e.stopImmediatePropagation(); deleteSelection(); return;
    }
  }, true);

  // Mostra a rota de conexão temporária em azul claro; corrige quando algum patch antigo escurece a linha.
  const oldStroke = CanvasRenderingContext2D.prototype.stroke;
  CanvasRenderingContext2D.prototype.stroke = function(){
    try{
      if(typeof mode !== 'undefined' && mode === 'connect' && typeof connectStart !== 'undefined' && connectStart){
        if(String(this.strokeStyle).includes('26, 26, 24') || String(this.strokeStyle).includes('0, 0, 0')) this.strokeStyle = BLUE;
      }
    }catch(err){}
    return oldStroke.apply(this, arguments);
  };

  ensureDashedOptions();
  (nodes || []).forEach(normalizeCard);
  if(typeof draw === 'function') draw();
})();
</script>



<script>
/* PATCH FINAL — pastas, seleção estilo Windows e resize direto no canvas */
(function(){
  'use strict';
  const BLUE = '#2563eb';
  const SELECT_FILL = 'rgba(37,99,235,.16)';
  const SELECT_STROKE = 'rgba(37,99,235,.72)';

  function isCanvasEventTarget(e){ return e && e.target && e.target.id === 'cvs'; }
  window.__mmLastMouseDownDetail = 0;
  window.__mmFolderOpenAllowedUntil = 0;

  // Clique simples agora só seleciona. Abrir pasta fica no duplo clique ou no menu "Abrir Pasta".
  document.addEventListener('mousedown', function(e){
    if(isCanvasEventTarget(e)) window.__mmLastMouseDownDetail = e.detail || 1;
  }, true);
  document.addEventListener('dblclick', function(e){
    if(isCanvasEventTarget(e)) window.__mmFolderOpenAllowedUntil = Date.now() + 700;
  }, true);

  function persistWs(){
    if(typeof workspaces === 'undefined' || typeof currentLevel === 'undefined') return;
    const old = workspaces[currentLevel] || {};
    workspaces[currentLevel] = Object.assign({}, old, {
      nodes: Array.isArray(nodes) ? nodes.slice() : [],
      connections: Array.isArray(connections) ? connections.slice() : [],
      camera: Object.assign({}, camera || {x:0,y:0,zoom:1})
    });
  }
  function folderWsId(node){
    if(!node) return 'root';
    node.workspaceId = node.workspaceId || ('folder_' + node.id);
    return node.workspaceId;
  }
  function ensureFolderWorkspace(node){
    const id = folderWsId(node);
    if(!workspaces[id]) workspaces[id] = { name: node.title || 'Nova Pasta', nodes: [], connections: [], camera: {x:0,y:0,zoom:1}, parent: currentLevel, sourceFolderId: node.id };
    workspaces[id].name = node.title || workspaces[id].name || 'Nova Pasta';
    workspaces[id].parent = workspaces[id].parent || currentLevel;
    workspaces[id].sourceFolderId = workspaces[id].sourceFolderId || node.id;
    return id;
  }

  const previousOpenFolder = window.openFolder || (typeof openFolder === 'function' ? openFolder : null);
  window.openFolder = openFolder = function(node, force){
    if(!node || node.type !== 'folder') return;
    const allowed = force === true || Date.now() < (window.__mmFolderOpenAllowedUntil || 0) || (window.__mmLastMouseDownDetail || 0) >= 2;
    if(!allowed){
      if(typeof selectNodeObj === 'function') selectNodeObj(node);
      if(typeof draw === 'function') draw();
      return;
    }
    persistWs();
    const nextLevel = ensureFolderWorkspace(node);
    if(currentLevel !== nextLevel){
      navStack = Array.isArray(navStack) ? navStack : [];
      const last = navStack[navStack.length - 1];
      if(!last || last.level !== currentLevel || last.folderId !== node.id){
        navStack.push({ level: currentLevel, title: node.title || 'Pasta', folderId: node.id, workspaceId: nextLevel });
      }
    }
    currentLevel = nextLevel;
    const ws = workspaces[currentLevel] || {nodes:[],connections:[],camera:{x:0,y:0,zoom:1}};
    nodes = Array.isArray(ws.nodes) ? ws.nodes : [];
    connections = Array.isArray(ws.connections) ? ws.connections : [];
    camera = ws.camera || {x:0,y:0,zoom:1};
    if(typeof selectNodeObj === 'function') selectNodeObj(null);
    if(typeof saveHist === 'function') saveHist();
    if(typeof draw === 'function') draw();
    if(typeof triggerSave === 'function') triggerSave();
    if(typeof updateBreadcrumb === 'function') updateBreadcrumb();
  };

  // Garante que ações explícitas abram a pasta mesmo sem duplo clique.
  setTimeout(function(){
    const ctxOpen = document.getElementById('ctx-open-folder');
    if(ctxOpen){
      ctxOpen.onclick = function(){
        if(selectedNode && selectedNode.type === 'folder') window.openFolder(selectedNode, true);
        if(typeof hideContextMenu === 'function') hideContextMenu();
      };
    }
  }, 0);

  const oldActivate = window.activateNode || (typeof activateNode === 'function' ? activateNode : null);
  window.activateNode = activateNode = function(node){
    if(!node) return false;
    if(node.type === 'folder'){ window.openFolder(node, true); return true; }
    if(node.type === 'note'){
      if(typeof openNoteWindow === 'function') openNoteWindow(node);
      else if(typeof startInlineEdit === 'function') startInlineEdit(node);
      return true;
    }
    return oldActivate ? oldActivate(node) : false;
  };

  // Dashboard: mostra o nome real da pasta/projeto e abre o workspace correto, sem criar "inside" recursivo.
  const oldRenderDash = window.renderDashboardProjects || (typeof renderDashboardProjects === 'function' ? renderDashboardProjects : null);
  if(oldRenderDash){
    window.renderDashboardProjects = renderDashboardProjects = function(){
      const grid = document.getElementById('dash-projects-grid');
      if(!grid) return oldRenderDash();
      grid.innerHTML = '';
      Object.keys(workspaces || {}).forEach(function(key){
        const ws = workspaces[key] || {};
        const name = ws.name || (key === 'root' ? 'Início' : key.replace(/^folder_/, ''));
        const nodeCount = (ws.nodes || []).length;
        const connCount = (ws.connections || []).length;
        const card = document.createElement('div');
        card.className = 'project-card';
        card.dataset.projectId = key;
        card.innerHTML = `
          <div class="project-card-header">
            <div class="project-card-icon">${key === 'root' ? '🏠' : '📁'}</div>
            <button class="project-card-menu" title="Opções do projeto"><i class="ti ti-dots-vertical"></i></button>
          </div>
          <div class="project-card-name">${String(name).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]))}</div>
          <div class="project-card-meta">
            <div class="project-card-stat"><i class="ti ti-layout-cards"></i>${nodeCount}</div>
            <div class="project-card-stat"><i class="ti ti-line"></i>${connCount}</div>
          </div>`;
        card.onclick = function(e){
          const menuBtn = e.target.closest('.project-card-menu');
          if(menuBtn && typeof showProjectMenu === 'function'){ e.stopPropagation(); showProjectMenu(key, menuBtn); return; }
          if(typeof openProjectFromDashboard === 'function') openProjectFromDashboard(key);
        };
        grid.appendChild(card);
      });
    };
  }

  // Seleção estilo Windows: retângulo translúcido no ícone + nome, sem círculo tracejado.
  function drawWindowsSelection(node){
    if(!node || !(node.type === 'folder' || node.type === 'note' || node.type === 'icon')) return;
    const isSel = selectedNode && selectedNode.id === node.id;
    if(!isSel) return;
    const z = camera.zoom || 1;
    const titleExtra = (node.type !== 'icon' && node.title) ? 28 / z : 0;
    const x = node.x - 10 / z;
    const y = node.y - 2 / z;
    const w = node.width + 20 / z;
    const h = node.height + titleExtra + 8 / z;
    ctx.save();
    ctx.fillStyle = SELECT_FILL;
    ctx.strokeStyle = SELECT_STROKE;
    ctx.lineWidth = 1 / z;
    ctx.setLineDash([]);
    if(typeof roundRect === 'function') roundRect(ctx, x, y, w, h, 3 / z); else ctx.rect(x,y,w,h);
    ctx.fill(); ctx.stroke();
    // alça de resize no canto, como nos cards, mas discreta.
    ctx.fillStyle = BLUE;
    ctx.beginPath();
    ctx.rect(node.x + node.width - 4 / z, node.y + node.height - 4 / z, 8 / z, 8 / z);
    ctx.fill();
    ctx.restore();
  }
  const prevDraw = window.draw || (typeof draw === 'function' ? draw : null);
  if(prevDraw){
    window.draw = draw = function(){
      prevDraw();
      try{
        ctx.save(); ctx.translate(camera.x, camera.y); ctx.scale(camera.zoom, camera.zoom);
        if(selectedNode) drawWindowsSelection(selectedNode);
        ctx.restore();
      }catch(e){}
    };
  }

  // Resize direto no canvas para pasta/nota/ícone/imagem: mantém ícone proporcional quando necessário.
  document.addEventListener('mousemove', function(){
    try{
      if(typeof isResizing === 'undefined' || !isResizing || !resizeNode) return;
      if(resizeNode.type === 'folder' || resizeNode.type === 'note' || resizeNode.type === 'icon'){
        resizeNode.width = Math.max(44, resizeNode.width);
        resizeNode.height = Math.max(44, resizeNode.height);
        resizeNode.iconSize = Math.max(18, Math.min(180, Math.round(Math.min(resizeNode.width, resizeNode.height) * (resizeNode.type === 'icon' ? .82 : .52))));
      }
      if(typeof updatePanel === 'function') updatePanel();
    }catch(e){}
  }, true);

  // URLs file:// não são abertas dentro de outro file://, evitando o aviso de origem única do navegador.
  const oldHandleNavigation = window.handleNavigation || (typeof handleNavigation === 'function' ? handleNavigation : null);
  if(oldHandleNavigation){
    window.handleNavigation = handleNavigation = function(action){
      if(action && action.type === 'url' && /^file:/i.test(String(action.dest || ''))){
        alert('O navegador bloqueia abrir file:// dentro de outro arquivo local. Use um link http/https ou importe o arquivo no projeto.');
        return;
      }
      return oldHandleNavigation(action);
    };
  }

  // Migração leve dos elementos antigos.
  function migrateAll(){
    (nodes || []).forEach(function(n){
      if(n.type === 'folder'){
        n.workspaceId = n.workspaceId || ('folder_' + n.id);
        n.emoji = n.emoji || '📁'; n.bgColor='none'; n.borderColor='none'; n.borderWidth=0;
        n.width = Math.max(84, n.width || 112); n.height = Math.max(72, n.height || 94);
      }
      if(n.type === 'note'){
        n.emoji = n.emoji || '🗒️'; n.bgColor='none'; n.borderColor='none'; n.borderWidth=0;
        n.width = Math.max(84, n.width || 112); n.height = Math.max(72, n.height || 94);
      }
    });
  }
  const oldLoadSave = window.loadSave || (typeof loadSave === 'function' ? loadSave : null);
  if(oldLoadSave){
    window.loadSave = loadSave = function(){ const r = oldLoadSave(); migrateAll(); return r; };
  }
  setTimeout(function(){ migrateAll(); if(typeof draw === 'function') draw(); }, 0);
})();
</script>


<script id="rony-clean-organized-selection-v2">
(function(){
  'use strict';
  if(window.__ronyCleanOrganizedSelectionV2) return;
  window.__ronyCleanOrganizedSelectionV2 = true;

  const BLUE = '#2563eb';
  const FILL = 'rgba(37, 99, 235, .14)';
  const STROKE = 'rgba(37, 99, 235, .88)';
  const SPECIAL_TYPES = new Set(['folder','note','icon']);

  function isSpecialNode(n){ return n && SPECIAL_TYPES.has(n.type); }
  function z(){ return (typeof camera !== 'undefined' && camera.zoom) ? camera.zoom : 1; }
  function rr(c,x,y,w,h,r){
    if(typeof roundRect === 'function') roundRect(c,x,y,w,h,r);
    else { c.beginPath(); c.rect(x,y,w,h); }
  }

  function selectionBox(node){
    const zoom = z();
    const pad = 7 / zoom;
    const titleExtra = (node.title && node.type !== 'icon') ? 22 / zoom : 0;
    return {
      x: node.x - pad,
      y: node.y - pad,
      w: node.width + pad * 2,
      h: (node.minimized ? 44 : node.height) + titleExtra + pad * 2
    };
  }

  function drawCleanSelection(node){
    if(!isSpecialNode(node)) return;
    const zoom = z();
    const b = selectionBox(node);
    ctx.save();
    ctx.fillStyle = FILL;
    ctx.strokeStyle = STROKE;
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([]);
    rr(ctx, b.x, b.y, b.w, b.h, 4 / zoom);
    ctx.fill();
    ctx.stroke();

    // Uma única alça organizada no canto inferior direito do elemento inteiro.
    if(!node.locked){
      const s = 8 / zoom;
      ctx.fillStyle = BLUE;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 / zoom;
      ctx.beginPath();
      ctx.rect(b.x + b.w - s/2, b.y + b.h - s/2, s, s);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // Remove de vez o círculo tracejado e a seleção separada do nome para pasta/nota/ícone.
  const previousDraw = window.draw || (typeof draw === 'function' ? draw : null);
  if(previousDraw){
    window.draw = draw = function(){
      const keepNode = (typeof selectedNode !== 'undefined') ? selectedNode : null;
      const hideNativeSpecialSelection = isSpecialNode(keepNode);
      if(hideNativeSpecialSelection) selectedNode = null;
      previousDraw();
      if(hideNativeSpecialSelection) selectedNode = keepNode;
      if(hideNativeSpecialSelection){
        try{
          ctx.save();
          ctx.translate(camera.x, camera.y);
          ctx.scale(camera.zoom, camera.zoom);
          drawCleanSelection(keepNode);
          ctx.restore();
        }catch(e){}
      }
    };
  }

  // A área de resize passa a seguir a alça organizada da seleção, não o canto antigo do corpo.
  const oldIsResizeHandle = window.isResizeHandle || (typeof isResizeHandle === 'function' ? isResizeHandle : null);
  window.isResizeHandle = isResizeHandle = function(node, x, y){
    if(isSpecialNode(node)){
      const zoom = z();
      const b = selectionBox(node);
      const hx = b.x + b.w, hy = b.y + b.h;
      return Math.abs(x - hx) <= 11/zoom && Math.abs(y - hy) <= 11/zoom;
    }
    return oldIsResizeHandle ? oldIsResizeHandle(node,x,y) : false;
  };

  // Cursor consistente quando passar na nova alça.
  const cvsEl = document.getElementById('cvs');
  if(cvsEl){
    cvsEl.addEventListener('mousemove', function(e){
      try{
        if(!selectedNode || !isSpecialNode(selectedNode)) return;
        const rect = cvsEl.getBoundingClientRect();
        const mx = (e.clientX - rect.left - camera.x) / camera.zoom;
        const my = (e.clientY - rect.top - camera.y) / camera.zoom;
        if(isResizeHandle(selectedNode,mx,my)) cvsEl.style.cursor = 'nwse-resize';
      }catch(err){}
    }, true);
  }
})();
</script>



<script id="rony-runtime-safety-fixes-v1">
(function(){
  'use strict';
  if(window.__ronyRuntimeSafetyFixesV1) return;
  window.__ronyRuntimeSafetyFixesV1 = true;

  const finite = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  function sanitizeNode(n){
    if(!n) return n;
    n.x = finite(n.x, 0);
    n.y = finite(n.y, 0);
    n.width = Math.max(10, finite(n.width, 120));
    n.height = Math.max(10, finite(n.height, 80));
    if(n.iconSize != null) n.iconSize = Math.max(8, finite(n.iconSize, 24));
    if(n.children && !Array.isArray(n.children)) n.children = [];
    if(Array.isArray(n.children)) n.children = [...new Set(n.children.filter(id => id && id !== n.id))];
    return n;
  }
  window.sanitizeMindMapNodes = function(){
    try{ (window.nodes || nodes || []).forEach(sanitizeNode); }catch(e){}
  };

  const prevDraw = window.draw || (typeof draw === 'function' ? draw : null);
  if(prevDraw){
    window.draw = draw = function(){
      window.sanitizeMindMapNodes();
      return prevDraw.apply(this, arguments);
    };
  }

  document.addEventListener('click', function(ev){
    const a = ev.target && ev.target.closest ? ev.target.closest('a[href^="file:"]') : null;
    if(!a) return;
    ev.preventDefault();
    alert('O navegador bloqueia links file:// em páginas locais. Use http/https ou importe o arquivo no projeto.');
  }, true);
})();
</script>

<!-- ═══════════════════════════════════════════════════════════════ MELHORIAS v2.5 ═══ -->
<style id="v25-styles">
#mv-modal{display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.9);align-items:center;justify-content:center;flex-direction:column;gap:12px;}
#mv-modal.show{display:flex;}
#mv-modal img{max-width:90vw;max-height:85vh;border-radius:8px;object-fit:contain;}
#mv-modal video{max-width:90vw;max-height:85vh;border-radius:8px;outline:none;}
#mv-close{position:absolute;top:16px;right:20px;background:rgba(255,255,255,0.15);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:20px;line-height:36px;text-align:center;}
#mv-close:hover{background:rgba(255,255,255,0.3);}
#action-type-tabs{display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap;}
.act-tab{flex:1;min-width:70px;padding:7px 4px;border:1px solid var(--border);border-radius:8px;background:var(--bg2);color:var(--text2);font-size:11px;font-weight:600;cursor:pointer;text-align:center;}
.act-tab:hover{background:var(--bg3);}
.act-tab.active{background:var(--accent);color:var(--bg);border-color:var(--accent);}
#action-panels>div{display:none;}
#action-panels>div.active{display:block;}
.act-label{font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;}
#act-int-list{max-height:190px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;margin-top:6px;}
.act-item{padding:9px 12px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);color:var(--text2);}
.act-item:last-child{border-bottom:none;}
.act-item:hover,.act-item.selected{background:var(--bg3);color:var(--text);}
.act-item.selected{font-weight:600;}
.act-empty{padding:14px;font-size:12px;color:var(--text3);text-align:center;}
</style>

<div id="mv-modal">
  <button id="mv-close">✕</button>
  <div id="mv-content"></div>
</div>

<script>
(function(){
'use strict';