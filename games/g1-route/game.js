/*
 * 길따라 쪼르르 — 호플우드 게임 1 (전략 게임)
 * 다람쥐·고슴도치·너구리가 정해진 길로만 움직인다. 내 길과 상대 길을 비교해 잡거나 피하고 반대편 집에 도착한다.
 * 의존 전역: showScreen, showWin, lastCfg, savePreferences, curGame, hwChar, hwCharName, hwSfx, hwSay, icon
 */
const G1_CAST=['squirrel','hedgehog','raccoon'];
function g1Char(i,view='face'){ return hwChar(G1_CAST[i],view); }

const g1={ mode:'solo', level:1, board:null, pieces:null, score:null, turn:'A', previewId:null, compareId:null, armed:null, locked:false, pass:0, pid:0, win:2, runId:0 };
const ARROW_ROT={ "-1,0":0,"1,0":180,"0,-1":-90,"0,1":90 };
function g1_later(callback,delay){ const runId=g1.runId; return setTimeout(()=>{if(g1.runId===runId&&curGame==='g1')callback();},delay); }
function g1_cancel(){g1.runId++;g1.locked=true;}
function g1_shuffle(a){ for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];} }
/* 난이도별 캐릭터 고유 경로. A는 아래→위, B는 같은 길을 위→아래로 움직인다. */
/* 난이도별 캐릭터 고유 경로. A(아이)는 아래→위, B(컴퓨터)는 같은 길을 위→아래로 움직인다.
   scripts/g1-route-lab.js로 완전 탐색해 고른 배치: 아이가 먼저 두고 잘 생각하면 이길 수 있고,
   아이 대리 플레이어 승률이 쉬움 > 보통 > 어려움 순으로 내려가도록 했다. */
const G1_ROUTE_SETS={
  1:[
    [[4,0],[3,0],[2,0],[1,0],[0,0]],
    [[4,2],[3,2],[2,2],[1,2],[0,2]],
    [[4,4],[4,3],[3,3],[2,3],[1,3],[0,3]]
  ],
  2:[
    [[4,0],[3,0],[3,1],[3,2],[2,2],[1,2],[0,2]],
    [[4,2],[3,2],[2,2],[2,3],[2,4],[1,4],[0,4]],
    [[4,4],[3,4],[2,4],[1,4],[1,3],[0,3]]
  ],
  3:[
    [[4,0],[3,0],[3,1],[2,1],[1,1],[1,0],[0,0]],
    [[4,2],[3,2],[2,2],[2,1],[2,0],[1,0],[1,1],[0,1]],
    [[4,4],[3,4],[3,3],[3,2],[2,2],[1,2],[1,3],[1,4],[0,4]]
  ]
};
function g1_teamRoutes(team){ return G1_ROUTE_SETS[g1.level].map(route=>{
  const cells=team==='A'?route:route.slice().reverse(); return cells.map(([r,c])=>[r,c]);
}); }

function g1Start(mode){ g1.runId++; g1_memo=new Map(); g1.stat={moves:0,compared:0,captures:0,lost:0,turnCompared:false}; g1.mode=mode; g1.level=lastCfg.g1.level; lastCfg.g1.mode=mode; savePreferences(); g1.win=g1.level===1?2:3;
  g1.board=Array.from({length:5},()=>Array(5).fill(null)); g1.pieces={}; g1.pid=0; g1.score={A:0,B:0};
  g1.previewId=null; g1.compareId=null; g1.armed=null; g1.locked=false; g1.pass=0;
  g1_teamRoutes('A').forEach((rt,i)=>g1_add('A',i,rt)); g1_teamRoutes('B').forEach((rt,i)=>g1_add('B',i,rt)); g1.turn='A';
  document.getElementById('g1nameA').textContent=mode==='solo'?'나':'파랑'; document.getElementById('g1nameB').textContent=mode==='solo'?'컴퓨터':'빨강';
  document.getElementById('g1faceA').innerHTML=icon('pawn'); document.getElementById('g1faceB').innerHTML=icon('pawn');
  g1_dots(); g1_buildBoard(); g1_renderPieces(); g1_arrows(); g1_score(); g1_turnMsg(); showScreen('g1Game');
  if(typeof hwCoach==='function')g1_later(()=>hwCoach('g1',[
    {el:'#g1pieces .pc.A',text:'파란 테두리 친구가 내 친구예요. 눌러 보면 갈 길에 숫자가 나와요.',tap:true},
    {el:'#g1pieces .pc.B',text:'이번엔 빨간 친구를 눌러요. 두 길이 어디서 만나는지 볼 수 있어요.',tap:true},
    {el:'#g1cells .cell.hl',text:'반짝이는 1번 칸을 누르면 한 칸 가요! 상대를 잡거나 집에 먼저 가면 점수!',tap:true}
  ]),400); }
