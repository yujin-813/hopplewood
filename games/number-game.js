/*
 * 숫자 징검다리 — 호플우드 게임 4 (수·전략 게임)
 * 주사위 두 개의 합과 차를 "스스로" 구해 그 수가 적힌 칸을 찾아 내 친구를 놓는다.
 * 답과 놓을 수 있는 칸은 미리 보여주지 않는다. 막히면 점 세기 도움 → 줄 힌트 순서로만 돕는다.
 * 말판은 연못(개구리·오리) / 꽃밭(나비·무당벌레) / 벌집(꿀벌·개미) 중 하나다.
 * 의존 전역: showScreen, showWin, lastCfg, curGame, LEVEL_INFO, RULES, hwChar, hwCharName, hwSfx, hwSay, hwJosa, hwSetupMarkup, hwIcon
 */

const G4_THEMES={
  pond:{name:'연못',board:'연잎 연못',A:'frog',B:'duck',cellName:'연잎'},
  flower:{name:'꽃밭',board:'꽃밭',A:'butterfly',B:'ladybug',cellName:'꽃'},
  hive:{name:'벌집',board:'벌집',A:'bee',B:'ant',cellName:'벌집 칸'}
};
const G4_LEVELS={1:{size:5,die:4},2:{size:6,die:6},3:{size:7,die:6}};
const G4_PIPS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};

const g4={
  mode:'solo',level:1,theme:'pond',size:5,turn:'A',locked:false,rolled:false,
  dice:[0,0],values:[],owners:[],last:-1,passes:0,wrong:0,helpOpen:false,rowHint:-1,runId:0,helpTimer:0
};

function g4_el(id){ return document.getElementById(id); }
function g4_later(callback,delay){ const runId=g4.runId; return setTimeout(()=>{ if(g4.runId===runId&&curGame==='g4')callback(); },delay); }
function g4_cancel(){ g4.runId++; g4.locked=true; clearTimeout(g4.helpTimer); }
function g4_themeCfg(){ return G4_THEMES[g4.theme]||G4_THEMES.pond; }
function g4_who(team){ return g4.mode==='solo'?(team==='A'?'나':'컴퓨터'):(team==='A'?'파랑':'빨강'); }
function g4_charOf(team){ return g4_themeCfg()[team]; }

/* ---------- 판 만들기 ---------- */
function g4_valueWeights(die){
  const weights={};
  for(let a=1;a<=die;a++)for(let b=1;b<=die;b++){
    weights[a+b]=(weights[a+b]||0)+1;
    weights[Math.abs(a-b)]=(weights[Math.abs(a-b)]||0)+1;
  }
  return weights;
}
function g4_makeValues(size,die){
  const total=size*size, weights=g4_valueWeights(die), keys=Object.keys(weights).map(Number).sort((a,b)=>a-b);
  const sum=keys.reduce((s,k)=>s+weights[k],0), values=[];
  keys.forEach(k=>values.push(k));
  const rest=total-values.length, counts={};
  keys.forEach(k=>{ counts[k]=Math.floor(weights[k]/sum*rest); });
  keys.forEach(k=>{ for(let i=0;i<counts[k];i++)values.push(k); });
  const byWeight=keys.slice().sort((a,b)=>weights[b]-weights[a]);
  let i=0; while(values.length<total){ values.push(byWeight[i%byWeight.length]); i++; }
  for(let j=values.length-1;j>0;j--){ const k=(Math.random()*(j+1))|0; [values[j],values[k]]=[values[k],values[j]]; }
  return values;
}

