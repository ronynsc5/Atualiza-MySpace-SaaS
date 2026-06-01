// ─── DRAWING ─────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0,0,W,H);
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);

  if(settings.showGrid) drawGrid();
  connections.forEach(drawConn);
  nodes.forEach(drawNode);
  ctx.restore();

  document.getElementById('zoom-val').textContent = Math.round(camera.zoom*100)+'%';
  document.getElementById('status-text').textContent =
    `Cards: ${nodes.length} | Conexões: ${connections.length} | Zoom: ${Math.round(camera.zoom*100)}%`;
}

function drawGrid() {
  const g = 40;
  const sx = Math.floor(-camera.x/camera.zoom/g)*g;
  const sy = Math.floor(-camera.y/camera.zoom/g)*g;
  const ex = sx + W/camera.zoom + g;
  const ey = sy + H/camera.zoom + g;
  ctx.save();
  ctx.strokeStyle = cssVar('--border');
  ctx.lineWidth = 0.5/camera.zoom;
  ctx.globalAlpha = 0.4;
  for(let x=sx; x<ex; x+=g) { ctx.beginPath(); ctx.moveTo(x,sy); ctx.lineTo(x,ey); ctx.stroke(); }
  for(let y=sy; y<ey; y+=g) { ctx.beginPath(); ctx.moveTo(sx,y); ctx.lineTo(ex,y); ctx.stroke(); }
  ctx.restore();
}

