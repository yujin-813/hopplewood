/*
 * 비버 집짓기 — 호플우드 게임 5 (공간 퍼즐)
 * 칠교·펜토미노류 교구의 "조각을 돌려 빈틈 없이 채우기"를 짧은 퍼즐 3개로 옮겼다.
 * 퍼즐은 집터를 조각으로 먼저 나눈 뒤 흩어 놓기 때문에 항상 풀 수 있다.
 * 조작: 조각 누르기(고르기) → 한 번 더 누르면 돌리기 → 집터 칸 누르기(그 칸을 덮는 자리에 맞춰 놓기).
 * 의존 전역: showScreen, showWin, lastCfg, curGame, LEVEL_INFO, RULES, hwChar, hwSfx, hwSay, hwSetupMarkup, hwIcon
 */

const G5_LEVELS={
  1:{rows:3,cols:4,holes:[0,1],sizes:[2,3],count:[3,4],rotate:false,puzzles:3},
  2:{rows:4,cols:4,holes:[1,2],sizes:[2,4],count:[4,4],rotate:true,puzzles:3},
  3:{rows:5,cols:5,holes:[2,3],sizes:[3,5],count:[5,6],rotate:true,puzzles:3}
};
const G5_COLORS=['orange','green','blue','red','yellow','purple'];
const G5_TILE=c=>'url(assets/art/board/log_tile_'+c+'.png)';

const g5={level:1,puzzle:0,rows:3,cols:4,region:[],pieces:[],board:[],selected:-1,misses:0,hintStage:0,hintPiece:-1,hintsUsed:0,cleanBuilds:0,locked:false,runId:0,hintTimer:0};

function g5_el(id){ return document.getElementById(id); }
function g5_later(callback,delay){ const runId=g5.runId; return setTimeout(()=>{ if(g5.runId===runId&&curGame==='g5')callback(); },delay); }
function g5_cancel(){ g5.runId++; g5.locked=true; clearTimeout(g5.hintTimer); }
function g5_rand(min,max){ return min+((Math.random()*(max-min+1))|0); }
function g5_shuffle(a){ for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];} return a; }
function g5_key(r,c){ return r+','+c; }