function g4_start(mode){
  g4_cancel();
  g4.runId++;
  curGame='g4';
  g4.mode=mode==='duo'?'duo':'solo';
  const cfg=lastCfg.g4||{};
  g4.level=cfg.level||1; g4.theme=G4_THEMES[cfg.theme]?cfg.theme:'pond';
  lastCfg.g4={mode:g4.mode,level:g4.level,theme:g4.theme}; savePreferences();
  const lv=G4_LEVELS[g4.level];
  g4.size=lv.size; g4.turn='A'; g4.locked=false; g4.rolled=false; g4.dice=[0,0];
  g4.values=g4_makeValues(g4.size,lv.die); g4.owners=Array(g4.size*g4.size).fill(null);
  g4.last=-1; g4.passes=0; g4.wrong=0; g4.helpOpen=false; g4.rowHint=-1;
  g4.stat={turns:0,clean:0,helpTurns:0,rowHints:0,wrong:0,passWrong:0,sum:0,diff:0}; g4.turnHelp=false; g4.turnWrong=false;
  g4_renderShell();
  g4_buildBoard();
  g4_resetConsole();
  g4_updateTurn();
  showScreen('g4Game');
  hwSay(hwJosa(hwCharName(g4_charOf('A')),'은/는')+' 왼쪽과 오른쪽을, '+hwJosa(hwCharName(g4_charOf('B')),'은/는')+' 위와 아래를 이어요. 주사위를 굴려 볼까요?');
  if(typeof hwCoach==='function')g4_later(()=>hwCoach('g4',[
    {el:'#g4RollBtn',text:'주사위를 굴리면 두 수가 나와요.'},
    {el:'#g4Equations',text:'두 수를 더한 답, 큰 수에서 작은 수를 뺀 답을 스스로 구해요.'},
    {el:'#g4Board',text:'두 답 중 하나가 적힌 빈 칸을 찾아 눌러요. 내 친구로 양쪽 끝을 먼저 이으면 이겨요!'}
  ]),400);
}

function g4_renderShell(){
  const t=g4_themeCfg(), game=g4_el('g4Game'); if(!game)return;
  game.dataset.theme=g4.theme;
  const nameA=g4_el('g4NameA'), nameB=g4_el('g4NameB');
  if(nameA)nameA.textContent=g4_who('A'); if(nameB)nameB.textContent=g4_who('B');
  const artA=g4_el('g4ArtA'), artB=g4_el('g4ArtB');
  if(artA)artA.innerHTML=hwChar(t.A,'face'); if(artB)artB.innerHTML=hwChar(t.B,'face');
  const dirA=g4_el('g4DirA'), dirB=g4_el('g4DirB');
  if(dirA)dirA.textContent=hwCharName(t.A)+' · 왼쪽↔오른쪽'; if(dirB)dirB.textContent=hwCharName(t.B)+' · 위↔아래';
  const title=g4_el('g4Title'); if(title)title.textContent='숫자 징검다리 · '+t.name;
}

const G4_TILES={pond:['tile_lilypad'],flower:['tile_flower_pink','tile_flower_yellow','tile_flower_purple'],hive:['tile_hive']};
function g4_cellShape(theme,idx){
  const list=G4_TILES[theme]||G4_TILES.pond, file=list[idx%list.length];
  return '<img class="g4-shape" src="assets/art/board/'+file+'.png" alt="" draggable="false" decoding="async">';
}

function g4_buildBoard(){
  const grid=g4_el('g4Grid'), size=g4.size; if(!grid)return;
  const W=1/(size+.5), H=W*1.1547, step=W*.866, totalH=(size-1)*step+H;
  grid.style.aspectRatio=((size+.5)/((size-1)*.866+1.1547)).toFixed(4);
  grid.dataset.size=String(size);
  grid.innerHTML='';
  for(let r=0;r<size;r++)for(let c=0;c<size;c++){
    const idx=r*size+c, cell=document.createElement('button');
    cell.type='button'; cell.id='g4Cell'+idx; cell.className='g4-cell'; cell.dataset.idx=idx;
    cell.style.left=((c+(r%2)*.5)*W*100)+'%';
    cell.style.top=(r*step/totalH*100)+'%';
    cell.style.width=(W*100)+'%';
    cell.style.height=(H/totalH*100)+'%';
    cell.innerHTML=g4_cellShape(g4.theme,r*2+c)+'<span class="g4-number"></span><span class="g4-stone" aria-hidden="true"></span>';
    cell.addEventListener('click',()=>g4_cellClick(idx));
    grid.appendChild(cell);
    g4_renderCell(idx);
  }
  const t=g4_themeCfg();
  ['g4HomeA1','g4HomeA2'].forEach(id=>{const n=g4_el(id);if(n)n.innerHTML=hwChar(t.A,'face');});
  ['g4HomeB1','g4HomeB2'].forEach(id=>{const n=g4_el(id);if(n)n.innerHTML=hwChar(t.B,'face');});
}

