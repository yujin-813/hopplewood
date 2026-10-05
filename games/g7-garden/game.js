/*
 * 달팽이 정원길 — 호플우드 게임 7 (수 비교 게임)
 * 돌림판 두 개가 "기준 수"와 "보다 커요/보다 작아요"를 정하면, 앞쪽 돌 가운데 그 조건에 맞는 "가장 가까운" 돌을 스스로 찾아 이동한다.
 * 갈 돌은 반짝이지 않는다. 막히면 수직선 도움 → 찾을 구간만 반짝이기 순서로 돕는다.
 * 앞에 맞는 돌이 하나도 없으면 아이가 "앞에 맞는 돌이 없어요"를 눌러 꽃집으로 들어간다(먼저 들어가면 승리).
 * 어려움은 기준 수 두 개 중 하나를 골라 쓴다(더 멀리 가는 쪽을 따져 보는 선택).
 * 친구: 달팽이(파랑) · 거북이(빨강), 무대는 정원 돌길.
 * 의존 전역: showScreen, showWin, lastCfg, curGame, LEVEL_INFO, RULES, hwChar, hwCharName, hwSfx, hwSay, hwJosa, hwSetupMarkup, hwIcon, savePreferences
 */

const G7_LEVELS={
  1:{max:5,cols:5,rows:4,choose:false},
  2:{max:9,cols:6,rows:5,choose:false},
  3:{max:9,cols:6,rows:6,choose:true}
};
const G7_CAST={A:'snail',B:'turtle'};
const G7_REL={gt:{word:'보다 큰',say:'보다 큰 수',arrow:'→'},lt:{word:'보다 작은',say:'보다 작은 수',arrow:'←'}};

const g7={
  mode:'solo',level:1,turn:'A',locked:false,spun:false,
  stones:[],pos:{A:-1,B:-1},rel:'gt',nums:[],num:null,
  wrong:0,helpOpen:false,glow:null,runId:0,helpTimer:0
};

function g7_el(id){ return document.getElementById(id); }
function g7_later(callback,delay){ const runId=g7.runId; return setTimeout(()=>{ if(g7.runId===runId&&curGame==='g7')callback(); },delay); }
function g7_cancel(){ g7.runId++; g7.locked=true; clearTimeout(g7.helpTimer); }
function g7_cfg(){ return G7_LEVELS[g7.level]||G7_LEVELS[1]; }
function g7_who(team){ return g7.mode==='solo'?(team==='A'?'나':'컴퓨터'):(team==='A'?'파랑':'빨강'); }
function g7_home(){ return g7.stones.length; }
function g7_fits(v,rel,n){ return rel==='gt'?v>n:v<n; }
/* 지금 자리에서 앞쪽으로 조건에 맞는 가장 가까운 돌. 없으면 -1 */
function g7_nearest(from,rel,n){ for(let i=from+1;i<g7.stones.length;i++)if(g7_fits(g7.stones[i],rel,n))return i; return -1; }
function g7_target(team,rel,n){ const i=g7_nearest(g7.pos[team],rel,n); return i<0?g7_home():i; }

/* 0~max를 고르게 섞되 같은 수가 붙어 나오지 않게 한다. */
function g7_makeStones(){
  const {max,cols,rows}=g7_cfg(), total=cols*rows, out=[];
  let bag=[];
  while(out.length<total){
    if(!bag.length){ bag=[]; for(let v=0;v<=max;v++)bag.push(v); for(let i=bag.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [bag[i],bag[j]]=[bag[j],bag[i]]; } }
    let k=bag.findIndex(v=>v!==out[out.length-1]); if(k<0)k=0;
    out.push(bag.splice(k,1)[0]);
  }
  return out;
}