/* ---------- 모양 도우미 ---------- */
function g5_normalize(cells){
  const minR=Math.min(...cells.map(p=>p[0])), minC=Math.min(...cells.map(p=>p[1]));
  return cells.map(([r,c])=>[r-minR,c-minC]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
}
function g5_rotate(shape){ const maxR=Math.max(...shape.map(p=>p[0])); return g5_normalize(shape.map(([r,c])=>[c,maxR-r])); }
function g5_sameShape(a,b){ return a.length===b.length&&a.every((p,i)=>p[0]===b[i][0]&&p[1]===b[i][1]); }

/* ---------- 퍼즐 만들기 ---------- */
function g5_tryPartition(cfg){
  const all=[];
  for(let r=0;r<cfg.rows;r++)for(let c=0;c<cfg.cols;c++)all.push([r,c]);
  const holeCount=g5_rand(cfg.holes[0],cfg.holes[1]);
  const edge=g5_shuffle(all.filter(([r,c])=>r===0||c===0||r===cfg.rows-1||c===cfg.cols-1));
  const holes=new Set(edge.slice(0,holeCount).map(([r,c])=>g5_key(r,c)));
  const region=all.filter(([r,c])=>!holes.has(g5_key(r,c)));
  const inRegion=new Set(region.map(([r,c])=>g5_key(r,c)));
  if(!g5_connected(region,inRegion))return null;
  const owner=new Map(), pieces=[];
  const free=()=>region.filter(([r,c])=>!owner.has(g5_key(r,c)));
  const nbrs=(r,c)=>[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([a,b])=>inRegion.has(g5_key(a,b))&&!owner.has(g5_key(a,b)));
  while(free().length){
    const left=free();
    left.sort((a,b)=>nbrs(...a).length-nbrs(...b).length||Math.random()-.5);
    const seed=left[0];
    const want=Math.min(left.length,g5_rand(cfg.sizes[0],cfg.sizes[1]));
    const cells=[seed]; owner.set(g5_key(...seed),pieces.length);
    while(cells.length<want){
      const frontier=[];
      cells.forEach(([r,c])=>nbrs(r,c).forEach(p=>{ if(!frontier.some(q=>q[0]===p[0]&&q[1]===p[1]))frontier.push(p); }));
      if(!frontier.length)break;
      frontier.sort((a,b)=>nbrs(...a).length-nbrs(...b).length+(Math.random()-.5)*1.5);
      const next=frontier[0]; cells.push(next); owner.set(g5_key(...next),pieces.length);
    }
    if(cells.length<cfg.sizes[0])return null;
    pieces.push(cells);
  }
  if(pieces.length<cfg.count[0]||pieces.length>cfg.count[1])return null;
  return {region,pieces};
}
function g5_connected(region,inRegion){
  if(!region.length)return false;
  const seen=new Set([g5_key(...region[0])]), queue=[region[0]];
  while(queue.length){ const [r,c]=queue.shift(); [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([a,b])=>{ const k=g5_key(a,b); if(inRegion.has(k)&&!seen.has(k)){seen.add(k);queue.push([a,b]);} }); }
  return seen.size===region.length;
}
function g5_buildPuzzle(){
  const cfg=G5_LEVELS[g5.level];
  let made=null, guard=0;
  while(!made&&guard++<500)made=g5_tryPartition(cfg);
  if(!made){ /* 안전장치: 2칸 조각으로 가로 채우기 */
    const region=[],pieces=[];
    for(let r=0;r<2;r++)for(let c=0;c<4;c++)region.push([r,c]);
    for(let c=0;c<4;c+=2)pieces.push([[0,c],[0,c+1]],[[1,c],[1,c+1]]);
    made={region,pieces};
  }
  g5.rows=cfg.rows; g5.cols=cfg.cols;
  g5.region=made.region;
  const colors=g5_shuffle(G5_COLORS.slice());
  g5.pieces=g5_shuffle(made.pieces.map((cells,i)=>{
    const solution=g5_normalize(cells), origin=[Math.min(...cells.map(p=>p[0])),Math.min(...cells.map(p=>p[1]))];
    let shape=solution;
    if(cfg.rotate){ const turns=g5_rand(1,3); for(let t=0;t<turns;t++)shape=g5_rotate(shape); }
    return {id:i,color:colors[i%colors.length],solution,origin,shape,placed:null};
  }));
  g5.board=Array.from({length:g5.rows},()=>Array(g5.cols).fill(null));
  const inRegion=new Set(g5.region.map(([r,c])=>g5_key(r,c)));
  for(let r=0;r<g5.rows;r++)for(let c=0;c<g5.cols;c++)if(!inRegion.has(g5_key(r,c)))g5.board[r][c]='x';
  g5.selected=-1; g5.misses=0; g5.hintStage=0; g5.hintPiece=-1;
}

/* ---------- 흐름 ---------- */
function g5_start(){
  g5_cancel(); g5.runId++;
  curGame='g5';
  g5.level=(lastCfg.g5&&lastCfg.g5.level)||1;
  lastCfg.g5={mode:'solo',level:g5.level}; savePreferences();
  g5.puzzle=0; g5.hintsUsed=0; g5.cleanBuilds=0;
  g5.stat={rotations:0,placements:0,misses:0,lifts:0};
  showScreen('g5Game');
  g5_nextPuzzle(true);
}
function g5_nextPuzzle(first){
  g5.puzzle++; g5.locked=false;
  g5._hintsThisPuzzle=0;
  g5_buildPuzzle();
  g5_render();
  g5_guide(G5_LEVELS[g5.level].rotate?'조각을 고르고, 한 번 더 누르면 돌아가요. 집터 칸을 눌러 놓아요.':'조각을 고른 뒤 집터 칸을 눌러 놓아요.');
  g5_armHint();
  if(first){
    hwSay('통나무 조각으로 집터를 빈틈 없이 꽉 채워요.');
    if(typeof hwCoach==='function')g5_later(()=>hwCoach('g5',[
      {el:'#g5Tray',text:'아래에서 통나무 조각 하나를 골라요. 한 번 더 누르면 빙글 돌아가요.'},
      {el:'#g5Board',text:'모래색 집터 칸을 누르면 그 칸에 맞춰 조각이 놓여요. 빈틈 없이 채워요!'}
    ]),350);
  }
}
function g5_armHint(){
  clearTimeout(g5.hintTimer);
  const btn=g5_el('g5HintBtn'); if(btn)btn.disabled=true;
  g5.hintTimer=g5_later(()=>{ const b=g5_el('g5HintBtn'); if(b)b.disabled=false; },15000);
}
function g5_guide(text){ const g=g5_el('g5Guide'); if(g)g.textContent=text; }
function g5_float(text){ const f=g5_el('g5Float'); if(!f)return; f.textContent=text; f.classList.remove('show'); void f.offsetWidth; f.classList.add('show'); }

/* ---------- 그리기 ---------- */
function g5_render(){ g5_renderTop(); g5_renderBoard(); g5_renderTray(); }
function g5_renderTop(){
  const p=g5_el('g5Progress'); if(!p)return;
  const total=G5_LEVELS[g5.level].puzzles;
  let houses='';
  for(let i=1;i<=total;i++)houses+=`<i data-state="${i<g5.puzzle?'done':(i===g5.puzzle?'now':'todo')}">${hwIcon('house')}</i>`;
  p.innerHTML=`<span class="g5-count">집 ${g5.puzzle} / ${total}</span><span class="g5-houses">${houses}</span>`;
}
function g5_pieceAt(r,c){ const v=g5.board[r]&&g5.board[r][c]; return typeof v==='number'?v:-1; }
function g5_renderBoard(){
  const board=g5_el('g5Board'); if(!board)return;
  board.style.gridTemplateColumns=`repeat(${g5.cols},1fr)`;
  board.style.setProperty('--g5-cols',g5.cols);
  board.innerHTML='';
  for(let r=0;r<g5.rows;r++)for(let c=0;c<g5.cols;c++){
    const v=g5.board[r][c], cell=document.createElement('button');
    cell.type='button'; cell.className='g5-cell'; cell.dataset.r=r; cell.dataset.c=c;
    if(v==='x'){ cell.classList.add('water'); cell.disabled=true; cell.setAttribute('aria-hidden','true'); cell.tabIndex=-1; }
    else if(typeof v==='number'){
      const piece=g5.pieces.find(p=>p.id===v);
      cell.classList.add('filled'); cell.style.backgroundImage=G5_TILE(piece.color);
      [['up',-1,0],['down',1,0],['left',0,-1],['right',0,1]].forEach(([name,dr,dc])=>{ if(g5_pieceAt(r+dr,c+dc)===v)cell.classList.add('join-'+name); });
      cell.setAttribute('aria-label',(r+1)+'줄 '+(c+1)+'칸, 조각이 놓임. 누르면 빼요');
    }else cell.setAttribute('aria-label',(r+1)+'줄 '+(c+1)+'칸, 빈 집터');
    cell.addEventListener('click',()=>g5_cellClick(r,c));
    board.appendChild(cell);
  }
  g5_applyHintMarks();
}
function g5_shapeMarkup(piece){
  const tile=G5_TILE(piece.color);
  const rows=Math.max(...piece.shape.map(p=>p[0]))+1, cols=Math.max(...piece.shape.map(p=>p[1]))+1;
  const set=new Set(piece.shape.map(([r,c])=>g5_key(r,c)));
  let html=`<span class="g5-shape" style="grid-template-columns:repeat(${cols},1fr);--rows:${rows};--cols:${cols}">`;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    if(!set.has(g5_key(r,c))){html+='<i class="gap"></i>';continue;}
    let cls='';
    [['up',-1,0],['down',1,0],['left',0,-1],['right',0,1]].forEach(([n,dr,dc])=>{ if(set.has(g5_key(r+dr,c+dc)))cls+=' join-'+n; });
    html+=`<i class="log${cls}" style="background-image:${tile}"></i>`;
  }
  return html+'</span>';
}
function g5_renderTray(){
  const tray=g5_el('g5Tray'); if(!tray)return;
  tray.innerHTML='';
  const waiting=g5.pieces.filter(p=>!p.placed);
  if(!waiting.length){ tray.innerHTML='<p class="g5-tray-empty">조각을 모두 놓았어요!</p>'; }
  waiting.forEach(piece=>{
    const idx=g5.pieces.indexOf(piece), btn=document.createElement('button');
    btn.type='button'; btn.className='g5-piece'; btn.dataset.on=idx===g5.selected?'1':'0';
    
    btn.setAttribute('aria-pressed',idx===g5.selected?'true':'false');
    btn.setAttribute('aria-label',piece.shape.length+'칸 조각'+(idx===g5.selected?', 고름. 한 번 더 누르면 돌려요':''));
    btn.innerHTML=g5_shapeMarkup(piece)+(idx===g5.selected&&G5_LEVELS[g5.level].rotate?`<span class="g5-rotate-tag">${hwIcon('rotate')}</span>`:'');
    btn.addEventListener('click',()=>g5_selectPiece(idx));
    tray.appendChild(btn);
  });
  const rot=g5_el('g5RotateBtn');
  if(rot){ rot.hidden=!G5_LEVELS[g5.level].rotate; rot.disabled=g5.selected<0; }
}

