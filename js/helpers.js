// ─── HELPERS ─────────────────────────────────────────────────────
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

function colorOf(val, fallback) {
  if(!val || val==='none') return fallback;
  return val;
}

function hexToRgb(hex){
  if(!hex || hex==='none') return null;
  const h=hex.replace('#','').trim();
  if(h.length!==6) return null;
  return {r:parseInt(h.slice(0,2),16), g:parseInt(h.slice(2,4),16), b:parseInt(h.slice(4,6),16)};
}
function luminance(hex){
  const rgb=hexToRgb(hex); if(!rgb) return 1;
  const a=[rgb.r,rgb.g,rgb.b].map(v=>{v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4);});
  return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];
}
function readableTextColor(bg, preferred){
  // Se fundo é none/transparente, usa o fundo real do canvas (tema)
  const effectiveBg = (!bg || bg==='none' || bg==='transparent') ? cssVar('--bg') : bg;
  const bgLum = luminance(effectiveBg);
  // Sempre preto ou branco puro baseado na luminância do fundo
  // Threshold 0.45: fundos escuros → texto branco, fundos claros → texto preto
  const autoColor = bgLum < 0.45 ? '#ffffff' : '#111827';
  // Se tem cor preferida, verifica se tem contraste suficiente (4.5:1 WCAG AA)
  if (preferred && preferred !== 'none' && preferred !== '#1a1a18' && preferred !== '#f8fafc') {
    const c1 = (Math.max(bgLum, luminance(preferred)) + 0.05) / (Math.min(bgLum, luminance(preferred)) + 0.05);
    if (c1 >= 4.5) return preferred;
  }
  return autoColor;
}