function g7_start(mode){
  g7_cancel();
  g7.runId++;
  curGame='g7';
  g7.mode=mode==='duo'?'duo':'solo';
  g7.level=(lastCfg.g7||{}).level||1;
  lastCfg.g7={mode:g7.mode,level:g7.level}; savePreferences();
  g7.turn='A'; g7.locked=false; g7.pos={A:-1,B:-1};
  g7.stones=g7_makeStones();
  g7.stat={turns:0,clean:0,wrong:0,farther:0,wrongSide:0,helpTurns:0,glowTurns:0,noneRight:0,noneWrong:0,chooseTurns:0,choseFar:0};
  const float=g7_el('g7Float'); if(float){ float.classList.remove('show'); float.textContent=''; }
  const dials=g7_el('g7Dials'); if(dials)dials.innerHTML=g7_dialMarkup();
  g7_renderPlayers();
  g7_buildBoard();
  g7_resetConsole();
  g7_updateTurn();
  showScreen('g7Game');
  hwSay('돌림판을 돌려서, 앞쪽 돌 가운데 맞는 수가 적힌 가장 가까운 돌로 가요. 꽃집에 먼저 들어가면 이겨요!');
  if(typeof hwCoach==='function')g7_later(()=>hwCoach('g7',[
    {el:'#g7SpinBtn',text:'돌림판 단추를 눌러 돌려 봐요!',tap:true,wait:1300},
    {el:'#g7Rule',text:'이번에 찾을 수예요. 기준 수보다 큰지 작은지 잘 봐요.'},
    {el:'#g7Board',text:'내 친구 앞쪽에서 맞는 수가 적힌 가장 가까운 돌을 찾아 눌러요!',tap:true}
  ]),400);
}

/* ---------- 말판 ---------- */
/* 돌 i의 칸 위치. 한 줄씩 방향을 바꾸는 구불구불한 길이고, 위에 출발, 아래에 꽃집이 있다. */
function g7_cell(i){
  const {cols,rows}=g7_cfg(), vrows=rows+2;
  if(i<0)return {x:.5/cols,y:.5/vrows};
  if(i>=cols*rows){ const lastRow=rows-1, c=lastRow%2===0?cols-1:0; return {x:(c+.5)/cols,y:(rows+1.5)/vrows}; }
  const r=Math.floor(i/cols), k=i%cols, c=r%2===0?k:cols-1-k;
  return {x:(c+.5)/cols,y:(r+1.5)/vrows};
}
function g7_buildBoard(){
  const grid=g7_el('g7Path'); if(!grid)return;
  const {cols,rows}=g7_cfg(), n=g7.stones.length;
  grid.style.aspectRatio=(cols/(rows+2)*1.18).toFixed(3);
  grid.style.setProperty('--g7c',cols);
  const pts=[]; for(let i=-1;i<=n;i++){ const p=g7_cell(i); pts.push((p.x*100).toFixed(2)+','+(p.y*100).toFixed(2)); }
  let html=`<svg class="g7-trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.join(' ')}"/></svg>`;
  const at=(p)=>`left:${(p.x*100).toFixed(2)}%;top:${(p.y*100).toFixed(2)}%`;
  for(let i=-1;i<n;i++){
    const p=g7_cell(i), q=g7_cell(i+1), deg=q.x>p.x+1e-6?0:(q.x<p.x-1e-6?180:90);
    html+=`<i class="g7-arrow" style="left:${((p.x+q.x)*50).toFixed(2)}%;top:${((p.y+q.y)*50).toFixed(2)}%;--r:${deg}deg"></i>`;
  }
  html+=`<span class="g7-start" style="${at(g7_cell(-1))}">출발</span>`;
  g7.stones.forEach((v,i)=>{ html+=`<button type="button" class="g7-stone" id="g7Stone${i}" style="${at(g7_cell(i))}" aria-label="${v}" onclick="g7_stoneClick(${i})"><b>${v}</b></button>`; });
  html+=`<button type="button" class="g7-home" id="g7Home" style="${at(g7_cell(n))}" aria-label="꽃집" onclick="g7_claimNone()"><img src="assets/art/board/garden_flower_house.png" alt="" draggable="false" decoding="async"></button>`;
  html+=`<span class="g7-piece A" id="g7PieceA">${hwChar(G7_CAST.A,'face')}</span><span class="g7-piece B" id="g7PieceB">${hwChar(G7_CAST.B,'face')}</span>`;
  grid.innerHTML=html;
  g7_placePieces();
}
function g7_placePieces(){
  ['A','B'].forEach(team=>{
    const el=g7_el('g7Piece'+team); if(!el)return;
    const p=g7_cell(g7.pos[team]), same=g7.pos.A===g7.pos.B;
    const dx=same?(team==='A'?-2.6:2.6):0, dy=same?(team==='A'?-1.4:1.4):0;
    el.style.left=(p.x*100+dx)+'%'; el.style.top=(p.y*100+dy)+'%';
    el.classList.toggle('now',team===g7.turn);
  });
  g7.stones.forEach((v,i)=>{ const s=g7_el('g7Stone'+i); if(s)s.classList.toggle('passed',i<=g7.pos[g7.turn]); });
}
function g7_renderPlayers(){
  ['A','B'].forEach(team=>{
    const art=g7_el('g7Art'+team); if(art)art.innerHTML=hwChar(G7_CAST[team],'face');
    const name=g7_el('g7Name'+team); if(name)name.textContent=g7_who(team);
    const tag=g7_el('g7Tag'+team); if(tag)tag.textContent=hwCharName(G7_CAST[team]);
  });
}
function g7_updateProgress(){
  ['A','B'].forEach(team=>{ const t=g7_el('g7Tag'+team); if(t)t.textContent=hwCharName(G7_CAST[team])+' · 꽃집까지 '+(g7_home()-g7.pos[team])+'칸'; });
}