function g4_renderCell(idx){
  const cell=g4_el('g4Cell'+idx); if(!cell)return;
  const owner=g4.owners[idx], value=g4.values[idx];
  cell.classList.toggle('A',owner==='A'); cell.classList.toggle('B',owner==='B');
  cell.classList.toggle('last',idx===g4.last);
  cell.querySelector('.g4-number').textContent=value;
  cell.querySelector('.g4-stone').innerHTML=owner?hwChar(g4_charOf(owner),'face'):'';
  cell.setAttribute('aria-label',value+', '+(owner?g4_who(owner)+'의 '+hwCharName(g4_charOf(owner)):'빈 '+g4_themeCfg().cellName));
  if(owner)cell.setAttribute('aria-disabled','true'); else cell.removeAttribute('aria-disabled');
}

/* ---------- 주사위와 식 ---------- */
function g4_dieMarkup(n){ return (G4_PIPS[n]||[]).map(p=>'<i class="p'+p+'"></i>').join(''); }
function g4_resetConsole(){
  g4.rolled=false; g4.dice=[0,0]; g4.wrong=0; g4.helpOpen=false; g4.rowHint=-1;
  clearTimeout(g4.helpTimer);
  ['g4Die1','g4Die2'].forEach(id=>{ const d=g4_el(id); if(d){ d.innerHTML=''; d.className='g4-die g4-wait'; } });
  const eq=g4_el('g4Equations'); if(eq){ eq.dataset.state='wait'; }
  const row=g4_el('g4DiceRow'); if(row)row.dataset.rolled='0';
  const sum=g4_el('g4SumEq'), diff=g4_el('g4DiffEq');
  if(sum)sum.innerHTML='<span>더하기</span><b>? + ? = ?</b>';
  if(diff)diff.innerHTML='<span>빼기</span><b>? − ? = ?</b>';
  const help=g4_el('g4HelpBtn'), pass=g4_el('g4PassBtn');
  if(help){help.disabled=true;help.dataset.on='0';}
  if(pass)pass.disabled=true;
  const dots=g4_el('g4Dots'); if(dots){dots.hidden=true;dots.innerHTML='';}
  g4_clearMarks();
}
function g4_sum(){ return g4.dice[0]+g4.dice[1]; }
function g4_diff(){ return Math.abs(g4.dice[0]-g4.dice[1]); }
function g4_big(){ return Math.max(g4.dice[0],g4.dice[1]); }
function g4_small(){ return Math.min(g4.dice[0],g4.dice[1]); }
function g4_available(value){ const out=[]; g4.values.forEach((v,i)=>{ if(g4.owners[i]===null&&v===value)out.push(i); }); return out; }
function g4_allAvailable(){ const set=new Set(g4_available(g4_sum()).concat(g4_available(g4_diff()))); return [...set]; }

function g4_rollPair(){
  const die=G4_LEVELS[g4.level].die, roll=()=>1+((Math.random()*die)|0);
  if(g4.passes>=2){
    const ok=[];
    for(let a=1;a<=die;a++)for(let b=1;b<=die;b++){ if(g4_available(a+b).length||g4_available(Math.abs(a-b)).length)ok.push([a,b]); }
    if(ok.length)return ok[(Math.random()*ok.length)|0];
  }
  return [roll(),roll()];
}

function g4_roll(){
  if(g4.locked||g4.rolled)return;
  if(g4.mode==='solo'&&g4.turn==='B')return;
  g4.turnHelp=false; g4.turnWrong=false;
  g4_doRoll();
  g4_setHint('두 식의 답을 구하고, 그 수가 적힌 빈 '+g4_themeCfg().cellName+'을 찾아 눌러요.');
  hwSay(g4.dice[0]+' 더하기 '+g4.dice[1]+', 그리고 '+g4_big()+' 빼기 '+g4_small()+'. 답이 적힌 칸을 찾아봐요.');
  g4.helpTimer=g4_later(()=>{ const h=g4_el('g4HelpBtn'); if(h&&g4.rolled)h.disabled=false; },9000);
  const pass=g4_el('g4PassBtn'); if(pass)pass.disabled=false;
  const roll=g4_el('g4RollBtn'); if(roll)roll.disabled=true;
}