/* ---------- 조작 ---------- */
function g5_selectPiece(idx){
  if(g5.locked)return;
  const piece=g5.pieces[idx]; if(!piece||piece.placed)return;
  if(g5.selected===idx&&G5_LEVELS[g5.level].rotate){ g5_rotateSelected(); return; }
  g5.selected=idx; hwSfx('tap');
  g5_renderTray();
  g5_guide('이제 집터 칸을 눌러 이 조각을 놓아요.'+(G5_LEVELS[g5.level].rotate?' 모양이 안 맞으면 조각을 한 번 더 눌러 돌려요.':''));
}
function g5_rotateSelected(){
  if(g5.locked||g5.selected<0)return;
  const piece=g5.pieces[g5.selected];
  piece.shape=g5_rotate(piece.shape);
  if(g5.stat)g5.stat.rotations++;
  hwSfx('tap');
  g5_renderTray();
  const btn=g5_el('g5Tray').querySelector('.g5-piece[data-on="1"]');
  if(btn){ btn.classList.remove('spin'); void btn.offsetWidth; btn.classList.add('spin'); }
}
function g5_fitsAt(shape,dr,dc){
  return shape.every(([r,c])=>{ const R=r+dr,C=c+dc; return R>=0&&C>=0&&R<g5.rows&&C<g5.cols&&g5.board[R][C]===null; });
}
function g5_cellClick(r,c){
  if(g5.locked)return;
  const v=g5.board[r][c];
  if(typeof v==='number'){ g5_liftPiece(v); return; }
  if(v!==null)return;
  if(g5.selected<0){ g5_float('먼저 아래에서 조각을 골라요'); hwSfx('tap'); return; }
  const piece=g5.pieces[g5.selected];
  let spot=null;
  for(const [pr,pc] of piece.shape){ const dr=r-pr, dc=c-pc; if(g5_fitsAt(piece.shape,dr,dc)){ spot=[dr,dc]; break; } }
  if(!spot){
    g5.misses++; if(g5.stat)g5.stat.misses++; hwSfx('oops');
    const cell=g5_el('g5Board').children[r*g5.cols+c]; if(cell){cell.classList.remove('nope');void cell.offsetWidth;cell.classList.add('nope');}
    g5_guide(G5_LEVELS[g5.level].rotate?'여기에는 안 들어가요. 조각을 돌려 보거나 다른 칸을 눌러 봐요.':'여기에는 안 들어가요. 다른 칸을 눌러 봐요.');
    if(g5.misses===1)hwSay('여기에는 안 들어가요.');
    if(g5.misses>=2){ const b=g5_el('g5HintBtn'); if(b)b.disabled=false; }
    return;
  }
  if(g5.stat)g5.stat.placements++;
  g5_placePiece(g5.selected,spot[0],spot[1]);
}
function g5_placePiece(idx,dr,dc){
  const piece=g5.pieces[idx];
  piece.shape.forEach(([r,c])=>{ g5.board[r+dr][c+dc]=piece.id; });
  piece.placed=[dr,dc];
  g5.selected=-1; g5.misses=0;
  if(g5.hintPiece===idx){ g5.hintStage=0; g5.hintPiece=-1; }
  hwSfx('place');
  g5_render();
  const cells=piece.shape.map(([r,c])=>g5_el('g5Board').children[(r+dr)*g5.cols+(c+dc)]);
  cells.forEach(n=>n&&n.classList.add('drop'));
  if(g5.region.every(([r,c])=>typeof g5.board[r][c]==='number')){ g5_complete(); return; }
  g5_guide('좋아요! 남은 빈틈을 보고 들어갈 조각을 골라요.');
}
function g5_liftPiece(id){
  const idx=g5.pieces.findIndex(p=>p.id===id), piece=g5.pieces[idx]; if(!piece||!piece.placed)return;
  if(g5.stat)g5.stat.lifts++;
  const [dr,dc]=piece.placed;
  piece.shape.forEach(([r,c])=>{ g5.board[r+dr][c+dc]=null; });
  piece.placed=null; g5.selected=idx;
  hwSfx('tap');
  g5_render();
  g5_guide('조각을 뺐어요. 다른 자리에 놓아 봐요.');
}