/* ---------- 돌림판 ---------- */
function g7_dialMarkup(){
  const {max}=g7_cfg(), n=max+1;
  const labels=Array.from({length:n},(_,v)=>{ const a=(v+.5)/n*360; return `<i data-v="${v}" style="transform:rotate(${a}deg) translateY(calc(var(--d) * -.32)) rotate(${-a}deg)">${v}</i>`; }).join('');
  return `<div class="g7-dial num" id="g7NumDial" style="--n:${n}"><span class="g7-dial-face">${labels}</span><span class="g7-needle" id="g7NumNeedle"></span></div>
    <div class="g7-dial rel" id="g7RelDial"><span class="g7-dial-face"><i class="gt" data-v="gt">보다<br>큰</i><i class="lt" data-v="lt">보다<br>작은</i></span><span class="g7-needle" id="g7RelNeedle"></span></div>`;
}
function g7_spinNeedle(id,deg){
  const el=g7_el(id); if(!el)return;
  const prev=Number(el.dataset.deg||0), turns=prev-(prev%360)+720+deg;
  el.dataset.deg=String(turns); el.style.transform=`translate(-50%,-100%) rotate(${turns}deg)`;
}
/* 큰 수에서 "9보다 큰", 작은 수에서 "0보다 작은"처럼 답이 없는 조합은 나오지 않게 한다. */
function g7_pickNum(rel){ const {max}=g7_cfg(); return rel==='gt'?(Math.random()*max)|0:1+((Math.random()*max)|0); }

function g7_resetConsole(){
  g7.spun=false; g7.nums=[]; g7.num=null; g7.wrong=0; g7.helpOpen=false; g7.glow=null;
  g7.turnHelp=false; g7.turnWrong=false;
  clearTimeout(g7.helpTimer);
  const rule=g7_el('g7Rule'); if(rule){ rule.dataset.state='wait'; rule.innerHTML='<b>? 보다 ? 수</b>'; }
  const row=g7_el('g7SpinRow'); if(row)row.dataset.spun='0';
  const choose=g7_el('g7Choose'); if(choose){ choose.hidden=true; choose.innerHTML=''; }
  const help=g7_el('g7HelpBtn'), none=g7_el('g7NoneBtn');
  if(help){help.disabled=true;help.dataset.on='0';}
  if(none)none.disabled=true;
  const line=g7_el('g7Line'); if(line){line.hidden=true;line.innerHTML='';}
  g7_clearMarks();
}

function g7_spin(){
  if(g7.locked||g7.spun)return;
  if(g7.mode==='solo'&&g7.turn==='B')return;
  g7.locked=true;
  g7_doSpin(()=>{
    g7.locked=false;
    if(g7.nums.length>1){
      g7_setHint('기준 수 두 개가 나왔어요. 어느 수로 갈지 골라요.');
      hwSay('기준 수가 두 개 나왔어요. '+hwJosa(String(g7.nums[0]),'과/와')+' '+g7.nums[1]+' 중에서 골라요.');
    }else{
      g7_setHint(hwJosa(hwCharName(G7_CAST[g7.turn]),'이/가')+' 앞쪽에서 '+g7_ruleText()+'가 적힌 가장 가까운 돌을 찾아요.');
      hwSay(g7.num+G7_REL[g7.rel].say+'를 찾아요. 앞쪽에서 가장 가까운 돌을 눌러요.');
    }
    g7.helpTimer=g7_later(()=>{ const h=g7_el('g7HelpBtn'); if(h&&g7.spun&&g7.num!==null)h.disabled=false; },10000);
    const none=g7_el('g7NoneBtn'); if(none)none.disabled=false;
  });
}