function g4_doRoll(){
  const [a,b]=g4_rollPair();
  g4.dice=[a,b]; g4.rolled=true; g4.wrong=0; g4.helpOpen=false; g4.rowHint=-1;
  hwSfx('roll');
  ['g4Die1','g4Die2'].forEach((id,i)=>{
    const d=g4_el(id); if(!d)return;
    d.className='g4-die'; d.innerHTML=g4_dieMarkup(i?b:a); void d.offsetWidth; d.classList.add('rolling');
  });
  const dice=g4_el('g4Dice'); if(dice)dice.setAttribute('aria-label','주사위 '+hwJosa(String(a),'과/와')+' '+b);
  const eq=g4_el('g4Equations'); if(eq)eq.dataset.state='ask';
  const row=g4_el('g4DiceRow'); if(row)row.dataset.rolled='1';
  const sum=g4_el('g4SumEq'), diff=g4_el('g4DiffEq');
  if(sum)sum.innerHTML=`<span>더하기</span><b>${a} + ${b} = <em>?</em></b>`;
  if(diff)diff.innerHTML=`<span>빼기</span><b>${g4_big()} − ${g4_small()} = <em>?</em></b>`;
}

function g4_revealEquations(){
  const sum=g4_el('g4SumEq'), diff=g4_el('g4DiffEq');
  if(sum)sum.querySelector('em').textContent=g4_sum();
  if(diff)diff.querySelector('em').textContent=g4_diff();
  const eq=g4_el('g4Equations'); if(eq)eq.dataset.state='shown';
}

function g4_toggleHelp(){
  if(!g4.rolled)return;
  g4.helpOpen=!g4.helpOpen;
  if(g4.helpOpen&&g4.stat&&g4.mode==='solo'&&g4.turn==='A'&&!g4.turnHelp){ g4.stat.helpTurns++; g4.turnHelp=true; }
  const box=g4_el('g4Dots'), btn=g4_el('g4HelpBtn');
  if(btn)btn.dataset.on=g4.helpOpen?'1':'0';
  if(!box)return;
  if(!g4.helpOpen){box.hidden=true;return;}
  const a=g4.dice[0], b=g4.dice[1], big=g4_big(), small=g4_small();
  const dots=(n,cls)=>Array.from({length:n},()=>`<i class="${cls||''}"></i>`).join('');
  box.innerHTML=
    `<div class="g4-dotrow"><span>${a} + ${b}</span><span class="g4-dotset">${dots(a,'a')}<em>+</em>${dots(b,'b')}</span><small>점을 모두 세어요</small></div>`+
    `<div class="g4-dotrow"><span>${big} − ${small}</span><span class="g4-dotset">${dots(big-small)}${dots(small,'gone')}</span><small>지운 점을 빼고 세어요</small></div>`;
  box.hidden=false;
  hwSay('점을 하나씩 세어 봐요.');
}

/* ---------- 놓기 ---------- */
function g4_cellClick(idx){
  if(g4.locked)return;
  if(g4.mode==='solo'&&g4.turn==='B')return;
  if(g4.owners[idx]!==null){ g4_float('이미 친구가 있는 칸이에요'); return; }
  if(!g4.rolled){ g4_float('주사위를 먼저 굴려요'); hwSfx('tap'); return; }
  const value=g4.values[idx];
  if(value===g4_sum()||value===g4_diff()){ g4_place(idx,g4.turn); return; }
  g4.wrong++;
  if(g4.stat&&g4.mode==='solo'){ g4.stat.wrong++; g4.turnWrong=true; }
  hwSfx('oops');
  const cell=g4_el('g4Cell'+idx); if(cell){cell.classList.remove('nope');void cell.offsetWidth;cell.classList.add('nope');}
  g4_afterMiss('그 칸의 '+hwJosa(String(value),'은/는')+' 두 식의 답이 아니에요. 다시 계산해 봐요.');
}

function g4_afterMiss(message){
  g4_setHint(message);
  const help=g4_el('g4HelpBtn'); if(help)help.disabled=false;
  if(g4.wrong===2&&!g4.helpOpen){ g4_toggleHelp(); return; }
  if(g4.wrong===2)hwSay('점을 세어 봐요.');
  else if(g4.wrong>=4&&g4_allAvailable().length){
    const cells=g4_allAvailable(), row=Math.floor(cells[(Math.random()*cells.length)|0]/g4.size);
    g4.rowHint=row; g4_markRow(row);
    g4_setHint('반짝이는 줄 안에 답이 적힌 칸이 있어요.');
    hwSay('반짝이는 줄을 찾아봐요.');
  }else if(g4.wrong===1)hwSay('다시 계산해 봐요.');
}

