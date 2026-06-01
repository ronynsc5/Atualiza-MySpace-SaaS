// ─── INIT ────────────────────────────────────────────────────────
window.addEventListener('resize',resize);
resize();
applySettings();

const loaded = loadSave();

if(!loaded || nodes.length===0) {
  // Sample nodes mimicking the image
  const card1=createNode(-350,-130,'card');
  card1.title='Campanha de Lançamento'; card1.emoji='🚀'; card1.note='Planejar e executar a campanha de lançamento do produto com foco em engajamento.';
  card1.bgColor='#ede9fe'; card1.borderColor='#a855f7'; card1.width=220; card1.height=160;

  const folder1=createNode(-80,-150,'folder');
  folder1.title='Pesquisas e Insights'; folder1.emoji='📁'; folder1.bgColor='#fef3c7'; folder1.borderColor='#f59e0b'; folder1.width=160; folder1.height=120;

  const card2=createNode(160,-130,'card');
  card2.title='Objetivos'; card2.emoji='🎯'; card2.note='• Aumentar visibilidade\n• Gerar leads qualificados\n• Converter em vendas';
  card2.bgColor='#fce7f3'; card2.borderColor='#ec4899'; card2.width=200; card2.height=160;

  const circle1=createNode(-200,80,'note');
  circle1.title='Ideia Central'; circle1.emoji='💡'; circle1.note='Criar uma experiência memorável para o usuário.';
  circle1.bgColor='#d1fae5'; circle1.borderColor='#10b981'; circle1.shape='circle'; circle1.width=160; circle1.height=160;

  const card3=createNode(160,80,'card');
  card3.title='Site do Produto'; card3.emoji='🔗'; card3.note=''; card3.actions=[{type:'url',dest:'https://meusite.com'}];
  card3.bgColor='#dbeafe'; card3.borderColor='#3b82f6'; card3.width=200; card3.height=110;

  const card4=createNode(-80,240,'card');
  card4.title='Anotações'; card4.emoji='📋'; card4.note='Reunião com time de marketing para alinhas estratégias e definir próximos passos.';
  card4.bgColor='#ffffff'; card4.borderColor='#d1d5db'; card4.width=200; card4.height=150;

  const noteCard=createNode(-380,230,'card');
  noteCard.title='Lembrete importante!'; noteCard.emoji='⭐'; noteCard.bgColor='#fef9c3'; noteCard.borderColor='#f59e0b'; noteCard.width=200; noteCard.height=70;

  nodes=[card1,folder1,card2,circle1,card3,card4,noteCard];

  connections=[
    {id:`c${connIdCtr++}`,from:card1.id,to:folder1.id,style:'dashed',width:2,color:'#a855f7',opacity:0.8},
    {id:`c${connIdCtr++}`,from:folder1.id,to:card2.id,style:'curved',width:2,color:'#ec4899',opacity:0.8},
    {id:`c${connIdCtr++}`,from:circle1.id,to:card1.id,style:'curved',width:2,color:'#10b981',opacity:0.8},
    {id:`c${connIdCtr++}`,from:circle1.id,to:card3.id,style:'dashed',width:2,color:'#3b82f6',opacity:0.7},
    {id:`c${connIdCtr++}`,from:card4.id,to:card3.id,style:'straight',width:2,color:'#6b7280',opacity:0.8},
  ];

  workspaces.root={nodes:[...nodes],connections:[...connections],camera:{...camera}};
  camera={x:480,y:280,zoom:1};
}

saveHist();
draw();
triggerSave();

// Mostrar dashboard se houver múltiplos projetos
if(Object.keys(workspaces).length > 1) {
  // showDashboard(); // Descomentado para iniciar no dashboard
}