function colorWithAlphaForFill(color, alpha){
  if(alpha === undefined || alpha === null || alpha >= 1 || !color || color === 'none') return color;
  alpha = Math.max(0, Math.min(1, Number(alpha)));
  if(color.startsWith('#')){
    const rgb = hexToRgb(color);
    return rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})` : color;
  }
  if(color.startsWith('rgb(')){
    return color.replace('rgb(', 'rgba(').replace(')', `,${alpha})`);
  }
  if(color.startsWith('rgba(')){
    return color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, `rgba($1,$2,$3,${alpha})`);
  }
  return color;
}

function loadNodeImage(node){
  if(!node || !node.imageUrl) return;
  const img=new Image();
  img.onload=()=>{ node.imgObj=img; draw(); };
  img.src=node.imageUrl;
}
function hydrateImages(){ nodes.forEach(loadNodeImage); }
function drawUnderline(c, text, x, y, size, align='left'){
  const w=c.measureText(text).width;
  const sx=align==='center'?x-w/2:x;
  c.beginPath(); c.moveTo(sx, y+size+2/camera.zoom); c.lineTo(sx+w, y+size+2/camera.zoom); c.stroke();
}


function roundRect(c, x, y, w, h, r) {
  r = Math.min(r, w/2, h/2);
  c.beginPath();
  c.moveTo(x+r, y);
  c.lineTo(x+w-r, y);
  c.quadraticCurveTo(x+w,y, x+w,y+r);
  c.lineTo(x+w, y+h-r);
  c.quadraticCurveTo(x+w,y+h, x+w-r,y+h);
  c.lineTo(x+r, y+h);
  c.quadraticCurveTo(x,y+h, x,y+r);
  c.lineTo(x, y+r);
  c.quadraticCurveTo(x,y, x+r,y);
  c.closePath();
}

// ── FORMAS GEOMÉTRICAS AVANÇADAS ──
function drawHexagon(c, x, y, w, h) {
  const cx = x + w/2, cy = y + h/2;
  const rx = w/2, ry = h/2;
  c.beginPath();
  for(let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i;
    const px = cx + rx * Math.cos(angle);
    const py = cy + ry * Math.sin(angle);
    if(i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
}

function drawOctagon(c, x, y, w, h) {
  const cx = x + w/2, cy = y + h/2;
  const rx = w/2, ry = h/2;
  c.beginPath();
  for(let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i;
    const px = cx + rx * Math.cos(angle);
    const py = cy + ry * Math.sin(angle);
    if(i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
}

function drawDiamond(c, x, y, w, h) {
  c.beginPath();
  c.moveTo(x + w/2, y);
  c.lineTo(x + w, y + h/2);
  c.lineTo(x + w/2, y + h);
  c.lineTo(x, y + h/2);
  c.closePath();
}

function drawTriangle(c, x, y, w, h) {
  c.beginPath();
  c.moveTo(x + w/2, y);
  c.lineTo(x + w, y + h);
  c.lineTo(x, y + h);
  c.closePath();
}

function drawStar(c, x, y, w, h, points = 5) {
  const cx = x + w/2, cy = y + h/2;
  const outerRadius = Math.min(w, h) / 2;
  const innerRadius = outerRadius * 0.4;
  c.beginPath();
  for(let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);
    if(i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
}

function drawCardShape(c, node) {
  const x = node.x, y = node.y, w = node.width, h = node.height;
  const shape = node.shapeType || node.shape || 'rectangle';
  
  switch(shape) {
    case 'circle':
      c.beginPath();
      c.arc(x+w/2, y+h/2, Math.min(w,h)/2, 0, Math.PI*2);
      break;
    case 'hexagon':
      drawHexagon(c, x, y, w, h);
      break;
    case 'octagon':
      drawOctagon(c, x, y, w, h);
      break;
    case 'diamond':
      drawDiamond(c, x, y, w, h);
      break;
    case 'triangle':
      drawTriangle(c, x, y, w, h);
      break;
    case 'star':
      drawStar(c, x, y, w, h);
      break;
    case 'pill':
      roundRect(c, x, y, w, h, h/2);
      break;
    case 'rounded':
      roundRect(c, x, y, w, h, (node.cornerRadius||12));
      break;
    case 'square':
      const size = Math.min(w, h);
      roundRect(c, x, y, size, size, 8/camera.zoom);
      break;
    default: // rectangle
      const r = shape === 'rectangle' ? 12 : (node.cornerRadius||12);
      roundRect(c, x, y, w, h, r);
  }
}

// ══════════════════════════════════════════════════════════════
// ── FUNÇÕES MODULARES PROFISSIONAIS ──────────────────────────
// ══════════════════════════════════════════════════════════════

/**
 * renderShape - Renderiza forma geométrica com estilos avançados
 * Aplica: blur, glow, gradientes, sombras, opacidade
 * Preserva performance via otimização de canvas API
 */
function renderShape(c, node, isSel, isMin) {
  const x = node.x, y = node.y, w = node.width;
  const h = isMin ? 44 : node.height;
  
  c.save();
  
  // Aplicar opacidade global
  if(node.opacity && node.opacity < 1) {
    c.globalAlpha = node.opacity;
  }
  
  // Aplicar blur (glassmorphism)
  if(node.blur && node.blur > 0 && !isMin) {
    c.filter = `blur(${node.blur/camera.zoom}px)`;
  }
  
  // Aplicar sombra otimizada
  if(settings.showShadows && !isMin) {
    const intensity = node.shadowIntensity || 1;
    c.shadowColor = 'rgba(0,0,0,' + (0.1 * intensity) + ')';
   c.shadowBlur = 14 * intensity;
c.shadowOffsetY = 3 * intensity;
  }
  
  // Desenhar forma
  drawCardShape(c, {...node, height: h});
  
  // Aplicar preenchimento (suporte a gradiente)
  if(node.gradient && node.gradient.from && node.gradient.to) {
    const angle = (node.gradient.angle || 135) * Math.PI / 180;
    const grd = c.createLinearGradient(
      x, y, 
      x + w * Math.cos(angle), 
      y + h * Math.sin(angle)
    );
    grd.addColorStop(0, node.gradient.from);
    grd.addColorStop(1, node.gradient.to);
    c.fillStyle = grd;
  } else {
    const bgFill = colorOf(node.bgColor, cssVar('--bg'));
    c.fillStyle = colorWithAlphaForFill(bgFill, node.bgOpacity === undefined ? 1 : node.bgOpacity);
  }
  
  c.fill();
  c.shadowColor = 'transparent';
  c.filter = 'none';
  
  // Aplicar glow effect
  if(node.glow && node.glow > 0 && !isMin) {
    c.shadowColor = node.glowColor || '#3b82f6';
    c.shadowBlur = node.glow / camera.zoom;
    c.lineWidth = (node.borderWidth || 2) / camera.zoom;
    c.strokeStyle = node.glowColor || '#3b82f6';
    c.stroke();
    c.shadowColor = 'transparent';
  }
  
  // Aplicar borda normal
  const bdCol = colorOf(node.borderColor, cssVar('--border'));
  const bw = (node.borderWidth || 1.5) / camera.zoom;
  c.lineWidth = isSel ? Math.max(bw, 2/camera.zoom) : bw;
  c.strokeStyle = isSel ? '#3b82f6' : bdCol;
  if(bdCol !== 'none' || isSel) c.stroke();
  
  c.restore();
}

/**
 * renderIcon - Renderiza ícone adaptativo
 * Herda transformações do pai: escala, rotação, minimização
 */
function renderIcon(c, node, isMin) {
  if(!node.emoji && !node.iconUrl) return;
  if(isMin) return; // Ícone oculto quando minimizado
  
  const x = node.x, y = node.y;
  const iconSize = node.iconSize || 28; // escala com o zoom (sem /camera.zoom)
  const iconX = node.iconX || 0;
  const iconY = node.iconY || 0;
  
  c.save();
  
  // Aplicar rotação se especificado
  if(node.iconRotation) {
    c.translate(x + iconX + iconSize/2, y + iconY + iconSize/2);
    c.rotate(node.iconRotation * Math.PI / 180);
    c.translate(-(x + iconX + iconSize/2), -(y + iconY + iconSize/2));
  }
  
  // Renderizar emoji ou imagem
  if(node.emoji) {
    c.font = `${iconSize}px Arial`;
    c.textAlign = 'left';
    c.textBaseline = 'top';
    c.fillText(node.emoji, x + iconX, y + iconY);
  } else if(node.iconUrl && node.iconObj instanceof HTMLImageElement) {
    c.drawImage(node.iconObj, x + iconX, y + iconY, iconSize, iconSize);
  }
  
  c.restore();
}

/**
 * renderChildNodes - Renderiza filhos hierarquicamente
 * Aplica transformações proporcionais do pai
 */
function renderChildNodes(c, parentNode) {
  if(!parentNode.children || parentNode.children.length === 0) return;
  if(parentNode.minimized) return; // Filhos ocultos se pai minimizado
  
  c.save();
  
  // Aplicar transformações do pai se necessário
  // (clip region para garantir que filhos não saem do pai)
  if(parentNode.type === 'folder' || parentNode.clipChildren) {
    c.beginPath();
    drawCardShape(c, parentNode);
    c.clip();
  }
  
  // Renderizar cada filho
  parentNode.children.forEach(childId => {
    const child = nodes.find(n => n.id === childId);
    if(child) {
      // Filhos herdam visibilidade do pai
      if(!parentNode.minimized) {
        drawNode(child);
      }
    }
  });
  
  c.restore();
}

/**
 * handleNavigation - Sistema de navegação inteligente
 * Suporta: #Projeto, @Card, !Pasta, nota:Nome, URLs
 */
function handleNavigation(action) {
  if(!action || !action.type || !action.dest) return;
  
  switch(action.type) {
    case 'url':
      window.open(action.dest, '_blank');
      break;
      
    case 'folder':
      const folder = nodes.find(n => n.type === 'folder' && n.title === action.dest);
      if(folder) openFolder(folder);
      break;
      
    case 'card':
      const card = nodes.find(n => n.title === action.dest || n.id === action.dest);
      if(card) {
        selectNodeObj(card);
        centerCameraOn(card);
      }
      break;
      
    case 'wormhole':
      handleWormhole(action.dest);
      break;
      
    case 'project':
      navigateToProject(action.dest);
      break;
  }
}

/**
 * handleWormhole - Navega para wormhole (link inteligente)
 * Sintaxe: #Projeto, @Card, !Pasta, nota:Nome
 */
function handleWormhole(dest) {
  if(!dest) return;
  
  // Detectar tipo de wormhole
  if(dest.startsWith('#')) {
    // #Projeto
    const projectName = dest.substring(1);
    navigateToProject(projectName);
  } else if(dest.startsWith('@')) {
    // @Card
    const cardName = dest.substring(1);
    const card = nodes.find(n => n.title === cardName || n.id === cardName);
    if(card) {
      selectNodeObj(card);
      centerCameraOn(card);
    }
  } else if(dest.startsWith('!')) {
    // !Pasta
    const folderName = dest.substring(1);
    const folder = nodes.find(n => n.type === 'folder' && n.title === folderName);
    if(folder) openFolder(folder);
  } else if(dest.startsWith('nota:')) {
    // nota:Nome
    const noteName = dest.substring(5);
    const note = nodes.find(n => n.type === 'note' && n.title === noteName);
    if(note) {
      selectNodeObj(note);
      centerCameraOn(note);
    }
  }
}

/**
 * navigateToProject - Navega para outro projeto
 * Cross-project: abre projeto e centraliza em elemento específico
 */
function navigateToProject(projectNameOrId, targetElementId = null) {
  // Procurar projeto pelo nome ou ID
  let projectId = null;
  
  Object.keys(workspaces).forEach(key => {
    const ws = workspaces[key];
    if(key === projectNameOrId || ws.name === projectNameOrId) {
      projectId = key;
    }
  });
  
  if(!projectId) {
    alert('Projeto não encontrado: ' + projectNameOrId);
    return;
  }
  
  // Salvar estado atual
  persistCurrentWorkspaceState();
  
  // Carregar novo projeto
  currentLevel = projectId;
  const ws = workspaces[projectId];
  nodes = ws.nodes || [];
  connections = ws.connections || [];
  camera = ws.camera || {x:0, y:0, zoom:1};
  
  // Se especificou elemento alvo, centralizar nele
  if(targetElementId) {
    const target = nodes.find(n => n.id === targetElementId || n.title === targetElementId);
    if(target) {
      centerCameraOn(target);
      selectNodeObj(target);
    }
  }
  
  selectNodeObj(null);
  saveHist();
  draw();
  triggerSave();
  updateBreadcrumb();
}

/**
 * centerCameraOn - Centraliza câmera em um elemento
 */
function centerCameraOn(node) {
  if(!node) return;
  camera.x = W/2 - (node.x + node.width/2) * camera.zoom;
  camera.y = H/2 - (node.y + node.height/2) * camera.zoom;
  draw();
}

/**
 * resizeChildrenProportionally - Redimensiona filhos proporcionalmente
 * Quando pai é redimensionado, filhos acompanham a proporção
 */
function resizeChildrenProportionally(parentNode, oldWidth, oldHeight) {
  // Versão segura: evita recursão via wrapper global, ciclos pai/filho e valores NaN/Infinity.
  const finite = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const visited = new Set();

  function resizeBranch(node, previousWidth, previousHeight) {
    if(!node || visited.has(node.id)) return;
    visited.add(node.id);

    const children = Array.isArray(node.children) ? node.children : [];
    if(children.length === 0) return;

    const baseW = Math.max(1, Math.abs(finite(previousWidth, node.width || 1)));
    const baseH = Math.max(1, Math.abs(finite(previousHeight, node.height || 1)));
    const nodeW = Math.max(1, Math.abs(finite(node.width, baseW)));
    const nodeH = Math.max(1, Math.abs(finite(node.height, baseH)));
    const scaleX = nodeW / baseW;
    const scaleY = nodeH / baseH;

    children.forEach(childId => {
      const child = nodes.find(n => n && n.id === childId);
      if(!child || child === node || visited.has(child.id)) return;

      const childOldW = Math.max(1, Math.abs(finite(child.width, 1)));
      const childOldH = Math.max(1, Math.abs(finite(child.height, 1)));
      const relX = finite(child.x, node.x || 0) - finite(node.x, 0);
      const relY = finite(child.y, node.y || 0) - finite(node.y, 0);

      child.x = finite(node.x, 0) + relX * scaleX;
      child.y = finite(node.y, 0) + relY * scaleY;
      child.width = Math.max(10, childOldW * scaleX);
      child.height = Math.max(10, childOldH * scaleY);

      resizeBranch(child, childOldW, childOldH);
    });
  }

  resizeBranch(parentNode, oldWidth, oldHeight);
}

/**
 * getButtonAt - Detecta se o clique foi em um botão de ação
 */
function getButtonAt(node, mx, my) {
  if(!node.actions || node.actions.length === 0) return null;
  if(node.minimized) return null;
  
  const x = node.x, y = node.y, h = node.height;
  const pad = 14/camera.zoom;
  const btnY = y + h - 35/camera.zoom;
  const btnH = 24/camera.zoom;
  const btnW = 30/camera.zoom;
  const btnPad = 8/camera.zoom;
  
  let btnX = x + pad;
  
  for(let i = 0; i < Math.min(3, node.actions.length); i++) {
    if(mx >= btnX && mx <= btnX + btnW && 
       my >= btnY && my <= btnY + btnH) {
      return node.actions[i];
    }
    btnX += btnW + btnPad;
  }
  
  return null;
}

/**
 * getWormholeAt - Detecta se o clique foi em um wormhole
 */
function getWormholeAt(node, mx, my) {
  if(!node.wormholes || node.wormholes.length === 0) return null;
  if(node.minimized) return null;
  
  const x = node.x, y = node.y, h = node.height;
  const pad = 14/camera.zoom;
  const wormY = y + h - 60/camera.zoom;
  const wormSize = 12/camera.zoom;
  
  let wormX = x + pad;
  
  for(let i = 0; i < Math.min(5, node.wormholes.length); i++) {
    if(mx >= wormX && mx <= wormX + wormSize && 
       my >= wormY && my <= wormY + wormSize) {
      return node.wormholes[i];
    }
    wormX += wormSize + 4/camera.zoom;
  }
  
  return null;
}

function wrapLines(c, text, maxW, maxLines) {
  const lines = [];
  const paragraphs = String(text||'').split('\n');
  for(const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if(words.length===0) { lines.push(''); continue; }
    let cur = '';
    for(const w of words) {
      const test = cur ? cur+' '+w : w;
      if(c.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
      else cur = test;
      if(maxLines && lines.length >= maxLines) return lines;
    }
    if(cur) lines.push(cur);
    if(maxLines && lines.length >= maxLines) return lines;
  }
  return lines;
}

function fitText(c, text, maxW) {
  if(c.measureText(text).width <= maxW) return text;
  let t = text;
  while(t.length > 0 && c.measureText(t+'…').width > maxW) t=t.slice(0,-1);
  return t+'…';
}