function g7_doSpin(done){
  const cfg=g7_cfg();
  g7.rel=Math.random()<.5?'gt':'lt';
  g7.nums=[g7_pickNum(g7.rel)];
  if(cfg.choose){ let b=g7_pickNum(g7.rel), k=0; while(b===g7.nums[0]&&k++<20)b=g7_pickNum(g7.rel); g7.nums.push(b); }
  g7.num=cfg.choose?null:g7.nums[0];
  g7.spun=true; g7.wrong=0;
  hwSfx('roll');
  const n=cfg.max+1;
  document.querySelectorAll('#g7Dials i.hit').forEach(i=>i.classList.remove('hit'));
  g7_spinNeedle('g7NumNeedle',(g7.nums[0]+.5)/n*360);
  g7_spinNeedle('g7RelNeedle',g7.rel==='gt'?90:270);
  const row=g7_el('g7SpinRow'); if(row)row.dataset.spun='1';
  const rule=g7_el('g7Rule'); if(rule){ rule.dataset.state='spin'; rule.innerHTML='<b>빙글빙글…</b>'; }
  g7_later(()=>{
    const hitN=document.querySelector('#g7NumDial i[data-v="'+g7.nums[0]+'"]'), hitR=document.querySelector('#g7RelDial i[data-v="'+g7.rel+'"]');
    if(hitN&&g7.nums.length===1)hitN.classList.add('hit'); if(hitR)hitR.classList.add('hit');
    g7_renderRule(); if(g7.nums.length>1)g7_renderChoose(); done();
  },1100);
}
function g7_ruleText(){ return g7.num===null?'?':g7.num+G7_REL[g7.rel].word+' 수'; }
function g7_renderRule(){
  const rule=g7_el('g7Rule'); if(!rule)return;
  rule.dataset.state=g7.num===null?'choose':'ask';
  const rel=G7_REL[g7.rel];
  rule.innerHTML=`<span>이번에 찾을 수</span><b><em>${g7.num===null?'?':g7.num}</em>${rel.word} 수 <i>${rel.arrow}</i></b>`;
}
function g7_renderChoose(){
  const box=g7_el('g7Choose'); if(!box)return;
  const human=!(g7.mode==='solo'&&g7.turn==='B');
  if(g7.nums.length<2||!human){ box.hidden=true; return; }
  box.hidden=false;
  box.innerHTML='<span>어느 수로 갈까요?</span><div>'+g7.nums.map(v=>`<button type="button" data-on="${g7.num===v?'1':'0'}" aria-pressed="${g7.num===v?'true':'false'}" onclick="g7_choose(${v})"><b>${v}</b>${G7_REL[g7.rel].word} 수</button>`).join('')+'</div>';
}
function g7_choose(v){
  if(g7.locked||!g7.spun||!g7.nums.includes(v))return;
  if(g7.num!==v)g7.chooseCount=(g7.chooseCount||0)+1;
  g7.num=v; g7.wrong=0; g7.glow=null; g7_clearMarks(); hwSfx('tap');
  g7_renderRule(); g7_renderChoose();
  if(g7.helpOpen)g7_showLine();
  g7_setHint(g7_ruleText()+'가 적힌 가장 가까운 돌을 찾아요.');
  hwSay(v+G7_REL[g7.rel].say+'를 찾아요.');
}

/* ---------- 도움 ---------- */
function g7_toggleHelp(){
  if(!g7.spun)return;
  if(g7.num===null){ g7_float('기준 수를 먼저 골라요'); return; }
  g7.helpOpen=!g7.helpOpen;
  if(g7.helpOpen&&g7.mode==='solo'&&g7.turn==='A'&&!g7.turnHelp){ g7.stat.helpTurns++; g7.turnHelp=true; }
  const btn=g7_el('g7HelpBtn'); if(btn)btn.dataset.on=g7.helpOpen?'1':'0';
  if(!g7.helpOpen){ const l=g7_el('g7Line'); if(l)l.hidden=true; return; }
  g7_showLine();
  hwSay(g7.rel==='gt'?'수직선에서 '+g7.num+'의 오른쪽에 있는 수가 더 커요.':'수직선에서 '+g7.num+'의 왼쪽에 있는 수가 더 작아요.');
}
/* 0~max 수직선에 기준 수만 동그라미로 표시하고, 찾을 쪽 방향만 화살표로 알려 준다. 어느 돌인지는 말하지 않는다. */
function g7_showLine(){
  const box=g7_el('g7Line'); if(!box)return;
  const {max}=g7_cfg(), gt=g7.rel==='gt';
  const nums=Array.from({length:max+1},(_,v)=>`<i class="${v===g7.num?'ref':''}">${v}</i>`).join('');
  box.innerHTML=`<div class="g7-line-row" data-dir="${g7.rel}">${nums}</div><small>${gt?'오른쪽으로 갈수록 큰 수예요 →':'← 왼쪽으로 갈수록 작은 수예요'}</small>`;
  box.hidden=false;
}