function g1_add(team,char,cells){ const id='a'+(g1.pid++); const [r,c]=cells[0]; g1.pieces[id]={id,team,char,cells,idx:0,r,c}; g1.board[r][c]=id; }
function g1_dots(){ ['A','B'].forEach(tm=>{ const d=document.getElementById('g1dots'+tm); d.innerHTML=''; for(let i=0;i<g1.win;i++){const s=document.createElement('i');s.className='dot';d.appendChild(s);} }); }
function g1_buildBoard(){ const cells=document.getElementById('g1cells'); cells.style.gridTemplateColumns='repeat(5,1fr)'; cells.style.gridTemplateRows='repeat(5,1fr)'; cells.innerHTML='';
  for(let r=0;r<5;r++)for(let c=0;c<5;c++){ const cell=document.createElement('button'); cell.type='button'; cell.className='cell'+(r===4?' homeA':'')+(r===0?' homeB':'');
    cell.innerHTML='<div class="tile-bg"></div><div class="homeband"></div><div class="ring"></div><div class="num"></div>'; cell.onclick=()=>g1_click(r,c); cells.appendChild(cell); } g1_updateCellLabels(); }
function g1_cell(r,c){ return document.getElementById('g1cells').children[r*5+c]; }
function g1_updateCellLabels(){ for(let r=0;r<5;r++)for(let c=0;c<5;c++){ const id=g1.board[r][c], pc=id&&g1.pieces[id];
  g1_cell(r,c).setAttribute('aria-label',`${r+1}행 ${c+1}열, ${pc?((pc.team==='A'?'내':'상대')+' '+hwCharName(G1_CAST[pc.char])):'빈 칸'}`); } }
function g1_el(id){ return document.getElementById('g1el_'+id); }
function g1_renderPieces(){ const layer=document.getElementById('g1pieces'); layer.innerHTML='';
  Object.values(g1.pieces).forEach(pc=>{ const e=document.createElement('div'); e.className='pc '+pc.team; e.id='g1el_'+pc.id;
    e.style.width='20%'; e.style.height='20%'; e.style.left=(pc.c*20)+'%'; e.style.top=(pc.r*20)+'%';
    e.innerHTML=`<div class="chip">${g1Char(pc.char,'face')}<span class="arrow"></span></div>`; layer.appendChild(e); }); }
function g1_move(pc){ const e=g1_el(pc.id); e.classList.add('moving'); e.style.left=(pc.c*20)+'%'; e.style.top=(pc.r*20)+'%'; setTimeout(()=>e&&e.classList.remove('moving'),360); }
function g1_arrows(){ Object.values(g1.pieces).forEach(pc=>{ const a=g1_el(pc.id).querySelector('.arrow');
  if(pc.idx>=pc.cells.length-1){a.innerHTML=icon('house');return;} const [nr,nc]=pc.cells[pc.idx+1], key=(nr-pc.r)+','+(nc-pc.c), rot=ARROW_ROT[key]??0;
  a.innerHTML=icon('arrow-up'); const v=a.querySelector('.ui-icon'); if(v)v.style.transform=`rotate(${rot}deg)`; }); }