/* ---------- 힌트: 한 칸 → 조각 자리 → 대신 놓기 ---------- */
function g5_hint(){
  if(g5.locked)return;
  g5.hintsUsed++; g5._hintsThisPuzzle++;
  const misplaced=g5.pieces.filter(p=>p.placed&&!(g5_sameShape(p.shape,p.solution)&&p.placed[0]===p.origin[0]&&p.placed[1]===p.origin[1]));
  let idx=g5.hintPiece;
  const freeFor=p=>p.solution.every(([r,c])=>{ const v=g5.board[r+p.origin[0]][c+p.origin[1]]; return v===null||v===p.id; });
  if(idx<0||g5.pieces[idx].placed){
    const candidates=g5.pieces.map((p,i)=>i).filter(i=>!g5.pieces[i].placed&&freeFor(g5.pieces[i]));
    if(!candidates.length){
      if(misplaced.length){
        g5_lift(misplaced[0]);
        g5_guide('이 조각이 다른 자리에 가면 좋겠어요. 빼 두었어요.');
        hwSay('이 조각을 다른 자리에 놓아 봐요.');
      }
      return;
    }
    idx=candidates.includes(g5.selected)?g5.selected:candidates[0];
    g5.hintPiece=idx; g5.hintStage=0;
  }
  g5.hintStage++;
  g5.selected=idx;
  const p=g5.pieces[idx];
  if(g5.hintStage>=3){
    p.shape=p.solution.map(x=>x.slice());
    g5_placePiece(idx,p.origin[0],p.origin[1]);
    g5_guide('이 조각은 여기에 들어가요. 나머지는 스스로 해 봐요!');
    return;
  }
  g5_render();
  if(g5.hintStage===1){ g5_guide('반짝이는 칸에 고른 조각의 한 부분이 들어가요.'); hwSay('반짝이는 칸을 봐요.'); }
  else { g5_guide('고른 조각은 반짝이는 자리에 들어가요. 모양이 같아지게 돌려 봐요.'); hwSay('이 자리에 들어가요. 돌려서 맞춰 봐요.'); }
}
function g5_lift(piece){ g5_liftPiece(piece.id); }
function g5_applyHintMarks(){
  if(g5.hintPiece<0||!g5.hintStage)return;
  const p=g5.pieces[g5.hintPiece]; if(!p||p.placed)return;
  const board=g5_el('g5Board');
  const cells=g5.hintStage===1?[p.solution[0]]:p.solution;
  cells.forEach(([r,c])=>{ const n=board.children[(r+p.origin[0])*g5.cols+(c+p.origin[1])]; if(n)n.classList.add('hint'); });
}