/* ---------- 이동 ---------- */
function g7_stoneClick(i){
  if(g7.locked)return;
  if(g7.mode==='solo'&&g7.turn==='B')return;
  if(!g7.spun){ g7_float('돌림판을 먼저 돌려요'); hwSfx('tap'); return; }
  if(g7.num===null){ g7_float('기준 수를 먼저 골라요'); hwSfx('tap'); return; }
  const team=g7.turn, from=g7.pos[team], v=g7.stones[i], near=g7_nearest(from,g7.rel,g7.num);
  if(i===near){ g7_move(team,i); return; }
  let msg;
  if(i<=from){ msg='앞쪽으로 가요. 내 친구보다 뒤에 있는 돌이에요.'; }
  else if(!g7_fits(v,g7.rel,g7.num)){ msg=hwJosa(String(v),'은/는')+' '+g7.num+G7_REL[g7.rel].word+' 수가 아니에요. 다시 찾아봐요.'; if(g7.mode==='solo')g7.stat.wrongSide++; }
  else { msg=v+'도 맞는 수예요! 그런데 더 가까운 돌이 있어요.'; if(g7.mode==='solo')g7.stat.farther++; }
  g7_miss(msg,'g7Stone'+i);
}
function g7_miss(message,elId){
  g7.wrong++;
  if(g7.mode==='solo'){ g7.stat.wrong++; g7.turnWrong=true; }
  hwSfx('oops');
  const el=elId&&g7_el(elId); if(el){ el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); }
  g7_setHint(message);
  const help=g7_el('g7HelpBtn'); if(help)help.disabled=false;
  const team=g7.turn, near=g7_nearest(g7.pos[team],g7.rel,g7.num);
  if(g7.wrong===2&&!g7.helpOpen){ g7_toggleHelp(); return; }
  if(g7.wrong>=4&&!g7.glow){
    if(near>=0){
      /* 지금 자리 다음 돌부터 정답 돌 뒤 한두 칸까지만 반짝여, 그 안에서 고르게 한다. */
      const end=Math.min(g7.stones.length-1,near+1+((Math.random()*2)|0));
      g7.glow=[g7.pos[team]+1,end];
      for(let k=g7.glow[0];k<=end;k++){ const s=g7_el('g7Stone'+k); if(s)s.classList.add('glow'); }
      if(g7.mode==='solo'&&team==='A'){ g7.stat.glowTurns++; g7.turnHelp=true; }
      g7_setHint('반짝이는 돌 사이에 있어요. 앞에서부터 하나씩 확인해 봐요.');
      hwSay('반짝이는 돌 사이에 있어요. 앞에서부터 하나씩 확인해 봐요.');
    }else{
      g7_setHint('앞에 있는 돌을 하나씩 모두 확인해 봐요. 맞는 돌이 정말 있을까요?');
      hwSay('앞에 있는 돌을 하나씩 모두 확인해 봐요.');
    }
    return;
  }
  hwSay(message);
}
function g7_claimNone(){
  if(g7.locked)return;
  if(g7.mode==='solo'&&g7.turn==='B')return;
  if(!g7.spun){ g7_float('돌림판을 먼저 돌려요'); hwSfx('tap'); return; }
  if(g7.num===null){ g7_float('기준 수를 먼저 골라요'); hwSfx('tap'); return; }
  const team=g7.turn;
  if(g7_nearest(g7.pos[team],g7.rel,g7.num)>=0){
    if(g7.mode==='solo')g7.stat.noneWrong++;
    g7_miss('앞쪽에 맞는 돌이 아직 있어요. 하나씩 다시 살펴봐요.','g7NoneBtn');
    return;
  }
  if(g7.mode==='solo'&&team==='A'&&!g7.turnWrong)g7.stat.noneRight++;
  g7_move(team,g7_home());
}