function g4_claimPass(){
  if(g4.locked||!g4.rolled)return;
  if(g4.mode==='solo'&&g4.turn==='B')return;
  if(g4_allAvailable().length){
    g4.wrong++;
    if(g4.stat&&g4.mode==='solo'){ g4.stat.passWrong++; g4.turnWrong=true; }
    hwSfx('oops');
    g4_afterMiss('아직 놓을 수 있는 칸이 있어요. 두 답을 다시 찾아봐요.');
    return;
  }
  g4_pass(true);
}

function g4_pass(byPlayer){
  g4.locked=true; g4.passes++;
  g4_revealEquations(); g4_clearMarks();
  const msg=(g4_sum()===g4_diff()?'답 '+g4_sum():'답 '+hwJosa(String(g4_sum()),'과/와')+' '+g4_diff())+' 칸이 모두 찼어요. 이번 차례는 쉬어요.';
  g4_setHint(msg); g4_float('쉬어가요'); if(byPlayer)hwSay(msg);
  g4_later(g4_endTurn,1500);
}

function g4_place(idx,team){
  g4.locked=true; g4.passes=0;
  clearTimeout(g4.helpTimer);
  const value=g4.values[idx], usedSum=value===g4_sum();
  if(g4.stat&&g4.mode==='solo'&&team==='A'){ g4.stat.turns++; if(usedSum)g4.stat.sum++; else g4.stat.diff++; if(!g4.turnWrong&&!g4.turnHelp)g4.stat.clean++; }
  const eqText=usedSum?(g4.dice[0]+' + '+g4.dice[1]+' = '+value):(g4_big()+' − '+g4_small()+' = '+value);
  g4_revealEquations(); g4_clearMarks();
  const eq=g4_el(usedSum?'g4SumEq':'g4DiffEq'); if(eq)eq.classList.add('used');
  const prev=g4.last; g4.owners[idx]=team; g4.last=idx;
  if(prev>=0)g4_renderCell(prev);
  g4_renderCell(idx);
  hwSfx('place');
  const path=g4_findPath(team);
  const human=g4.mode==='duo'||team==='A';
  if(path){
    path.forEach(i=>{const c=g4_el('g4Cell'+i);if(c)c.classList.add('win');});
    g4_setHint(hwCharName(g4_charOf(team))+' 길이 끝까지 이어졌어요!');
    g4_later(()=>showWin(team,g4.mode,`<span class="g4-win-art">${hwChar(g4_charOf(team),'happy')}</span>`),900);
    return;
  }
  if(human){ g4_float(eqText+' 맞아요!'); g4_setHint(eqText+'! '+hwJosa(hwCharName(g4_charOf(team)),'을/를')+' 놓았어요.'); hwSay(eqText.replace('+','더하기').replace('−','빼기').replace('=','는')+'. 맞아요!'); }
  else { g4_setHint('컴퓨터는 '+eqText+' 칸에 놓았어요.'); }
  g4_later(g4_endTurn,human?1300:1500);
}

function g4_endTurn(){
  g4.turn=g4.turn==='A'?'B':'A';
  g4_resetConsole();
  g4_updateTurn();
  const computer=g4.mode==='solo'&&g4.turn==='B';
  g4.locked=computer;
  if(computer)g4_later(g4_aiTurn,700);
  else if(g4.mode==='duo')hwSay((g4.turn==='A'?'파랑':'빨강')+' 차례예요.');
}

function g4_updateTurn(){
  const isA=g4.turn==='A', thinking=g4.mode==='solo'&&!isA;
  const ta=g4_el('g4TeamA'), tb=g4_el('g4TeamB');
  if(ta)ta.dataset.turn=isA?'1':'0';
  if(tb){tb.dataset.turn=isA?'0':'1';tb.classList.toggle('thinking',thinking);}
  const roll=g4_el('g4RollBtn');
  if(roll){ roll.disabled=thinking; roll.innerHTML=hwIcon(thinking?'eye':'sparkles')+(thinking?' 컴퓨터 차례':' 주사위 굴리기'); }
  g4_setHint(thinking?'컴퓨터 차례예요. 두 식을 계산하고 있어요.':g4_who(g4.turn)+' 차례! 주사위를 굴려요.');
}