function g1_advanceable(pc){ if(pc.idx>=pc.cells.length-1)return false; const [nr,nc]=pc.cells[pc.idx+1]; const o=g1.board[nr][nc]; return !(o&&g1.pieces[o].team===pc.team); }
function g1_click(r,c){ if(g1.locked)return; if(g1.armed){ const p=g1.pieces[g1.armed]; const [nr,nc]=p.cells[p.idx+1]; if(nr===r&&nc===c){g1_advance(g1.armed);return;} }
  const o=g1.board[r][c]; if(o)g1_preview(o); else g1_clear(); }
function g1_setGuide(text){ const guide=document.getElementById('g1guide'); if(guide)guide.textContent=text; }
function g1_drawRoute(pc,isOwn){ for(let k=pc.idx+1;k<pc.cells.length;k++){ const [rr,cc]=pc.cells[k], ce=g1_cell(rr,cc), ord=k-pc.idx;
  ce.classList.add(ord===1?(isOwn?'hl':'peek'):(isOwn?'stepO':'stepF'));
  const mark=document.createElement('span'); mark.className='route-num '+pc.team; mark.textContent=ord; mark.setAttribute('aria-label',(pc.team===g1.turn?'내':'상대')+' 경로 '+ord+'번째 칸'); ce.querySelector('.num').appendChild(mark); } }
function g1_preview(id){ const pc=g1.pieces[id], isCurrent=pc.team===g1.turn, canControl=isCurrent&&(g1.mode==='duo'||g1.turn==='A')&&!g1.locked;
  if(isCurrent){ g1.previewId=id; g1.compareId=null; g1.armed=(canControl&&g1_advanceable(pc))?id:null; }
  else if(g1.previewId&&g1.pieces[g1.previewId]&&g1.pieces[g1.previewId].team===g1.turn){ g1.compareId=id; if(g1.stat&&g1.mode==='solo'&&g1.turn==='A')g1.stat.turnCompared=true; }
  else { g1.previewId=id; g1.compareId=null; g1.armed=null; }
  document.querySelectorAll('#g1pieces .pc.sel,#g1pieces .pc.compare').forEach(e=>e.classList.remove('sel','compare'));
  if(g1.previewId&&g1.pieces[g1.previewId].team===g1.turn)g1_el(g1.previewId).classList.add('sel');
  if(g1.compareId)g1_el(g1.compareId).classList.add('compare');
  g1_clearCells();
  if(g1.previewId){ const first=g1.pieces[g1.previewId]; g1_drawRoute(first,first.team===g1.turn); }
  if(g1.compareId)g1_drawRoute(g1.pieces[g1.compareId],false);
  document.querySelectorAll('#g1cells .cell').forEach(ce=>{ if(ce.querySelectorAll('.route-num').length>1)ce.classList.add('route-cross'); });
  if(g1.compareId)g1_setGuide('두 색 숫자가 만나는 칸과 도착 순서를 비교해 잡을지 피할지 계산해요.');
  else if(isCurrent)g1_setGuide(g1.armed?'이제 상대 캐릭터를 눌러 두 길을 함께 비교해요.':'앞 칸에 우리 말이 있어요. 다른 캐릭터도 살펴보세요.');
  else g1_setGuide('상대의 정해진 길이에요. 내 캐릭터를 먼저 누르면 두 길을 함께 볼 수 있어요.'); }
function g1_clear(){ g1.previewId=null; g1.compareId=null; g1.armed=null; document.querySelectorAll('#g1pieces .pc.sel,#g1pieces .pc.compare').forEach(e=>e.classList.remove('sel','compare')); g1_clearCells();
  g1_setGuide('내 캐릭터를 누른 뒤 상대 캐릭터를 눌러 두 길을 비교해요.'); }
function g1_clearCells(){ document.querySelectorAll('#g1cells .cell').forEach(ce=>{ ce.classList.remove('hl','peek','stepO','stepF','route-cross'); ce.querySelector('.num').innerHTML=''; }); }
function g1_pointMessage(team,type,last=false){ if(g1.mode==='solo'){
  if(team==='A')return type==='capture'?(last?'잡고 집에 도착했어요! +1':'상대 말을 잡았어요! +1'):'집에 도착했어요! +1';
  return type==='capture'?'내 말이 잡혔어요. 컴퓨터 +1':'컴퓨터가 집에 도착했어요. +1';
 } const who=team==='A'?'파랑':'빨강'; return who+(type==='capture'?(last?'이 잡고 도착했어요! +1':'이 상대 말을 잡았어요! +1'):'이 집에 도착했어요! +1'); }