function g7_move(team,to){
  g7.locked=true;
  clearTimeout(g7.helpTimer);
  const human=g7.mode==='duo'||team==='A', from=g7.pos[team];
  if(g7.mode==='solo'&&team==='A'){
    g7.stat.turns++;
    if(!g7.turnWrong&&!g7.turnHelp)g7.stat.clean++;
    if(g7.nums.length>1){
      g7.stat.chooseTurns++;
      const other=g7.nums.find(v=>v!==g7.num);
      if(g7_target(team,g7.rel,g7.num)>=g7_target(team,g7.rel,other))g7.stat.choseFar++;
    }
  }
  g7.pos[team]=to;
  g7_clearMarks();
  const line=g7_el('g7Line'); if(line)line.hidden=true;
  g7_placePieces(); g7_updateProgress();
  hwSfx('place');
  if(to>=g7_home()){
    g7_setHint(hwJosa(hwCharName(G7_CAST[team]),'이/가')+' 꽃집에 들어갔어요!');
    if(human)hwSay('앞에 '+g7_ruleText()+'가 없어요. 꽃집으로 쏙!');
    g7_later(()=>showWin(team,g7.mode,`<span class="g7-win-art">${hwChar(G7_CAST[team],'happy')}</span>`),1000);
    return;
  }
  const v=g7.stones[to], line2=hwJosa(String(v),'은/는')+' '+g7.num+G7_REL[g7.rel].word+' 수, 가장 가까운 돌이에요.';
  const stone=g7_el('g7Stone'+to); if(stone)stone.classList.add('landed');
  if(human){ g7_float((to-from)+'칸 쏙!'); g7_setHint(line2+' 맞아요!'); hwSay(v+'! 맞아요. '+(to-from)+'칸 갔어요.'); }
  else g7_setHint('컴퓨터는 '+g7_ruleText()+' '+v+' 돌로 갔어요. '+(to-from)+'칸 갔어요.');
  g7_later(g7_endTurn,human?1400:1600);
}

function g7_endTurn(){
  g7.turn=g7.turn==='A'?'B':'A';
  g7_resetConsole();
  g7_placePieces();
  g7_updateTurn();
  const computer=g7.mode==='solo'&&g7.turn==='B';
  g7.locked=computer;
  if(computer)g7_later(g7_aiTurn,700);
  else if(g7.mode==='duo')hwSay((g7.turn==='A'?'파랑':'빨강')+' 차례예요.');
}
function g7_updateTurn(){
  const isA=g7.turn==='A', thinking=g7.mode==='solo'&&!isA;
  const ta=g7_el('g7TeamA'), tb=g7_el('g7TeamB');
  if(ta)ta.dataset.turn=isA?'1':'0';
  if(tb){tb.dataset.turn=isA?'0':'1';tb.classList.toggle('thinking',thinking);}
  const spin=g7_el('g7SpinBtn');
  if(spin){ spin.disabled=thinking; spin.innerHTML=hwIcon(thinking?'eye':'sparkles')+(thinking?' 컴퓨터 차례':' 돌림판 돌리기'); }
  g7_updateProgress();
  g7_setHint(thinking?'컴퓨터 차례예요. 돌을 찾고 있어요.':g7_who(g7.turn)+' 차례! 돌림판을 돌려요.');
}

/* ---------- 컴퓨터 ---------- */
function g7_aiTurn(){
  if(g7.mode!=='solo'||g7.turn!=='B')return;
  g7_doSpin(()=>{
    if(g7.nums.length>1){
      /* 어려움: 대체로 더 멀리 가는 기준 수를 고른다. */
      const [a,b]=g7.nums, ta=g7_target('B',g7.rel,a), tb=g7_target('B',g7.rel,b);
      g7.num=Math.random()<.8?(ta>=tb?a:b):g7.nums[(Math.random()*2)|0];
      g7_renderRule();
    }
    g7_later(()=>g7_move('B',g7_target('B',g7.rel,g7.num)),900);
  });
}

/* ---------- 표시 도우미 ---------- */
function g7_clearMarks(){ document.querySelectorAll('#g7Path .glow,#g7Path .nope,#g7Path .landed').forEach(n=>n.classList.remove('glow','nope','landed')); }
function g7_setHint(text){ const h=g7_el('g7Hint'); if(h)h.textContent=text; }
function g7_float(text){ const f=g7_el('g7Float'); if(!f)return; f.textContent=text; f.classList.remove('show'); void f.offsetWidth; f.classList.add('show'); }