/* ---------- 컴퓨터 ---------- */
function g4_aiTurn(){
  if(g4.mode!=='solo'||g4.turn!=='B')return;
  g4_doRoll();
  g4_later(()=>{
    const cells=g4_allAvailable();
    if(!cells.length){ g4_pass(false); return; }
    const pick=g4_pickAI(cells);
    g4_place(pick,'B');
  },1100);
}
function g4_pickAI(cells){
  if(g4.level===1&&Math.random()<.9)return cells[(Math.random()*cells.length)|0];
  let best=cells[0], bestScore=-Infinity;
  cells.forEach(idx=>{
    const score=g4_candidateScore(idx,'B',g4.level)+Math.random()*(g4.level===3?1.5:6);
    if(score>bestScore){bestScore=score;best=idx;}
  });
  if(g4.level===2&&Math.random()<.65)return cells[(Math.random()*cells.length)|0];
  return best;
}
function g4_candidateScore(idx,team,level){
  const other=team==='A'?'B':'A', beforeOwn=g4_connectionCost(team), beforeOther=g4_connectionCost(other);
  g4.owners[idx]=other; const stopsWin=Boolean(g4_findPath(other));
  g4.owners[idx]=team; const wins=Boolean(g4_findPath(team)), afterOwn=g4_connectionCost(team), afterOther=g4_connectionCost(other);
  g4.owners[idx]=null;
  if(wins)return 100000;
  let score=(beforeOwn-afterOwn)*(level===3?22:13)+(afterOther-beforeOther)*(level===3?15:7);
  if(stopsWin)score+=level===3?5000:900;
  const r=Math.floor(idx/g4.size), c=idx%g4.size, mid=(g4.size-1)/2;
  return score-(Math.abs(r-mid)+Math.abs(c-mid))*.15;
}

/* ---------- 연결 판정 ---------- */
function g4_neighbors(idx){
  const size=g4.size, r=Math.floor(idx/size), c=idx%size;
  const steps=r%2===0?[[0,-1],[0,1],[-1,-1],[-1,0],[1,-1],[1,0]]:[[0,-1],[0,1],[-1,0],[-1,1],[1,0],[1,1]];
  const out=[];
  steps.forEach(([dr,dc])=>{ const nr=r+dr,nc=c+dc; if(nr>=0&&nr<size&&nc>=0&&nc<size)out.push(nr*size+nc); });
  return out;
}
function g4_startEdge(team){ const out=[]; for(let i=0;i<g4.size;i++)out.push(team==='A'?i*g4.size:i); return out; }
function g4_isTarget(idx,team){ return team==='A'?idx%g4.size===g4.size-1:Math.floor(idx/g4.size)===g4.size-1; }
function g4_findPath(team){
  const queue=[], prev=Array(g4.owners.length).fill(-1), seen=new Set();
  g4_startEdge(team).forEach(i=>{ if(g4.owners[i]===team){queue.push(i);seen.add(i);} });
  while(queue.length){
    const idx=queue.shift();
    if(g4_isTarget(idx,team)){ const path=[]; let cur=idx; while(cur!==-1){path.push(cur);cur=prev[cur];} return path.reverse(); }
    g4_neighbors(idx).forEach(n=>{ if(!seen.has(n)&&g4.owners[n]===team){seen.add(n);prev[n]=idx;queue.push(n);} });
  }
  return null;
}
function g4_connectionCost(team){
  const count=g4.owners.length, dist=Array(count).fill(Infinity), used=Array(count).fill(false), other=team==='A'?'B':'A';
  const cost=i=>g4.owners[i]===team?0:(g4.owners[i]===other?count+5:1);
  g4_startEdge(team).forEach(i=>{dist[i]=cost(i);});
  for(let s=0;s<count;s++){
    let cur=-1,best=Infinity;
    for(let i=0;i<count;i++)if(!used[i]&&dist[i]<best){best=dist[i];cur=i;}
    if(cur<0)break; used[cur]=true;
    g4_neighbors(cur).forEach(n=>{ const d=dist[cur]+cost(n); if(d<dist[n])dist[n]=d; });
  }
  let ans=Infinity; for(let i=0;i<count;i++)if(g4_isTarget(i,team))ans=Math.min(ans,dist[i]);
  return ans;
}