function drawConn(conn) {
  const from = nodes.find(n=>n.id===conn.from);
  const to = nodes.find(n=>n.id===conn.to);
  if(!from||!to) return;
  const x1=from.x+from.width/2, y1=from.y+from.height/2;
  const x2=to.x+to.width/2, y2=to.y+to.height/2;
  const style = conn.style || settings.defaultConnStyle;
  const lw = conn.width||2;
  const col = conn.color==='default'||!conn.color ? cssVar('--connection-color') : conn.color;
  const isSelConn = selectedConn && selectedConn.id===conn.id;
  const isRelated = settings.highlightConn && selectedNode &&
    (conn.from===selectedNode.id||conn.to===selectedNode.id);
  const curve = conn.curve ?? 70;

  ctx.save();
  ctx.strokeStyle = isSelConn ? '#f59e0b' : isRelated ? cssVar('--accent') : col;
  ctx.lineWidth = lw/camera.zoom;
  ctx.globalAlpha = conn.opacity||1;
  if(style==='dashed') ctx.setLineDash([8/camera.zoom, 5/camera.zoom]);

  ctx.beginPath();
  if(style==='straight'||style==='dashed') {
    ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
  } else if(style==='curved') {
    const dx=x2-x1, dy=y2-y1;
    const len=Math.max(1, Math.hypot(dx,dy));
    const nx=-dy/len, ny=dx/len;
    const mx=(x1+x2)/2, my=(y1+y2)/2;
    ctx.moveTo(x1,y1);
    ctx.quadraticCurveTo(mx+nx*curve, my+ny*curve, x2,y2);
  } else {
    const mx=(x1+x2)/2;
    ctx.moveTo(x1,y1); ctx.lineTo(mx,y1); ctx.lineTo(mx,y2); ctx.lineTo(x2,y2);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  if(settings.showArrows) {
    const angle = Math.atan2(y2-y1, x2-x1);
    const as = 9/camera.zoom;
    ctx.save();
    ctx.translate(x2,y2); ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.lineTo(-as,-as/2.2); ctx.lineTo(-as,as/2.2);
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha=1;
  ctx.restore();
}

function drawNode(node) {
  if(inlineEditing && inlineEditing.id===node.id) return;
  if(node.imageUrl && !node.imgObj) loadNodeImage(node);

  const isSel = selectedNode && selectedNode.id===node.id;
  const isMin = node.minimized || (settings.autoMinimize && !isSel);
  const w=node.width, h=isMin?44:node.height;
  const x=node.x, y=node.y;
  const bgFill = colorOf(node.bgColor, cssVar('--bg'));
  const txCol = readableTextColor(bgFill, colorOf(node.textColor, cssVar('--text')));

  // ── USAR FUNÇÃO MODULAR PARA RENDERIZAÇÃO ──
  renderShape(ctx, node, isSel, isMin);

  if(isMin) {
    const pad=10/camera.zoom;
    ctx.font = `500 ${13/camera.zoom}px Inter`;
    ctx.fillStyle = txCol;
    ctx.textBaseline='middle';
    ctx.fillText(fitText(ctx, (node.emoji?node.emoji+' ':'')+node.title, w-pad*2), x+pad, y+22/camera.zoom);
    ctx.textBaseline='alphabetic';
    return;
  }

  const pad = 14/camera.zoom;
  const cx = (node.shapeType||node.shape)==='circle' ? x+(w-Math.min(w,h)*0.7)/2 : x+pad;
  const cw = Math.max(20, (node.shapeType||node.shape)==='circle' ? Math.min(w,h)*0.7 : w-pad*2);
  let textY = y+pad;

  if(node.imageUrl && node.imgObj instanceof HTMLImageElement) {
    const imgH = Math.min(h*0.45, h-45/camera.zoom);
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x+2/camera.zoom, y+2/camera.zoom, w-4/camera.zoom, imgH, 10/camera.zoom);
    ctx.clip();
    const imgOpacity = node.imageOpacity || 1;
    ctx.globalAlpha = imgOpacity;
    ctx.drawImage(node.imgObj, x+2/camera.zoom, y+2/camera.zoom, w-4/camera.zoom, imgH);
    ctx.globalAlpha = 1;
    ctx.restore();
    textY = y + imgH + 7/camera.zoom;
  }

  // ── USAR FUNÇÃO MODULAR PARA ÍCONES ──
  if(node.emoji || node.iconUrl) {
    renderIcon(ctx, node, isMin);
    const eis = node.iconSize||28; // proporcional ao zoom
    textY += Math.max(0, eis+7+(node.iconY||0));
  }

  ctx.fillStyle = txCol;
  ctx.strokeStyle = txCol;
  const titleSz = (node.textSize||13)/camera.zoom;
  const weight = node.textBold===false ? 500 : 700;
  const italic = node.textItalic ? 'italic ' : '';
  ctx.font = `${italic}${weight} ${titleSz}px Inter`;
  ctx.textBaseline='top';
  if((node.shapeType||node.shape)==='circle') ctx.textAlign='center';
  
  // ── RENDERIZAR BOTÕES DE AÇÃO ──
  if(node.actions && node.actions.length > 0 && !isMin) {
    const btnY = y + h - 35/camera.zoom;
    const btnH = 24/camera.zoom;
    const btnPad = 8/camera.zoom;
    let btnX = x + pad;
    
    node.actions.forEach((action, idx) => {
      if(idx >= 3) return; // Máximo 3 botões visíveis
      
      const btnText = action.type === 'url' ? '🔗' : 
                      action.type === 'folder' ? '📁' :
                      action.type === 'card' ? '📝' : '🌀';
      
      const btnW = 30/camera.zoom;
      
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      roundRect(ctx, btnX, btnY, btnW, btnH, 4/camera.zoom);
      ctx.fill();
      
      ctx.font = `${16/camera.zoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = txCol;
      ctx.fillText(btnText, btnX + btnW/2, btnY + btnH/2);
      ctx.restore();
      
      btnX += btnW + btnPad;
    });
  }
  
  // ── RENDERIZAR WORMHOLES ──
  if(node.wormholes && node.wormholes.length > 0 && !isMin) {
    const wormY = y + h - 60/camera.zoom;
    let wormX = x + pad;
    const wormSize = 12/camera.zoom;
    
    node.wormholes.forEach((worm, idx) => {
      if(idx >= 5) return; // Máximo 5 wormholes visíveis
      
      const icon = worm.type === 'project' ? '#' :
                   worm.type === 'card' ? '@' :
                   worm.type === 'folder' ? '!' : '📝';
      
      ctx.save();
      ctx.font = `${wormSize}px Inter`;
      ctx.fillStyle = '#3b82f6';
      ctx.fillText(icon, wormX, wormY);
      ctx.restore();
      
      wormX += wormSize + 4/camera.zoom;
    });
  }

  const titleLines = wrapLines(ctx, node.title||'Sem título', cw, Math.max(1, Math.floor((h-(textY-y)-20/camera.zoom)/(titleSz+4/camera.zoom))));
  titleLines.forEach((ln,i) => {
    const lx = node.shape==='circle' ? x+w/2 : cx;
    const ly = textY + i*(titleSz+4/camera.zoom);
    ctx.fillText(ln, lx, ly);
    if(node.textUnderline) drawUnderline(ctx, ln, lx, ly, titleSz, node.shape==='circle'?'center':'left');
  });
  textY += titleLines.length*(titleSz+4/camera.zoom)+4/camera.zoom;

  if(node.note && !isMin) {
    const noteSz = (node.noteSize||11)/camera.zoom;
    ctx.font = `${node.textItalic?'italic ':''}400 ${noteSz}px Inter`;
    ctx.fillStyle = txCol;
    ctx.strokeStyle = txCol;
    const maxLines = Math.max(1, Math.floor((y+h-pad-textY)/(noteSz+4/camera.zoom)));
    const noteLines = wrapLines(ctx, node.note, cw, maxLines);
    noteLines.forEach((ln,i)=>{
      const lx = node.shape==='circle' ? x+w/2 : cx;
      const ly = textY+i*(noteSz+4/camera.zoom);
      ctx.fillText(ln, lx, ly);
      if(node.textUnderline) drawUnderline(ctx, ln, lx, ly, noteSz, node.shape==='circle'?'center':'left');
    });
  }

  ctx.textAlign='left';
  ctx.textBaseline='alphabetic';

  if(isSel && !node.locked) {
    ctx.save();
    ctx.fillStyle='#3b82f6';
    ctx.beginPath();
    ctx.arc(x+w, y+h, 5/camera.zoom, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}


function getNodeAt(x,y) {
  for(let i=nodes.length-1;i>=0;i--) {
    const n=nodes[i], h=n.minimized?44:n.height;
    if(n.shape==='circle') {
      const r=Math.min(n.width,h)/2;
      if(Math.hypot(x-n.x-n.width/2,y-n.y-h/2)<r) return n;
    } else {
      if(x>=n.x&&x<=n.x+n.width&&y>=n.y&&y<=n.y+h) return n;
    }
  }
  return null;
}

function getConnAt(x,y) {
  const thr=10/camera.zoom;
  for(const c of connections) {
    const f=nodes.find(n=>n.id===c.from), t=nodes.find(n=>n.id===c.to);
    if(!f||!t) continue;
    const x1=f.x+f.width/2,y1=f.y+f.height/2,x2=t.x+t.width/2,y2=t.y+t.height/2;
    if(distToLine(x,y,x1,y1,x2,y2)<thr) return c;
  }
  return null;
}

function distToLine(px,py,x1,y1,x2,y2) {
  const dx=x2-x1,dy=y2-y1,len2=dx*dx+dy*dy;
  if(len2===0) return Math.hypot(px-x1,py-y1);
  const t=Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/len2));
  return Math.hypot(px-x1-t*dx,py-y1-t*dy);
}

function isResizeHandle(node, x, y) {
  if(!node) return false;
  const h=node.minimized?44:node.height;
  const thr=10/camera.zoom;
  return Math.hypot(x-(node.x+node.width), y-(node.y+h)) < thr;
}

cvs.addEventListener('mousedown', e=>{
  if(inlineEditing) commitInlineEdit();
  const rect=cvs.getBoundingClientRect();
  const mx=(e.clientX-rect.left-camera.x)/camera.zoom;
  const my=(e.clientY-rect.top-camera.y)/camera.zoom;

  hideContextMenu();

  if(mode==='hand' || (e.button===1)) {
    isPanning=true;
    panStart.x=e.clientX-camera.x;
    panStart.y=e.clientY-camera.y;
    cvs.style.cursor='grabbing';
    return;
  }

  if(mode==='connect') {
    const n=getNodeAt(mx,my);
    if(n) connectStart=n;
    return;
  }

  if(['card','folder','note','text','image','wormhole'].includes(mode)) {
    const t = mode==='text'?'note':mode;
    const nn=createNode(mx-100,my-60,t);
    if(mode==='text') { nn.type='card'; nn.note='Texto'; nn.title=''; nn.emoji=''; nn.bgColor='none'; nn.borderColor='none'; }
    if(mode==='image') { nn.type='card'; nn.title=''; nn.note=''; nn.emoji=''; nn.bgColor='none'; nn.borderColor='none'; nn.borderWidth=0; setTimeout(()=>document.getElementById('image-file').click(),0); }
    if(mode==='wormhole') { nn.type='card'; nn.title='Wormhole'; nn.note='#Projeto'; nn.emoji='🌀'; nn.bgColor='#e9d5ff'; nn.borderColor='#8b5cf6'; nn.actions=[{type:'wormhole',dest:'#Projeto'}]; }
    nodes.push(nn);
    selectNodeObj(nn);
    saveHist(); draw(); triggerSave();
    mode='select';
    document.querySelectorAll('.sidebar-tool').forEach(b=>b.classList.remove('on'));
    document.getElementById('tool-select').classList.add('on');
    return;
  }

  const n=getNodeAt(mx,my);
  if(n) {
    // ── DETECTAR CLIQUE EM BOTÕES ──
    const clickedBtn = getButtonAt(n, mx, my);
    if(clickedBtn) {
      handleNavigation(clickedBtn);
      return;
    }
    
    // ── DETECTAR CLIQUE EM WORMHOLES ──
    const clickedWorm = getWormholeAt(n, mx, my);
    if(clickedWorm) {
      const wormDest = clickedWorm.target || clickedWorm.dest;
      if(wormDest) handleWormhole(wormDest);
      return;
    }
    
    if(e.detail===2) { if(!activateNode(n)) startInlineEdit(n,e); return; }
    if(isResizeHandle(n,mx,my) && !n.locked) {
      isResizing=true; resizeNode=n;
      resizeStart={mx,my,w:n.width,h:n.minimized?44:n.height,iconSize:n.iconSize||({'icon':42,'folder':32,'note':28,'card':28}[n.type]||28)};
      return;
    }
    selectNodeObj(n);
    nodes=nodes.filter(x=>x.id!==n.id).concat(n);
    if(!n.locked) { isDragging=true; dragNode=n; dragOffset.x=mx-n.x; dragOffset.y=my-n.y; }
    draw();
  } else {
    const c=getConnAt(mx,my);
    if(c) { selectConnObj(c); draw(); return; }
    selectNodeObj(null); selectConnObj(null);
    isPanning=true;
    panStart.x=e.clientX-camera.x;
    panStart.y=e.clientY-camera.y;
    draw();
  }
});

cvs.addEventListener('mousemove', e=>{
  const rect=cvs.getBoundingClientRect();
  const mx=(e.clientX-rect.left-camera.x)/camera.zoom;
  const my=(e.clientY-rect.top-camera.y)/camera.zoom;

  if(isResizing&&resizeNode) {
    const dx=mx-resizeStart.mx, dy=my-resizeStart.my;
    const oldW = resizeNode.width, oldH = resizeNode.height;
    const isIcon = resizeNode.type === 'icon';
    const minW = isIcon ? 24 : 80;
    const minH = isIcon ? 24 : 50;
    resizeNode.width  = Math.max(minW, resizeStart.w + dx);
    resizeNode.height = Math.max(minH, resizeStart.h + dy);
    // iconSize escala proporcionalmente em TODOS os tipos de nó
    if(resizeStart.iconSize > 0 && resizeStart.w > 0) {
      const scale = resizeNode.width / resizeStart.w;
      resizeNode.iconSize = Math.max(10, Math.min(200, Math.round(resizeStart.iconSize * scale)));
    }
    // Redimensionar filhos proporcionalmente
    resizeChildrenProportionally(resizeNode, oldW, oldH);
    updatePanel(); draw();
  } else if(isDragging&&dragNode) {
    const oldX=dragNode.x, oldY=dragNode.y;
    dragNode.x=mx-dragOffset.x; dragNode.y=my-dragOffset.y;
    // Mover filhos junto (sistema hierárquico)
    const deltaX=dragNode.x-oldX, deltaY=dragNode.y-oldY;
    if(dragNode.children && dragNode.children.length>0) {
      dragNode.children.forEach(childId=>{
        const child=nodes.find(n=>n.id===childId);
        if(child) { child.x+=deltaX; child.y+=deltaY; }
      });
    }
    draw();
  } else if(isPanning) {
    camera.x=e.clientX-panStart.x;
    camera.y=e.clientY-panStart.y;
    draw();
  } else if(mode==='connect'&&connectStart) {
    draw();
    ctx.save();
    ctx.translate(camera.x,camera.y); ctx.scale(camera.zoom,camera.zoom);
    ctx.strokeStyle='#3b82f6'; ctx.lineWidth=2.5/camera.zoom;
    ctx.shadowColor='rgba(59,130,246,.5)'; ctx.shadowBlur=8/camera.zoom;
    ctx.setLineDash([8/camera.zoom,4/camera.zoom]);
    ctx.beginPath();
    ctx.moveTo(connectStart.x+connectStart.width/2,connectStart.y+connectStart.height/2);
    ctx.lineTo(mx,my); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }

  // Cursor
  if(selectedNode && isResizeHandle(selectedNode,mx,my)) cvs.style.cursor='nwse-resize';
  else if(isDragging||isPanning) cvs.style.cursor='grabbing';
  else if(mode==='hand') cvs.style.cursor='grab';
  else if(mode==='connect') cvs.style.cursor='crosshair';
  else if(['card','folder','note','text','image','wormhole'].includes(mode)) cvs.style.cursor='copy';
  else cvs.style.cursor='default';
});

cvs.addEventListener('mouseup', e=>{
  if(isResizing) { saveHist(); triggerSave(); }
  if(isDragging&&dragNode) { saveHist(); triggerSave(); }
  if(mode==='connect'&&connectStart) {
    const rect=cvs.getBoundingClientRect();
    const mx=(e.clientX-rect.left-camera.x)/camera.zoom;
    const my=(e.clientY-rect.top-camera.y)/camera.zoom;
    const en=getNodeAt(mx,my);
    if(en&&en.id!==connectStart.id) {
      const ex=connections.some(c=>(c.from===connectStart.id&&c.to===en.id)||(c.from===en.id&&c.to===connectStart.id));
      if(!ex) {
        connections.push({id:`c${connIdCtr++}`,from:connectStart.id,to:en.id,style:settings.defaultConnStyle,width:2,color:'default',opacity:1,curve:70});
        saveHist(); triggerSave();
      }
    }
    connectStart=null;
  }
  isResizing=false; resizeNode=null;
  isDragging=false; dragNode=null;
  isPanning=false;
  cvs.style.cursor='default';
  draw();
});

window.addEventListener('mouseup',()=>{ isDragging=false; dragNode=null; isPanning=false; isResizing=false; resizeNode=null; });

cvs.addEventListener('wheel',e=>{
  e.preventDefault();
  // Shift + scroll → tamanho do ícone do card selecionado
  if(e.shiftKey && selectedNode && !selectedNode.locked) {
    const delta = e.deltaY > 0 ? -2 : 2;
    selectedNode.iconSize = Math.max(10, Math.min(200, (selectedNode.iconSize||28) + delta));
    saveHist(); draw(); triggerSave(); updatePanel();
    return;
  }
  const rect=cvs.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  const wx=(mx-camera.x)/camera.zoom, wy=(my-camera.y)/camera.zoom;
  const dz=e.deltaY>0?0.9:1.1;
  const nz=Math.max(0.08,Math.min(4,camera.zoom*dz));
  camera.x=mx-wx*nz; camera.y=my-wy*nz; camera.zoom=nz;
  draw();
},{passive:false});

cvs.addEventListener('contextmenu',e=>{
  e.preventDefault();
  const rect=cvs.getBoundingClientRect();
  const mx=(e.clientX-rect.left-camera.x)/camera.zoom;
  const my=(e.clientY-rect.top-camera.y)/camera.zoom;
  const n=getNodeAt(mx,my);
  if(n) { selectNodeObj(n); showCtxMenu(e.clientX,e.clientY,n); draw(); }
});