function g7_sessionSummary(){ const s=g7.stat; if(!s)return null; return {level:g7.level,...s}; }

/* ---------- 공통 등록 ---------- */
/* ---------- 등록 (게임 약속: games/registry.js) ---------- */
hwRegisterGame({
  id:'g7',order:7,
  title:'달팽이 정원길',age:'4세+',ages:['4-5','6-7'],players:'1–2명',time:'4–6분',category:'수·비교',hero:'더 큰 수, 더 작은 수<br>가장 가까운 돌은?',description:'달팽이와 거북이가 기준 수보다 큰 수·작은 수가 적힌 가장 가까운 돌을 찾아 꽃집까지 가요.',card:'큰 수·작은 수 돌을 찾아 앞으로 가요.',coverClass:'cover-garden',cast:['snail','turtle'],icon:'route',
  music:'route',questIcon:'route',
  defaults:{mode:'solo',level:1},
  cover(){ return `<span class="cover-row" aria-hidden="true"><i>2</i><i>7</i><i>5</i><i>0</i></span><span class="cover-side">${hwChar('turtle','full')}</span><span class="cover-main">${hwChar('snail','full')}</span>`; },
  levels:{
    1:'0–5 숫자 돌 20개. 기준 수보다 큰 수·작은 수를 찾아요.',
    2:'0–9 숫자 돌 30개로 길이 길어져요.',
    3:'기준 수가 두 개 나와요. 어느 수로 가야 더 멀리 갈지 골라요.'
  },
  rules:{title:'달팽이 정원길',body:[
    ['1','돌림판 두 개를 돌려요. <b>기준 수</b>와 <b>“보다 큰 수 / 보다 작은 수”</b>가 정해져요.'],
    ['2','내 친구 <b>앞쪽</b> 돌 가운데 그 조건에 맞는 <b>가장 가까운 돌</b>을 찾아 눌러요.'],
    ['i-eye','어렵다면 <b>수직선 도움</b>을 눌러요. 큰 수는 오른쪽, 작은 수는 왼쪽에 있어요.'],
    ['i-route','앞쪽에 맞는 돌이 하나도 없으면 <b>“앞에 맞는 돌이 없어요”</b>를 눌러 꽃집으로 들어가요.'],
    ['i-star','<b>꽃집에 먼저</b> 들어가면 승리!']
  ]},
  guide:{art:'snail',
     line:'기준 수보다 큰 수·작은 수를 가려내고, 앞에서부터 차례로 살펴 가장 가까운 돌을 찾는 수 비교 게임이에요.',
     areas:{obs:2,num:2,plan:1,self:1},
     steps:[['swap','크기 견주기','돌의 수가 기준 수보다 큰지 작은지 따져요.'],['eye','차례로 살피기','내 친구 바로 앞 돌부터 하나씩 확인해요.'],['target','기준 수 고르기','어려움에서는 더 멀리 가는 수를 골라요.']],
     levels:[['쉬움','0–5 숫자 돌 20개'],['보통','0–9 숫자 돌 30개'],['어려움','기준 수 두 개 중 고르기']],
     signs:['맞는 수를 찾으면 바로 누르기보다 더 가까운 돌이 없는지 한 번 더 봐요.','“큰 수”와 “작은 수”를 헷갈리는 일이 줄어요.','앞에 맞는 돌이 없을 때를 스스로 알아채요.'],
     talk:'장보기나 달력에서 “5보다 큰 수는 어디 있을까?” 하고 수 두 개를 견주는 질문을 해 보세요.'},
  insight(list,h){ const {add,ratio}=h;
      const turns=add(list,'turns'), clean=add(list,'clean'), side=add(list,'wrongSide'), far=add(list,'farther');
      const choose=add(list,'chooseTurns'), choseFar=add(list,'choseFar'), noneRight=add(list,'noneRight'), noneWrong=add(list,'noneWrong');
      const lines=[`직접 간 차례 <b>${turns}번 중 ${clean}번</b>은 틀리거나 도움 없이 바로 찾았어요.`];
      if(side||far)lines.push(`조건에 안 맞는 돌을 고른 건 <b>${side}번</b>, 맞지만 더 먼 돌을 고른 건 <b>${far}번</b>이에요.`);
      if(choose)lines.push(`기준 수 두 개 중 <b>${choose}번 중 ${choseFar}번</b>은 더 멀리 가는 수를 골랐어요.`);
      if(noneRight||noneWrong)lines.push(`“앞에 맞는 돌이 없어요”를 맞게 누른 건 <b>${noneRight}번</b>, 돌이 남아 있는데 누른 건 <b>${noneWrong}번</b>이에요.`);
      return {lines,metric:l=>ratio(add(l,'clean'),add(l,'turns')),metricName:'바로 찾은 비율',
        tip:far>side?'“바로 앞 돌부터 하나씩 볼까?” 하고 차례로 살피는 순서를 같이 짚어 보세요.':(side?'수직선이나 손가락으로 “5보다 큰 수는 이쪽” 하고 방향을 같이 짚어 보세요.':'“어느 기준 수가 더 멀리 갈까?” 하고 두 수를 비교하게 해 보세요.')};
    },
  mount(){
      const setup=g7_el('g7Setup');
  if(setup)setup.innerHTML=hwSetupMarkup({
    id:'g7',title:'달팽이 정원길',duo:true,
    art:hwChar(G7_CAST.A,'full')+hwChar(G7_CAST.B,'full'),
    desc:'기준 수보다 큰 수·작은 수가 적힌 가장 가까운 돌을 찾아, 달팽이와 거북이가 꽃집까지 가요.',
    age:'4세+',players:'1–2명',time:'4–6분',
    points:[['swap','크다·작다','두 수의 크기를 견주어요.'],['eye','가장 가까운 돌','앞에서부터 차례로 살펴요.'],['route','없을 땐 꽃집','남은 돌을 모두 확인해요.'],['target','기준 수 고르기','어느 수가 더 멀리 가는지 따져요.']],
    levelQuestion:'정원길이 얼마나 길까요?',levelHint:'숫자 범위와 길이가 달라져요',
    levels:[['쉬움','0–5 · 20개'],['보통','0–9 · 30개'],['어려움','기준 수 고르기']]
  });
  const game=g7_el('g7Game');
  if(game)game.innerHTML=`
    <div class="pagebar"><button onclick="backHub()" aria-label="홈으로 돌아가기">${hwIcon('chevron-left')}</button><span>달팽이 정원길</span><button onclick="showRules('g7')" aria-label="게임 방법 보기">?</button></div>
    <div class="scorebar g7-scorebar">
      <div class="team blue" id="g7TeamA"><span class="team-avatar" id="g7ArtA" aria-hidden="true"></span><span><span class="name" id="g7NameA">나</span><small class="g7-tag" id="g7TagA"></small></span></div>
      <div class="team red" id="g7TeamB"><span class="team-avatar" id="g7ArtB" aria-hidden="true"></span><span><span class="name" id="g7NameB">컴퓨터</span><small class="g7-tag" id="g7TagB"></small></span></div>
    </div>
    <div class="board g7-board" id="g7Board">
      <div class="g7-path" id="g7Path" role="group" aria-label="정원 돌길"></div>
      <div class="floatmsg" id="g7Float" aria-live="polite"></div>
    </div>
    <section class="g7-console" aria-label="돌림판">
      <div class="g7-dials" id="g7Dials" aria-hidden="true">${g7_dialMarkup()}</div>
      <div class="g7-spin-row" id="g7SpinRow" data-spun="0">
        <button class="g7-spin" id="g7SpinBtn" onclick="g7_spin()">돌림판 돌리기</button>
        <div class="g7-rule" id="g7Rule" data-state="wait" aria-live="polite"></div>
      </div>
      <div class="g7-choose" id="g7Choose" hidden></div>
      <div class="g7-line" id="g7Line" hidden></div>
      <div class="g7-tools">
        <button class="g7-tool" id="g7HelpBtn" data-on="0" disabled onclick="g7_toggleHelp()">${hwIcon('eye')} 수직선 도움</button>
        <button class="g7-tool" id="g7NoneBtn" disabled onclick="g7_claimNone()">앞에 맞는 돌이 없어요</button>
      </div>
      <button class="g7-hint say-line" id="g7Hint" aria-live="polite" onclick="hwSay(this.textContent,true)"></button>
    </section>
    `;
  },
  /* 아이 기록 화면: 최고 기록(과거의 나와 비교)과 기록 배지 */
  record:{key:'clean',label:'바로 찾은 돌',unit:'개',goal:8,badge:'돌길 탐험가'},
  start:g7_start,cancel:g7_cancel,summary:g7_sessionSummary
});