/* ---------- 표시 도우미 ---------- */
function g4_markRow(row){
  if(g4.stat&&g4.mode==='solo'&&g4.turn==='A'){ g4.stat.rowHints++; g4.turnHelp=true; }
  g4_clearMarks();
  for(let c=0;c<g4.size;c++){ const cell=g4_el('g4Cell'+(row*g4.size+c)); if(cell)cell.classList.add('row-hint'); }
}
function g4_clearMarks(){ document.querySelectorAll('#g4Grid .g4-cell.row-hint,#g4Grid .g4-cell.nope').forEach(c=>c.classList.remove('row-hint','nope')); ['g4SumEq','g4DiffEq'].forEach(id=>{const n=g4_el(id);if(n)n.classList.remove('used');}); }
function g4_setHint(text){ const h=g4_el('g4Hint'); if(h)h.textContent=text; }
function g4_float(text){ const f=g4_el('g4Float'); if(!f)return; f.textContent=text; f.classList.remove('show'); void f.offsetWidth; f.classList.add('show'); }
function g4_setTheme(theme,silent){
  if(!G4_THEMES[theme])return;
  lastCfg.g4={...(lastCfg.g4||{}),theme}; savePreferences();
  document.querySelectorAll('#g4ThemeSeg button').forEach(b=>{ const on=b.dataset.theme===theme; b.dataset.on=on?'1':'0'; b.setAttribute('aria-pressed',on?'true':'false'); });
  const art=g4_el('g4SetupEm'), t=G4_THEMES[theme];
  if(art){ art.innerHTML=hwChar(t.A,'full')+hwChar(t.B,'full'); if(!silent){ art.classList.remove('react'); void art.offsetWidth; art.classList.add('react'); } }
  if(!silent)hwSfx('tap');
}

function g4_sessionSummary(){ const s=g4.stat; if(!s)return null; return {level:g4.level,theme:g4.theme,turns:s.turns,clean:s.clean,helpTurns:s.helpTurns,rowHints:s.rowHints,wrong:s.wrong,passWrong:s.passWrong,sum:s.sum,diff:s.diff}; }

