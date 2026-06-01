// ─── CANVAS SETUP ────────────────────────────────────────────────
const cvs = document.getElementById('cvs');
const ctx = cvs.getContext('2d');
let W, H;

function resize() {
  const wrap = document.getElementById('canvas-wrap');
  W = cvs.width = wrap.clientWidth;
  H = cvs.height = wrap.clientHeight;
  draw();
}

// ─── STATE ───────────────────────────────────────────────────────
let nodes = [];
let connections = [];
let selectedNode = null;
let selectedConn = null;
let nodeIdCtr = 1;
let connIdCtr = 1;
let mode = 'select';
let camera = { x: 0, y: 0, zoom: 1 };
let history = []; let histIdx = -1; const MAX_HIST = 50;
let isDragging = false, dragNode = null, dragOffset = {x:0,y:0};
let isPanning = false, panStart = {x:0,y:0};
let isResizing = false, resizeNode = null, resizeStart = {};
let connectStart = null;
let inlineEditing = null;

// Navigation / workspaces
let navStack = [], currentLevel = 'root';
let workspaces = { root: { nodes:[], connections:[], camera:{x:0,y:0,zoom:1} } };

let settings = {
  theme:'light', showGrid:true, showShadows:true, autoMinimize:false,
  defaultConnStyle:'curved', showArrows:true, highlightConn:true,
  autoSave:true, autoRestore:true
};

// ─── AUTO SAVE ───────────────────────────────────────────────────
let autoSaveTimer = null, lastSave = null;

function triggerSave() {
  if (!settings.autoSave) return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(doSave, 2000);
}

function doSave() {
  try {
    const data = { workspaces, currentLevel, navStack, settings, ts: new Date().toISOString() };
    localStorage.setItem('myspace-v2', JSON.stringify(data));
    lastSave = new Date();
    updateSaveLabel();
    flashSave();
    const e = document.getElementById('last-save-time');
    if(e) e.textContent = 'Agora mesmo';
  } catch(e) { console.error(e); }
}

function flashSave() {
  const dot = document.getElementById('save-dot');
  const lbl = document.getElementById('save-label');
  if(dot && lbl) { dot.style.background='#22c55e'; lbl.textContent='Salvo'; }
}

function updateSaveLabel() {
  const t = document.getElementById('save-time');
  if(t && lastSave) t.textContent = '• ' + lastSave.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}

function loadSave() {
  try {
    const raw = localStorage.getItem('myspace-v2');
    if(!raw) return false;
    const d = JSON.parse(raw);
    workspaces = d.workspaces || workspaces;
    currentLevel = d.currentLevel || 'root';
    navStack = d.navStack || [];
    settings = {...settings, ...(d.settings||{})};
    const cur = workspaces[currentLevel] || workspaces.root;
    nodes = cur.nodes || [];
    connections = cur.connections || [];
    camera = cur.camera || {x:0,y:0,zoom:1};
    lastSave = d.ts ? new Date(d.ts) : null;
    updateSaveLabel();
    applySettings();
    hydrateImages();
    return nodes.length > 0;
  } catch(e) { return false; }
}

// ─── NODE CREATION ───────────────────────────────────────────────
const BG_COLORS = { card:'none', folder:'#fef3c7', note:'#d1fae5' };
const BORDER_COLORS = { card:'none', folder:'#f59e0b', note:'#10b981' };
const EMOJIS_DEFAULT = { card:'📝', folder:'📁', note:'🗒️' };

function createNode(x, y, type='card') {
  const w = type==='folder'?160:(type==='note'?180:200);
  const defaultIconSize = Math.round(w * 0.20); // ~20% da largura = tamanho legível e proporcional
  return {
    id: `n${nodeIdCtr++}`, type, x, y,
    width: w,
    height: type==='folder'?120:(type==='note'?130:140),
    title: type==='folder'?'Nova Pasta':(type==='note'?'Nota':'Novo Card'),
    note: '',
    emoji: EMOJIS_DEFAULT[type]||'',
    iconSize: defaultIconSize,
    bgColor: BG_COLORS[type]||'none',
    bgOpacity: 1,
    borderColor: BORDER_COLORS[type]||'none',
    borderWidth: 1.5,
    textColor: (document.documentElement.getAttribute('data-theme')==='dark' || document.body.classList.contains('dark')) ? '#f8fafc' : '#1a1a18',
    textSize: 13,
    noteSize: 11,
    textBold: true,
    textItalic: false,
    textUnderline: false,
    iconX: 0,
    iconY: 0,
    iconBg: false,
    shape: type==='folder'?'circle':'rectangle',
    minimized: false,
    locked: false,
    actions: [],
    imageUrl: null,
    imgObj: null,
    linkTarget: null,
    
    // ── NOVOS CAMPOS PROFISSIONAIS ──
    // Sistema de formas avançadas
    shapeType: 'rectangle', // rectangle, square, rounded, circle, pill, hexagon, octagon, diamond, triangle, star, custom
    cornerRadius: 12,
    
    // Sistema de estilos visuais
    stylePreset: 'clean', // clean, minimal, neon, futuristic, glassmorphism, darktech, 3d, soft, outline, cyberpunk, terminal, material
    opacity: 1,
    blur: 0,
    glow: 0,
    glowColor: '#3b82f6',
    gradient: null, // {from:'#color1', to:'#color2', angle:90}
    animatedBorder: false,
    shadowIntensity: 1,
    
    // Sistema de hierarquia e elementos internos
    parentId: null, // ID do elemento pai (para cards dentro de cards)
    children: [], // IDs dos elementos filhos
    zIndex: 0, // Camada
    
    // Sistema de texto avançado
    richText: false,
    markdown: false,
    textAlign: 'left', // left, center, right
    bulletPoints: [],
    headingLevel: 0,
    
    // Sistema de ícones avançado
    iconOptional: true,
    iconType: 'emoji', // emoji, svg, custom
    iconUrl: null,
    iconRotation: 0,
    iconAnimated: false,
    
    // Sistema de imagens avançado
    imageCrop: null, // {x, y, width, height}
    imageRotation: 0,
    imageMask: null, // circle, rounded, custom
    imageOpacity: 1,
    
    // Sistema de notas profissionais
    noteExpanded: false,
    noteAttachments: [],
    noteChecklist: [],
    noteLinks: [],
    
    // Sistema de pastas
    folderContents: [], // IDs dos itens dentro da pasta
    folderOpen: false,
    isSubfolder: false,
    
    // Sistema de botões e links
    buttons: [], // [{label, action, target}]
    wormholes: [], // [{type, target, label}] - #ProjetoX, @CardY, !PastaZ
    
    // Sistema de projetos
    projectId: 'root',
    
    // Metadados
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    tags: [],
    priority: 0
  };
}