function g1_advance(id){ hwSfx('place'); g1_clear(); g1.locked=true; g1.pass=0; const pc=g1.pieces[id]; const ni=pc.idx+1; const [nr,nc]=pc.cells[ni]; const last=ni===pc.cells.length-1; const occ=g1.board[nr][nc];
  if(g1.stat&&g1.mode==='solo'){ if(pc.team==='A'){ g1.stat.moves++; if(g1.stat.turnCompared)g1.stat.compared++; if(occ)g1.stat.captures++; } else if(occ)g1.stat.lost++; g1.stat.turnCompared=false; }
  g1.board[pc.r][pc.c]=null;
  if(occ){ const ce=g1_el(occ); ce.classList.add('gone'); setTimeout(()=>ce&&ce.remove(),380); delete g1.pieces[occ]; pc.r=nr;pc.c=nc;pc.idx=ni; g1_move(pc);
    if(last){ g1.board[nr][nc]=null; const me=g1_el(id); setTimeout(()=>me&&me.remove(),320); delete g1.pieces[id]; } else { g1.board[nr][nc]=pc.id; g1_el(id).classList.add('pop'); }
    g1.score[pc.team]++; g1_float(g1_pointMessage(pc.team,'capture',last)); }
  else if(last){ pc.r=nr;pc.c=nc;pc.idx=ni; g1_move(pc); const me=g1_el(id); setTimeout(()=>me.classList.add('home'),230); setTimeout(()=>me&&me.remove(),730);
    g1.board[nr][nc]=null; delete g1.pieces[id]; g1.score[pc.team]++; g1_float(g1_pointMessage(pc.team,'home')); }
  else { pc.r=nr;pc.c=nc;pc.idx=ni; g1.board[nr][nc]=pc.id; g1_move(pc); }
  g1_updateCellLabels();
  g1_later(()=>{ g1_arrows(); g1_score(); document.querySelectorAll('#g1pieces .pc.pop').forEach(e=>e.classList.remove('pop'));
    if(g1.score[pc.team]>=g1.win){ showWin(pc.team,g1.mode); return; } g1_endTurn(); },470); }
function g1_movesFor(t){ return Object.values(g1.pieces).filter(p=>p.team===t&&g1_advanceable(p)); }
function g1_endTurn(){ g1.turn=g1.turn==='A'?'B':'A';
  if(g1_movesFor(g1.turn).length===0){ g1.pass++; g1_float((g1.mode==='solo'?(g1.turn==='A'?'나':'컴퓨터'):(g1.turn==='A'?'파랑':'빨강'))+' 쉬어요');
    if(g1.pass>=2){ const w=g1.score.A===g1.score.B?null:(g1.score.A>g1.score.B?'A':'B'); g1_later(()=>showWin(w,g1.mode),600); return; }
    g1_later(()=>{ g1.turn=g1.turn==='A'?'B':'A'; g1_after(); },700); return; } g1_after(); }
function g1_after(){ g1_turnMsg(); if(g1.mode==='solo'&&g1.turn==='B') g1_later(g1_ai,700); else g1.locked=false; }
function g1_routeForecastScore(piece,depth){ let score=0;
  for(const foe of Object.values(g1.pieces)){ if(foe.team!=='A')continue;
    for(let a=1;a<=depth&&foe.idx+a<foe.cells.length;a++)for(let b=1;b<=depth&&piece.idx+b<piece.cells.length;b++){
      const [ar,ac]=foe.cells[foe.idx+a], [br,bc]=piece.cells[piece.idx+b]; if(ar!==br||ac!==bc)continue;
      if(a===b)score-=42/a; else if(b===a+1)score+=32/b;
    }
  } return score; }