/* ---------- 공통 등록 ---------- */
(function g4_register(){
  LEVEL_INFO.g4={
    1:'5×5 판, 1–4 주사위로 합과 차를 구해요.',
    2:'6×6 판, 1–6 주사위로 더 큰 수를 계산해요.',
    3:'7×7 판에서 컴퓨터가 내 길을 적극적으로 막아요.'
  };
  RULES.g4={title:'숫자 징검다리',body:[
    ['1','주사위 두 개를 굴려요. 두 수를 <b>더한 답</b>과 큰 수에서 작은 수를 <b>뺀 답</b>을 스스로 구해요.'],
    ['2','두 답 중 하나가 적힌 <b>빈 칸</b>을 찾아 누르면 내 친구가 그 자리에 앉아요.'],
    ['i-route','파랑 친구는 <b>왼쪽 끝과 오른쪽 끝</b>, 빨강 친구는 <b>위쪽 끝과 아래쪽 끝</b>을 이어요.'],
    ['i-shield','내 길을 잇는 칸과 상대 길을 막는 칸 중 더 좋은 곳을 골라요.'],
    ['i-eye','답을 찾기 어려우면 <b>점 세기 도움</b>을 눌러요. 놓을 칸이 정말 없으면 <b>“놓을 칸이 없어요”</b>를 눌러요.'],
    ['i-star','내 친구들로 양쪽 끝을 <b>먼저 이으면</b> 승리!']
  ]};
  if(lastCfg.g4&&!lastCfg.g4.theme)lastCfg.g4.theme='pond';
  const theme=(lastCfg.g4&&lastCfg.g4.theme)||'pond', t=G4_THEMES[theme];
  const setup=g4_el('g4Setup');
  if(setup)setup.innerHTML=hwSetupMarkup({
    id:'g4',title:'숫자 징검다리',duo:true,
    art:hwChar(t.A,'full')+hwChar(t.B,'full'),
    desc:'주사위 두 수의 합과 차를 직접 구하고, 그 답이 적힌 칸에 친구를 놓아 끝과 끝을 먼저 이어요.',
    age:'6세+',players:'1–2명',time:'6–10분',
    points:[['swap','두 답 구하기','더한 답과 뺀 답을 모두 생각해요.'],['eye','숫자 칸 찾기','답이 적힌 칸을 스스로 찾아요.'],['route','길 잇기','내 친구들로 끝과 끝을 이어요.'],['shield','막기','상대 길이 이어지기 전에 막아요.']],
    extra:`<div class="choice-label"><span>어디에서 놀까요?</span><small>말판과 친구가 바뀌어요</small></div>
      <div class="seg three g4-theme-seg" id="g4ThemeSeg">${Object.keys(G4_THEMES).map(k=>`<button type="button" data-theme="${k}" data-on="${k===theme?'1':'0'}" aria-pressed="${k===theme?'true':'false'}" onclick="g4_setTheme('${k}')"><span class="g4-theme-art">${hwChar(G4_THEMES[k].A,'face')}${hwChar(G4_THEMES[k].B,'face')}</span><b>${G4_THEMES[k].name}</b></button>`).join('')}</div>`,
    levelQuestion:'얼마나 긴 징검다리를 놓을까요?',levelHint:'판 크기와 주사위가 달라져요',
    levels:[['쉬움','5×5 · 1–4'],['보통','6×6 · 1–6'],['어려움','7×7 · 1–6']]
  });
  const game=g4_el('g4Game');
  if(game)game.innerHTML=`
    <div class="pagebar"><button onclick="backHub()" aria-label="홈으로 돌아가기">${hwIcon('chevron-left')}</button><span id="g4Title">숫자 징검다리</span><button onclick="showRules('g4')" aria-label="게임 방법 보기">?</button></div>
    <div class="scorebar g4-scorebar">
      <div class="team blue" id="g4TeamA"><span class="team-avatar" id="g4ArtA" aria-hidden="true"></span><span><span class="name" id="g4NameA">나</span><small class="g4-direction" id="g4DirA"></small></span></div>
      <div class="team red" id="g4TeamB"><span class="team-avatar" id="g4ArtB" aria-hidden="true"></span><span><span class="name" id="g4NameB">컴퓨터</span><small class="g4-direction" id="g4DirB"></small></span></div>
    </div>
    <div class="board g4-board" id="g4Board">
      <span class="g4-edge a left" aria-hidden="true"><i id="g4HomeA1"></i></span><span class="g4-edge a right" aria-hidden="true"><i id="g4HomeA2"></i></span>
      <span class="g4-edge b top" aria-hidden="true"><i id="g4HomeB1"></i></span><span class="g4-edge b bottom" aria-hidden="true"><i id="g4HomeB2"></i></span>
      <div class="g4-grid" id="g4Grid" role="group" aria-label="숫자 징검다리 말판"></div>
      <div class="floatmsg" id="g4Float" aria-live="polite"></div>
    </div>
    <section class="g4-console" aria-label="주사위와 식">
      <div class="g4-dice-row" id="g4DiceRow" data-rolled="0">
        <div class="g4-dice" id="g4Dice" aria-label="아직 주사위를 굴리지 않았어요"><span class="g4-die g4-wait" id="g4Die1"></span><span class="g4-die g4-wait" id="g4Die2"></span></div>
        <button class="g4-roll" id="g4RollBtn" onclick="g4_roll()">주사위 굴리기</button>
        <div class="g4-equations" id="g4Equations" data-state="wait" aria-live="polite"><div class="g4-eq sum" id="g4SumEq"></div><div class="g4-eq diff" id="g4DiffEq"></div></div>
      </div>
      <div class="g4-dots" id="g4Dots" hidden></div>
      <div class="g4-tools">
        <button class="g4-tool" id="g4HelpBtn" data-on="0" disabled onclick="g4_toggleHelp()">${hwIcon('eye')} 점 세기 도움</button>
        <button class="g4-tool" id="g4PassBtn" disabled onclick="g4_claimPass()">놓을 칸이 없어요</button>
      </div>
      <button class="g4-hint say-line" id="g4Hint" aria-live="polite" onclick="hwSay(this.textContent,true)"></button>
    </section>
    `;
})();