function g5_complete(){
  g5.locked=true; clearTimeout(g5.hintTimer);
  if(!g5._hintsThisPuzzle)g5.cleanBuilds++;
  const board=g5_el('g5Board'); if(board)board.classList.add('done');
  const yard=board&&board.parentElement; if(yard&&!yard.querySelector('.g5-house'))yard.insertAdjacentHTML('beforeend','<img class="g5-house" src="assets/art/board/house_complete.png" alt="완성된 통나무 집">');
  hwSfx('good');
  g5_float('집 완성!');
  g5_guide('빈틈 없이 꽉 채웠어요!');
  hwSay('빈틈 없이 꽉 채웠어요!');
  g5_later(()=>{
    if(board)board.classList.remove('done');
    document.querySelectorAll('.g5-house').forEach(n=>n.remove());
    if(g5.puzzle>=G5_LEVELS[g5.level].puzzles){
      showWin('A','solo',`<span class="g5-win-art">${hwChar('beaver','happy')}</span>`,{title:'집 '+G5_LEVELS[g5.level].puzzles+'채를 모두 지었어요!',sub:g5.cleanBuilds?'그중 '+g5.cleanBuilds+'채는 힌트 없이 지었어요.':'힌트를 잘 써서 끝까지 지었어요.'});
    }else g5_nextPuzzle(false);
  },1600);
}

