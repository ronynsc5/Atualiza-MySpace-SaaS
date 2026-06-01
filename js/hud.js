// ─── FLOATING HUD ────────────────────────────────────────────────
// Roda no escopo principal — acesso direto a selectedNode, camera, draw, ctx etc

(function initHUD() {

  // ── CSS ──
  const st = document.createElement('style');
  st.textContent =
    '#ms-hud{position:fixed;z-index:700;display:none;align-items:center;pointer-events:none;user-select:none;}' +
    '#ms-hud.v{display:flex;}' +
    '.hb{display:flex;align-items:center;gap:1px;background:var(--bg);border:1.5px solid var(--border2);border-radius:12px;padding:3px 6px;box-shadow:0 6px 22px var(--shadow2);pointer-events:all;gap:2px;}' +
    '.hb-btn{width:34px;height:34px;border:none;background:none;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1;color:var(--text2);font-family:Inter,sans-serif;font-weight:700;touch-action:none;}' +
    '.hb-btn:hover{background:var(--bg3);color:var(--text);}' +
    '.hb-btn:active{background:var(--accent);color:var(--bg);}' +
    '.hb-sep{width:1px;height:18px;background:var(--border2);margin:0 4px;flex-shrink:0;}' +
    '.hb-val{font-size:11px;color:var(--text3);font-family:Inter,sans-serif;min-width:26px;text-align:center;font-variant-numeric:tabular-nums;pointer-events:none;}' +
    '.hb-ico{font-size:13px;opacity:.55;padding:0 2px;pointer-events:none;}';
  document.head.appendChild(st);

  // ── HTML ──
  const hud = document.createElement('div');
  hud.id = 'ms-hud';
  hud.innerHTML =
    '<div class="hb">' +
      '<button class="hb-btn" id="hb-wm" title="Card menor">&#8722;</button>' +
      '<span class="hb-val" id="hb-wv">···</span>' +
      '<button class="hb-btn" id="hb-wp" title="Card maior">+</button>' +
      '<div class="hb-sep"></div>' +
      '<span class="hb-ico">&#128161;</span>' +
      '<button class="hb-btn" id="hb-im" title="\xCdcone menor" style="font-size:15px">&#8722;</button>' +
      '<span class="hb-val" id="hb-iv">···</span>' +
      '<button class="hb-btn" id="hb-ip" title="\xCdcone maior" style="font-size:15px">+</button>' +
    '</div>';
  document.body.appendChild(hud);

  // ── REFERÊNCIA ESTÁVEL AO NÓ SELECIONADO ──
  // Guardamos aqui pra não perder o ref se selectedNode virar null antes do pointerdown processar
  let _hudNode = null;

  // ── BLOQUEIA TODOS OS EVENTOS DO BAR CHEGAREM AO CANVAS ──
  const bar = hud.querySelector('.hb');
  ['pointerdown','mousedown','touchstart'].forEach(function(evt) {
    bar.addEventListener(evt, function(e) {
      e.stopPropagation();
      e.preventDefault();
    }, { capture: true });
  });

  // ── AÇÃO GENÉRICA ──
  function act(fn) {
    const n = _hudNode;
    if (!n || n.locked) return;
    fn(n);
    saveHist();
    draw();
    triggerSave();
    updatePanel();
    posHUD();
  }

  // ── USAR pointerup em vez de onclick ─ mais confiável ──
  function addAction(id, fn) {
    const btn = document.getElementById(id);
    btn.addEventListener('pointerup', function(e) {
      e.stopPropagation();
      e.preventDefault();
      act(fn);
    });
    // Garantia: também no click, caso pointerup não dispare
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      act(fn);
    });
  }

  addAction('hb-wm', function(n) {
    n.width  = Math.max(80, n.width  - 20);
    n.height = Math.max(50, n.height - 20);
  });
  addAction('hb-wp', function(n) {
    n.width  += 20;
    n.height += 20;
  });
  addAction('hb-im', function(n) {
    n.iconSize = Math.max(10, (n.iconSize || 28) - 4);
  });
  addAction('hb-ip', function(n) {
    n.iconSize = Math.min(120, (n.iconSize || 28) + 4);
  });

  // ── POSICIONAMENTO ──
  function posHUD() {
    const n = _hudNode || selectedNode;
    if (!n) { hud.classList.remove('v'); return; }

    const SB = 64, TB = 52;
    const sx = n.x * camera.zoom + camera.x + SB;
    const sy = n.y * camera.zoom + camera.y + TB;
    const sw = n.width * camera.zoom;
    const sh = (n.minimized ? 44 : n.height) * camera.zoom;

    const hw = hud.offsetWidth || 200;
    let left = sx + sw / 2 - hw / 2;
    let top  = sy - 52;
    if (top < 58) top = sy + sh + 10;

    left = Math.max(SB + 4, Math.min(window.innerWidth - hw - 4, left));
    hud.style.left = Math.round(left) + 'px';
    hud.style.top  = Math.round(top)  + 'px';
    hud.classList.add('v');

    document.getElementById('hb-wv').textContent = Math.round(n.width);
    document.getElementById('hb-iv').textContent = (n.iconSize || 28);
  }

  // ── HOOK NO selectNodeObj ──
  const _origSelect = selectNodeObj;
  selectNodeObj = window.selectNodeObj = function(node) {
    _origSelect(node);
    // Ícones puros usam drag direto — HUD desnecessário pra eles
    _hudNode = (node && node.type !== 'icon') ? node : null;
    if (_hudNode) posHUD();
    else hud.classList.remove('v');
  };

  // ── RAF LOOP ──
  function loop() {
    // Sincroniza _hudNode com selectedNode (pode mudar por outros caminhos)
    if (selectedNode && selectedNode !== _hudNode) _hudNode = selectedNode;
    if (!selectedNode && _hudNode) {
      // Mantém HUD visível por 100ms após deselect — permite pointerup chegar
      setTimeout(function() {
        if (!selectedNode) { _hudNode = null; hud.classList.remove('v'); }
      }, 120);
    }
    if (_hudNode) posHUD();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ── HANDLE DE RESIZE MAIOR (zona de clique 18px, visual 9px) ──
  const _origIsResize = isResizeHandle;
  isResizeHandle = window.isResizeHandle = function(node, x, y) {
    if (!node) return false;
    const h = node.minimized ? 44 : node.height;
    const thr = (node.type === 'icon' ? 28 : 18) / camera.zoom;
    return Math.hypot(x - (node.x + node.width), y - (node.y + h)) < thr;
  };

  // ── HANDLE VISUAL REDESENHADO DEPOIS DO draw() ──
  const _origDraw = draw;
  draw = window.draw = function() {
    _origDraw();
    const n = selectedNode;
    if (!n || n.locked) return;
    const h = n.minimized ? 44 : n.height;
    // posição em coordenadas de canvas (já dentro do ctx transformado)
    ctx.save();
    ctx.setTransform(camera.zoom, 0, 0, camera.zoom, camera.x, camera.y);
    ctx.shadowColor = 'rgba(59,130,246,0.45)';
    ctx.shadowBlur = 10 / camera.zoom;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(n.x + n.width, n.y + h, 9 / camera.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + (11 / camera.zoom) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2198', n.x + n.width, n.y + h + 0.5 / camera.zoom);
    ctx.restore();
  };

  console.log('[HUD] pronto');
})();