/* 컴퓨터: 판 끝까지 정확히 계산해(메모이제이션 완전 탐색) 이기는 수를 고르고, 난이도에 따라 가끔 아무 수나 둔다.
   rand는 scripts/g1-route-lab.js와 difficulty-sim.js로 잰 승률을 보고 정했다. */
const G1_AI={1:{rand:.65},2:{rand:.3},3:{rand:0}};
let g1_memo=new Map();
function g1_simState(){ const pieces={}; Object.values(g1.pieces).forEach(p=>{pieces[p.id]={id:p.id,team:p.team,cells:p.cells,idx:p.idx,r:p.r,c:p.c};});
  return {pieces,board:g1.board.map(row=>row.slice()),score:{A:g1.score.A,B:g1.score.B}}; }
function g1_simMoves(st,team){ return Object.values(st.pieces).filter(p=>{ if(p.team!==team||p.idx>=p.cells.length-1)return false; const [r,c]=p.cells[p.idx+1]; const o=st.board[r][c]; return !(o&&st.pieces[o].team===team); }); }
function g1_simApply(st,id){ const pieces={}; Object.keys(st.pieces).forEach(k=>{pieces[k]={...st.pieces[k]};}); const n={pieces,board:st.board.map(row=>row.slice()),score:{...st.score}};
  const pc=n.pieces[id], ni=pc.idx+1, [r,c]=pc.cells[ni], last=ni===pc.cells.length-1, occ=n.board[r][c];
  n.board[pc.r][pc.c]=null; if(occ)delete n.pieces[occ]; pc.idx=ni; pc.r=r; pc.c=c;
  if(last){ delete n.pieces[id]; } else n.board[r][c]=id;
  if(occ||last)n.score[pc.team]++;
  return n; }
/* 차례인 쪽 기준 +1 이김 · 0 비김 · -1 짐 */
function g1_solve(st,turn,passes){
  if(st.score[turn]>=g1.win)return 1; const other=turn==='A'?'B':'A'; if(st.score[other]>=g1.win)return -1;
  const key=Object.keys(st.pieces).sort().map(k=>k+st.pieces[k].idx).join('.')+'|'+st.score.A+st.score.B+turn+passes;
  if(g1_memo.has(key))return g1_memo.get(key);
  const moves=g1_simMoves(st,turn); let best;
  if(!moves.length){ if(passes>=1){ const d=st.score[turn]-st.score[other]; best=d>0?1:(d<0?-1:0); } else best=-g1_solve(st,other,passes+1); }
  else{ best=-2; for(const m of moves){ const v=-g1_solve(g1_simApply(st,m.id),other,0); if(v>best)best=v; if(best===1)break; } }
  g1_memo.set(key,best); return best; }
/* 같은 결과인 수끼리는 잡기·도착을 먼저, 바로 잡히는 자리는 나중에 */
function g1_moveFlavor(st,p){ const [r,c]=p.cells[p.idx+1]; const occ=st.board[r][c]; let v=Math.random();
  if(occ)v+=5; if(p.idx+1===p.cells.length-1)v+=4;
  const after=g1_simApply(st,p.id); if(!after.pieces[p.id])return v;
  if(g1_simMoves(after,'A').some(a=>{const [ar,ac]=a.cells[a.idx+1]; return ar===r&&ac===c;}))v-=3;
  return v; }
function g1_ai(){ const c=g1_movesFor('B'); if(!c.length){g1.locked=false;g1_endTurn();return;}
  const cfg=G1_AI[g1.level]||G1_AI[2]; let pick;
  if(Math.random()<cfg.rand) pick=c[(Math.random()*c.length)|0];
  else{ const st=g1_simState(); const scored=c.map(p=>({p,v:-g1_solve(g1_simApply(st,p.id),'A',0),f:g1_moveFlavor(st,p)}));
    const top=Math.max(...scored.map(x=>x.v)); const best=scored.filter(x=>x.v===top).sort((a,b)=>b.f-a.f);
    pick=best[0].p; }
  g1_advance(pick.id); }