function g5_sessionSummary(){ const s=g5.stat; if(!s)return null; return {level:g5.level,puzzles:G5_LEVELS[g5.level].puzzles,clean:g5.cleanBuilds,hints:g5.hintsUsed,rotations:s.rotations,placements:s.placements,misses:s.misses,lifts:s.lifts}; }

/* ---------- 공통 등록 ---------- */
(function g5_register(){
  LEVEL_INFO.g5={
    1:'작은 집터에 2–3칸 조각을 놓아요. 조각은 돌리지 않아도 돼요.',
    2:'4×4 집터에 조각 4개. 돌려야 맞는 조각이 있어요.',
    3:'5×5 집터에 3–5칸 조각 5–6개. 돌려 보며 빈틈을 채워요.'
  };
  RULES.g5={title:'비버 집짓기',body:[
    ['1','아래에서 <b>통나무 조각</b> 하나를 골라요.'],
    ['i-rotate','골라 둔 조각을 <b>한 번 더 누르면</b> 빙글 돌아가요.'],
    ['2','모래색 <b>집터 칸</b>을 누르면 그 칸을 덮도록 조각이 놓여요.'],
    ['i-swap','놓은 조각을 누르면 <b>다시 빼요.</b> 몇 번이든 바꿔도 괜찮아요.'],
    ['i-star','집터를 <b>빈틈 없이</b> 채우면 집 완성! 막히면 힌트를 눌러요.']
  ]};
  const setup=g5_el('g5Setup');
  if(setup)setup.innerHTML=hwSetupMarkup({
    id:'g5',title:'비버 집짓기',noDuo:true,soloLabel:'집짓기 시작',
    art:hwChar('beaver','full'),
    desc:'비버가 모은 통나무 조각을 돌리고 맞춰서, 집터를 빈틈 없이 꽉 채워요.',
    age:'4세+',players:'1명',time:'3–6분',
    points:[['rotate','머릿속으로 돌리기','조각을 돌리면 어떤 모양이 될까요?'],['puzzle','빈틈 채우기','좁은 구석부터 채우면 쉬워요.'],['swap','바꿔 보기','틀려도 빼고 다시 놓으면 돼요.'],['house','집 완성','집 세 채를 지어요.']],
    levelQuestion:'얼마나 큰 집을 지을까요?',levelHint:'조각 수와 돌리기가 달라져요',
    levels:[['쉬움','작은 집 · 안 돌려요'],['보통','4×4 · 돌리기'],['어려움','5×5 · 큰 조각']]
  });
  const game=g5_el('g5Game');
  if(game)game.innerHTML=`
    <div class="pagebar"><button onclick="backHub()" aria-label="홈으로 돌아가기">${hwIcon('chevron-left')}</button><span>비버 집짓기</span><button onclick="showRules('g5')" aria-label="게임 방법 보기">?</button></div>
    <div class="g5-top"><div class="g5-progress" id="g5Progress"></div><span class="g5-beaver" aria-hidden="true">${hwChar('beaver','face')}</span></div>
    <button class="turnmsg say-line g5-guide" id="g5Guide" aria-live="polite" onclick="hwSay(this.textContent,true)"></button>
    <section class="g5-yard">
      <div class="g5-board" id="g5Board" role="group" aria-label="집터"></div>
      <div class="floatmsg" id="g5Float" aria-live="polite"></div>
    </section>
    <div class="g5-tools">
      <button class="g5-tool" id="g5RotateBtn" onclick="g5_rotateSelected()" disabled>${hwIcon('rotate')} 돌리기</button>
      <button class="g5-tool" id="g5HintBtn" onclick="g5_hint()" disabled>${hwIcon('sparkles')} 힌트</button>
    </div>
    <div class="g5-tray" id="g5Tray" role="group" aria-label="통나무 조각"></div>
    <div class="foot"><button class="btn ghost" onclick="showRules('g5')">방법</button><button class="btn ghost" onclick="backHub()">홈으로</button></div>`;
})();
