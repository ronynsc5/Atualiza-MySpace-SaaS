/* MySpace Fixes v1.0 - ID collision, topbar, memoria, bugs gerais */
(function(){'use strict';

function fixNodeIdCounter(){try{let m=0;const ws=(typeof workspaces!=='undefined')?workspaces:{};Object.values(ws).forEach(function(w){(w.nodes||[]).forEach(function(n){const x=parseInt(String(n.id||'').replace(/\D/g,''),10);if(!isNaN(x)&&x>m)m=x;});});(typeof nodes!=='undefined'?nodes:[]).forEach(function(n){const x=parseInt(String(n.id||'').replace(/\D/g,''),10);if(!isNaN(x)&&x>m)m=x;});if(typeof nodeIdCtr!=='undefined'&&nodeIdCtr<=m)nodeIdCtr=m+1;}catch(e){}}

setTimeout(fixNodeIdCounter,500);

const oldLS=window.loadSave;if(typeof oldLS==='function'){window.loadSave=loadSave=function(){const r=oldLS.apply(this,arguments);fixNodeIdCounter();return r;};}

const oldCN=window.createNode;if(typeof oldCN==='function'){window.createNode=createNode=function(x,y,t){fixNodeIdCounter();const n=oldCN.apply(this,arguments);if(n&&typeof nodes!=='undefined'){const ex=nodes.some(function(e){return e!==n&&String(e.id)===String(n.id);});if(ex){if(typeof nodeIdCtr!=='undefined')nodeIdCtr++;n.id='n'+nodeIdCtr++;}}return n;};}

function fixTopbar(){if(document.getElementById('ms-fixes-css'))return;const s=document.createElement('style');s.id='ms-fixes-css';s.textContent='#topbar{z-index:200!important}#right-panel{z-index:180!important;top:var(--topbar-h)!important}#topbar>div:last-child{max-width:calc(100vw - var(--sidebar-w) - var(--rightpanel-w) - 20px);flex-wrap:wrap;gap:4px}.save-status{flex-shrink:0}';document.head.appendChild(s);}

let _t=null,_s=false;
function reliableSave(){if(_s)return;clearTimeout(_t);_t=setTimeout(function(){_s=true;try{if(typeof currentLevel!=='undefined'&&typeof workspaces!=='undefined'&&Array.isArray(nodes)){workspaces[currentLevel]=workspaces[currentLevel]||{};workspaces[currentLevel].nodes=nodes.slice();workspaces[currentLevel].connections=Array.isArray(connections)?connections.slice():[];workspaces[currentLevel].camera=Object.assign({},typeof camera!=='undefined'?camera:{});}const d={version:'3.13-fixes',workspaces:typeof workspaces!=='undefined'?workspaces:{},currentLevel:typeof currentLevel!=='undefined'?currentLevel:'root',navStack:typeof navStack!=='undefined'?navStack:[],settings:typeof settings!=='undefined'?settings:{},ts:new Date().toISOString()};localStorage.setItem('myspace-v2',JSON.stringify(d));if(window.MySpace&&typeof window.MySpace.saveNow==='function')window.MySpace.saveNow().catch(function(){});const dot=document.getElementById('save-dot'),lbl=document.getElementById('save-label'),tm=document.getElementById('save-time');if(dot)dot.style.background='#22c55e';if(lbl)lbl.textContent='Salvo';if(tm)tm.textContent='- '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}catch(err){const dot=document.getElementById('save-dot'),lbl=document.getElementById('save-label');if(dot)dot.style.background='#ef4444';if(lbl)lbl.textContent='Erro';if(err&&String(err).includes('quota'))alert('Armazenamento cheio! Exporte backup.');}finally{_s=false;}},1500);}

window.triggerSave=triggerSave=function(){reliableSave();};
window.doSave=doSave=function(){reliableSave();return true;};

document.addEventListener('mouseup',function(){try{fixNodeIdCounter();}catch(e){}},true);
document.addEventListener('keydown',function(e){if(e.key==='Escape'){try{if(typeof connectStart!=='undefined')connectStart=null;if(typeof isDragging!=='undefined')isDragging=false;if(typeof dragNode!=='undefined')dragNode=null;}catch(err){}}});

const oldOF=window.openFolder;if(typeof oldOF==='function'){window.openFolder=openFolder=function(node,force){try{if(typeof currentLevel!=='undefined'&&typeof workspaces!=='undefined'){workspaces[currentLevel]=workspaces[currentLevel]||{};workspaces[currentLevel].nodes=Array.isArray(nodes)?nodes.slice():[];workspaces[currentLevel].connections=Array.isArray(connections)?connections.slice():[];workspaces[currentLevel].camera=Object.assign({},camera||{});}}catch(e){}return oldOF.apply(this,arguments);};}

if(document.readyState!=='loading'){fixTopbar();fixNodeIdCounter();}else{document.addEventListener('DOMContentLoaded',function(){fixTopbar();fixNodeIdCounter();});}
console.log('[MySpace Fixes] OK');
})();