function g1_threat(r,c,by,movingId,capturedId){ for(const p of Object.values(g1.pieces)){ if(p.team!==by||p.id===capturedId||p.idx>=p.cells.length-1)continue; const [nr,nc]=p.cells[p.idx+1]; const o=g1.board[nr][nc];
  if(o&&o!==capturedId&&o!==movingId&&g1.pieces[o]&&g1.pieces[o].team===p.team)continue; if(nr===r&&nc===c)return true; } return false; }
function g1_score(){ ['A','B'].forEach(tm=>{ const d=document.querySelectorAll('#g1dots'+tm+' .dot'); d.forEach((x,i)=>x.classList.toggle('f', i<g1.score[tm])); }); }
function g1_turnMsg(){ document.getElementById('g1teamA').dataset.turn=g1.turn==='A'?'1':'0'; document.getElementById('g1teamB').dataset.turn=g1.turn==='B'?'1':'0';
  document.getElementById('g1teamB').classList.toggle('thinking',g1.mode==='solo'&&g1.turn==='B');
  const who=g1.turn==='A'?'<b class="blue">'+(g1.mode==='solo'?'나':'파랑')+'</b>':'<b class="red">'+(g1.mode==='solo'?'컴퓨터':'빨강')+'</b>';
  const thinking=g1.mode==='solo'&&g1.turn==='B'; document.getElementById('g1turn').innerHTML=who+(thinking?' 생각 중…':' 차례예요!');
  g1_setGuide(thinking?'컴퓨터가 고정된 길의 다음 수를 비교하고 있어요.':'내 캐릭터를 누른 뒤 상대 캐릭터를 눌러 두 길을 비교해요.'); }
function g1_float(t){ const f=document.getElementById('g1float'); f.textContent=t; f.classList.remove('show'); void f.offsetWidth; f.classList.add('show'); }

/* 놀이 기록 요약 (혼자 하기 판) */
function g1_sessionSummary(){ const s=g1.stat; if(!s)return null; return {level:g1.level,moves:s.moves,compared:s.compared,captures:s.captures,lost:s.lost}; }

