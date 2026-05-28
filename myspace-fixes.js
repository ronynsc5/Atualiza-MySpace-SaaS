/* MySpace Fixes v2.0
   - Menu userbar nao sobrepoe painel direito
   - Bug ID collision (elemento substituindo outro)
   - Memoria instavel corrigida
   - Bugs gerais */
(function(){'use strict';

// ── FIX 1: ID COLLISION ──────────────────────────────────────────
function fixNodeIdCounter(){
  try{
    let m=0;
    const ws=(typeof workspaces!=='undefined')?workspaces:{};
    Object.values(ws).forEach(function(w){
      (w.nodes||[]).forEach(function(n){
        const x=parseInt(String(n.id||'').replace(/\D/g,''),10);
        if(!isNaN(x)&&x>m)m=x;
      });
    });
    (typeof nodes!=='undefined'?nodes:[]).forEach(function(n){
      const x=parseInt(String(n.id||'').replace(/\D/g,''),10);
      if(!isNaN(x)&&x>m)m=x;
    });
    if(typeof nodeIdCtr!=='undefined'&&nodeIdCtr<=m)nodeIdCtr=m+1;
  }catch(e){}
}

setTimeout(fixNodeIdCounter,500);

const oldLS=window.loadSave;
if(typeof oldLS==='function'){
  window.loadSave=loadSave=function(){
    const r=oldLS.apply(this,arguments);
    fixNodeIdCounter();
    return r;
  };
}

const oldCN=window.createNode;
if(typeof oldCN==='function'){
  window.createNode=createNode=function(x,y,t){
    fixNodeIdCounter();
    const n=oldCN.apply(this,arguments);
    if(n&&typeof nodes!=='undefined'){
      const ex=nodes.some(function(e){return e!==n&&String(e.id)===String(n.id);});
      if(ex){if(typeof nodeIdCtr!=='undefined')nodeIdCtr++;n.id='n'+nodeIdCtr++;}
    }
    return n;
  };
}

// ── FIX 2: USERBAR NAO SOBREPOE PAINEL DIREITO ───────────────────
// Roda com delay para garantir que o userbar ja foi criado pelo auth-paywall.js
function fixUserbarOverlap(){
  const rp=document.getElementById('right-panel');
  const ub=document.getElementById('mm-userbar');
  if(!rp||!ub){
    // Tenta de novo em 500ms se ainda nao encontrou
    setTimeout(fixUserbarOverlap, 500);
    return;
  }
  // z-index menor que o painel direito (180) para ficar atras
  ub.style.zIndex='150';
  ub.style.transition='right 0.25s ease';

  // Observa quando o painel abre/fecha
  const obs=new MutationObserver(function(){
    const open=rp.classList.contains('show');
    const rpW=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--rightpanel-w'))||280;
    ub.style.right=open?(rpW+14)+'px':'14px';
  });
  obs.observe(rp,{attributes:true,attributeFilter:['class']});

  // Estado inicial
  const open=rp.classList.contains('show');
  const rpW=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--rightpanel-w'))||280;
  ub.style.right=open?(rpW+14)+'px':'14px';
}

// ── FIX 3: MEMORIA INSTAVEL ──────────────────────────────────────
let _t=null,_s=false;
function reliableSave(){
  if(_s)return;
  clearTimeout(_t);
  _t=setTimeout(function(){
    _s=true;
    try{
      if(typeof currentLevel!=='undefined'&&typeof workspaces!=='undefined'&&Array.isArray(nodes)){
        workspaces[currentLevel]=workspaces[currentLevel]||{};
        workspaces[currentLevel].nodes=nodes.slice();
        workspaces[currentLevel].connections=Array.isArray(connections)?connections.slice():[];
        workspaces[currentLevel].camera=Object.assign({},typeof camera!=='undefined'?camera:{});
      }
      const d={
        version:'3.13-fixes',
        workspaces:typeof workspaces!=='undefined'?workspaces:{},
        currentLevel:typeof currentLevel!=='undefined'?currentLevel:'root',
        navStack:typeof navStack!=='undefined'?navStack:[],
        settings:typeof settings!=='undefined'?settings:{},
        ts:new Date().toISOString()
      };
      localStorage.setItem('myspace-v2',JSON.stringify(d));
      if(window.MySpace&&typeof window.MySpace.saveNow==='function')window.MySpace.saveNow().catch(function(){});
      const dot=document.getElementById('save-dot');
      const lbl=document.getElementById('save-label');
      const tm=document.getElementById('save-time');
      if(dot)dot.style.background='#22c55e';
      if(lbl)lbl.textContent='Salvo';
      if(tm)tm.textContent='- '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    }catch(err){
      const dot=document.getElementById('save-dot'),lbl=document.getElementById('save-label');
      if(dot)dot.style.background='#ef4444';
      if(lbl)lbl.textContent='Erro';
      if(err&&String(err).includes('quota'))alert('Armazenamento cheio! Exporte backup.');
    }finally{_s=false;}
  },1500);
}

window.triggerSave=triggerSave=function(){reliableSave();};
window.doSave=doSave=function(){reliableSave();return true;};

// ── FIX 4: BUGS GERAIS ───────────────────────────────────────────
document.addEventListener('mouseup',function(){
  try{fixNodeIdCounter();}catch(e){}
},true);

document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    try{
      if(typeof connectStart!=='undefined')connectStart=null;
      if(typeof isDragging!=='undefined')isDragging=false;
      if(typeof dragNode!=='undefined')dragNode=null;
    }catch(err){}
  }
});

const oldOF=window.openFolder;
if(typeof oldOF==='function'){
  window.openFolder=openFolder=function(node,force){
    try{
      if(typeof currentLevel!=='undefined'&&typeof workspaces!=='undefined'){
        workspaces[currentLevel]=workspaces[currentLevel]||{};
        workspaces[currentLevel].nodes=Array.isArray(nodes)?nodes.slice():[];
        workspaces[currentLevel].connections=Array.isArray(connections)?connections.slice():[];
        workspaces[currentLevel].camera=Object.assign({},camera||{});
      }
    }catch(e){}
    return oldOF.apply(this,arguments);
  };
}

// ── INIT ─────────────────────────────────────────────────────────
if(document.readyState!=='loading'){
  fixNodeIdCounter();
  // Userbar fix com delay para garantir que auth-paywall.js ja rodou
  setTimeout(fixUserbarOverlap,1000);
}else{
  document.addEventListener('DOMContentLoaded',function(){
    fixNodeIdCounter();
    setTimeout(fixUserbarOverlap,1000);
  });
}

console.log('[MySpace Fixes v2.0] OK');
})();