/* ---------- 등록 (게임 약속: games/registry.js) ---------- */
hwRegisterGame({
  id:'g1',order:1,
  title:'길따라 쪼르르',age:'6세+',ages:['6-7','8+'],players:'1–2명',time:'약 5분',category:'전략',hero:'내 길과 상대 길,<br>먼저 읽어봐!',description:'다람쥐·고슴도치·너구리의 정해진 길을 읽고, 잡거나 피하며 숲을 건너요.',card:'길을 읽고 잡거나 피하며 먼저 건너요.',coverClass:'cover-route',cast:['squirrel','hedgehog'],icon:'route',
  music:'route',questIcon:'route',
  defaults:{mode:'solo',level:1},
  levels:{1:'곧은 길, 2점 먼저. 상대 바로 앞 칸에 들어가지 않으면 이길 수 있어요.',2:'길이 네 번 겹쳐요. 컴퓨터가 종종 실수해요.',3:'길이 다섯 번 겹치고 첫 수부터 중요해요. 컴퓨터가 실수하지 않아요.'},
  rules:{ title:'길따라 쪼르르', body:[
    ['1','다람쥐·고슴도치·너구리는 저마다 <b>정해진 길</b>로만 다녀요. 난이도가 같으면 길도 같아요.'],
    ['2','내 친구를 누르면 갈 길이 <b>1→2→3 순서</b>로 보여요. 반짝이는 1번 칸으로 한 칸 움직여요.'],
    ['i-eye','내 친구를 고른 뒤 <b>상대 친구를 누르면</b> 두 길이 함께 보여요. 숫자가 만나는 칸을 비교해요.'],
    ['i-shield','상대가 다음에 올 칸은 피하고, 내 1번 칸에 상대가 있으면 <b>잡아요.</b>'],
    ['i-target','상대를 잡거나 반대편 집에 도착하면 <b>1점!</b>'],
    ['i-star','쉬움은 <b>2점</b>, 보통과 어려움은 <b>3점</b>을 먼저 모으면 승리!']]},
  guide:{art:'squirrel',
     line:'정해진 길을 읽고, 몇 차례 뒤 친구들이 어디서 만날지 미리 따져 보는 게임이에요.',
     areas:{obs:1,space:2,plan:2,self:1},
     steps:[['route','길 읽기','내 친구가 갈 칸을 1→2→3 순서로 봐요.'],['eye','두 길 겹쳐 보기','상대 친구 길도 눌러 만나는 칸을 찾아요.'],['target','한 칸 고르기','잡을지 피할지 정하고 움직여요.']],
     levels:[['쉬움','곧은 길, 2점 먼저 · 컴퓨터가 자주 실수'],['보통','네 번 겹치는 길 · 컴퓨터가 종종 실수'],['어려움','다섯 번 겹치는 길 · 첫 수부터 중요, 컴퓨터 실수 없음']],
     signs:['움직이기 전에 상대 친구를 눌러 두 길을 비교해요.','“여기 가면 잡혀” 처럼 다음 차례를 말로 설명해요.','잡을 기회보다 안전한 길을 고르는 순간이 있어요.'],
     talk:'“다음 차례에 너구리는 어디로 올 것 같아?” 하고 한 수 앞을 같이 짚어 보세요.'},
  insight(list,h){ const {add,ratio}=h;
      const moves=add(list,'moves'), compared=add(list,'compared');
      const lines=[`움직이기 전에 상대 길을 먼저 눌러 본 차례가 <b>${moves}번 중 ${compared}번</b>이에요.`,
        `상대 친구를 <b>${add(list,'captures')}번</b> 잡고, <b>${add(list,'lost')}번</b> 잡혔어요.`];
      const rate=ratio(compared,moves);
      return {lines,metric:l=>ratio(add(l,'compared'),add(l,'moves')),metricName:'미리 비교한 차례',
        tip:rate!==null&&rate<.3?'움직이기 전에 “상대 친구 길도 눌러 볼까?” 하고 권해 보세요.':'“왜 그 친구를 움직였어?” 하고 고른 이유를 물어보세요.'};
    },
  mount(){
    const setup=document.getElementById('g1Setup'), game=document.getElementById('g1Game');
    if(setup)setup.innerHTML=`
    <div class="pagebar"><button onclick="backHub()" aria-label="놀이터로 돌아가기"><svg class="ui-icon" aria-hidden="true"><use href="#i-chevron-left"></use></svg></button><span>길따라 쪼르르</span><button onclick="showRules('g1')" aria-label="게임 방법 보기">?</button></div>
    <div class="setup-card">
      <div class="intro">
        <div class="big-em duo-stage" id="g1SetupEm" aria-hidden="true"></div>
        <div class="intro-copy">
          <h2 class="game-title-heading"><button class="game-title-button" id="g1TitleBtn" aria-expanded="false" aria-controls="g1Thinking" onclick="toggleThinking('g1')"><span>길따라 쪼르르 <i>i</i></span></button></h2>
          <small class="skill-hint">제목을 눌러 재미 포인트 보기</small>
          <p class="desc">다람쥐·고슴도치·너구리는 저마다 정해진 길로만 움직여요. 내 길과 상대 길의 순서를 비교해 잡거나 피하고, 반대편 집에 도착해요.</p>
          <div class="game-meta"><span>6세+</span><span><svg class="ui-icon" aria-hidden="true"><use href="#i-users"></use></svg>1–2명</span><span><svg class="ui-icon" aria-hidden="true"><use href="#i-clock"></use></svg>약 5분</span></div>
        </div>
      </div>
      <div class="thinking-panel" id="g1Thinking" hidden>
        <strong>이 게임의 재미 포인트</strong>
        <div class="thinking-grid">
          <div class="thinking-item"><b><svg class="ui-icon" aria-hidden="true"><use href="#i-route"></use></svg>정해진 길 읽기</b><small>각 캐릭터의 숫자 순서를 따라가요.</small></div>
          <div class="thinking-item"><b><svg class="ui-icon" aria-hidden="true"><use href="#i-eye"></use></svg>두 길 비교하기</b><small>내 길과 상대 길이 만나는 칸을 찾아요.</small></div>
          <div class="thinking-item"><b><svg class="ui-icon" aria-hidden="true"><use href="#i-shield"></use></svg>잡힐 자리 피하기</b><small>상대의 다음 칸에 멈추지 않게 생각해요.</small></div>
          <div class="thinking-item"><b><svg class="ui-icon" aria-hidden="true"><use href="#i-target"></use></svg>잡을 차례 노리기</b><small>상대가 올 자리를 먼저 계산해요.</small></div>
        </div>
      </div>
      <div class="difficulty-progress"><i><span id="g1LevelFill"></span></i><b id="g1LevelCount">1 / 3</b></div>
      <div class="choice-label"><span>얼마나 어렵게 할까요?</span><small>언제든 다시 고를 수 있어요</small></div>
      <div class="seg three" id="g1LevelSeg">
        <button data-lv="1" data-on="1" aria-pressed="true" onclick="setLevel('g1',1)"><b>쉬움</b><small>곧은 길</small></button>
        <button data-lv="2" data-on="0" aria-pressed="false" onclick="setLevel('g1',2)"><b>보통</b><small>길이 겹쳐요</small></button>
        <button data-lv="3" data-on="0" aria-pressed="false" onclick="setLevel('g1',3)"><b>어려움</b><small>첫 수부터 중요</small></button>
      </div>
      <p class="level-note" id="g1LevelNote">곧은 길이 많고 컴퓨터가 여유롭게 둬요.</p>
      <div class="row">
        <button class="btn blue big" onclick="g1Start('solo')">혼자 시작</button>
        <button class="btn red big" onclick="g1Start('duo')">둘이 시작</button>
      </div>
      <div class="foot"><button class="btn ghost" onclick="showRules('g1')">게임 방법 듣고 보기</button></div>
    </div>
  `;
    if(game)game.innerHTML=`
    <div class="scorebar">
      <div class="team blue" id="g1teamA"><span class="team-avatar" id="g1faceA" aria-hidden="true"></span><span class="name" id="g1nameA">파랑</span><span class="dots" id="g1dotsA"></span></div>
      <div class="team red" id="g1teamB"><span class="team-avatar" id="g1faceB" aria-hidden="true"></span><span class="name" id="g1nameB">빨강</span><span class="dots" id="g1dotsB"></span></div>
    </div>
    <div class="turnmsg" id="g1turn" aria-live="polite"></div>
    <div class="route-guide" id="g1guide" aria-live="polite">내 캐릭터를 누른 뒤 상대 캐릭터를 눌러 두 길을 비교해요.</div>
    <div class="board" id="g1board">
      <div class="cells" id="g1cells"></div>
      <div class="pieces" id="g1pieces"></div>
      <div class="floatmsg" id="g1float" aria-live="polite"></div>
    </div>
    <div class="legend">
      <div class="lg"><span class="em"><svg class="ui-icon" aria-hidden="true"><use href="#i-arrow-up"></use></svg></span><b>화살표</b><br>정해진 다음 칸</div>
      <div class="lg"><span class="em"><svg class="ui-icon" aria-hidden="true"><use href="#i-eye"></use></svg></span><b>내 말 → 상대 말</b><br>두 길 함께 보기</div>
      <div class="lg"><span class="em"><svg class="ui-icon" aria-hidden="true"><use href="#i-target"></use></svg></span><b>잡기·집 도착</b><br>1점씩!</div>
    </div>
    <div class="foot">
      <button class="btn ghost" onclick="showRules('g1')">방법</button>
      <button class="btn ghost" onclick="backHub()">홈으로</button>
    </div>
  `;
    const em=document.getElementById('g1SetupEm'); if(em)em.innerHTML=hwChar('squirrel','full')+hwChar('raccoon','full');
  },
  /* 아이 기록 화면: 최고 기록(과거의 나와 비교)과 기록 배지 */
  record:{key:'captures',label:'한 판에 잡은 친구',unit:'마리',goal:3,badge:'길 읽기 달인'},
  start:g1Start,cancel:g1_cancel,summary:g1_sessionSummary
});
