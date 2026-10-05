/*
 * 조개 모으기 — 호플우드 게임 6 (수·대응 게임)
 * 1–3 주사위를 굴려 나온 수를 "스스로" 더하고, 점 개수가 같은 조개를 골라 내 바구니를 채운다.
 * 합은 미리 보여주지 않는다. 막히면 점 세기 도움 → 조개 두 개로 좁히기 순서로만 돕는다.
 * 별 면(빈 면)이 나오면 아이가 1·2·3 중 하나를 골라 넣는다 — 아직 없는 조개를 만들 수를 고르는 전략.
 * 친구: 수달(파랑) · 가재(빨강), 무대는 개울가 모래밭.
 * 의존 전역: showScreen, showWin, lastCfg, curGame, LEVEL_INFO, RULES, hwChar, hwCharName, hwSfx, hwSay, hwJosa, hwSetupMarkup, hwIcon, savePreferences
 */

const G6_LEVELS={
  1:{dice:2,blank:false,numerals:false},
  2:{dice:3,blank:true,numerals:false},
  3:{dice:3,blank:true,numerals:true}
};
const G6_CAST={A:'otter',B:'crayfish'};
/* 1–9까지 점 배치(3×3 칸 번호). 주사위와 같은 모양이라 한눈에 세기 쉽다. */
const G6_PIPS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9],7:[1,3,4,5,6,7,9],8:[1,2,3,4,6,7,8,9],9:[1,2,3,4,5,6,7,8,9]};

const g6={
  mode:'solo',level:1,turn:'A',locked:false,rolled:false,
  dice:[],hand:{A:[],B:[]},basket:{A:[],B:[]},passes:{A:0,B:0},
  wrong:0,helpOpen:false,glow:[],runId:0,helpTimer:0
};

function g6_el(id){ return document.getElementById(id); }
function g6_later(callback,delay){ const runId=g6.runId; return setTimeout(()=>{ if(g6.runId===runId&&curGame==='g6')callback(); },delay); }
function g6_cancel(){ g6.runId++; g6.locked=true; clearTimeout(g6.helpTimer); }
function g6_cfg(){ return G6_LEVELS[g6.level]||G6_LEVELS[1]; }
function g6_who(team){ return g6.mode==='solo'?(team==='A'?'나':'컴퓨터'):(team==='A'?'파랑':'빨강'); }
function g6_shuffle(list){ const a=list.slice(); for(let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }
/* 가능한 합: 주사위 수 × 1 ~ 주사위 수 × 3 */
function g6_sums(){ const n=g6_cfg().dice, out=[]; for(let s=n;s<=n*3;s++)out.push(s); return out; }

function g6_start(mode){
  g6_cancel();
  g6.runId++;
  curGame='g6';
  g6.mode=mode==='duo'?'duo':'solo';
  const cfg=lastCfg.g6||{};
  g6.level=cfg.level||1;
  lastCfg.g6={mode:g6.mode,level:g6.level}; savePreferences();
  g6.turn='A'; g6.locked=false;
  g6.hand={A:g6_shuffle(g6_sums()),B:g6_shuffle(g6_sums())};
  g6.basket={A:[],B:[]}; g6.passes={A:0,B:0}; g6.last=null;
  g6.stat={turns:0,clean:0,wrong:0,helpTurns:0,glowTurns:0,passRight:0,passWrong:0,blankTurns:0,blankSmart:0};
  const float=g6_el('g6Float'); if(float){ float.classList.remove('show'); float.textContent=''; }
  g6_renderShell();
  g6_resetConsole();
  g6_renderAll();
  g6_updateTurn();
  showScreen('g6Game');
  hwSay('주사위 수를 모두 더해서, 점 개수가 같은 조개를 바구니에 담아요. 바구니를 먼저 채우면 이겨요!');
  if(typeof hwCoach==='function')g6_later(()=>hwCoach('g6',[
    {el:'#g6RollBtn',text:'주사위 단추를 눌러 굴려 봐요!',tap:true,wait:900},
    {el:'#g6Equation',text:'주사위 점을 모두 더하면 몇 개일까요? 스스로 세어 봐요.'},
    {el:'#g6Hand',text:'점 개수가 같은 조개를 찾아 눌러요. 바구니에 쏙 들어가요!',tap:true}
  ]),400);
}

/* ---------- 그리기 ---------- */
function g6_pipMarkup(n,cls){ return (G6_PIPS[n]||[]).map(p=>'<i class="p'+p+(cls?' '+cls:'')+'"></i>').join(''); }
function g6_shellSVG(team){
  return `<img class="g6-shell-art" src="assets/art/board/shell_card_${team==='B'?'lilac':'coral'}.png" alt="" draggable="false" decoding="async">`;
}
function g6_shellCard(team,value,opts={}){
  const face=opts.numeral?`<b class="g6-shell-num">${value}</b>`:`<span class="g6-pips">${g6_pipMarkup(value)}</span>`;
  return `${g6_shellSVG(team)}${face}`;
}

function g6_renderShell(){
  ['A','B'].forEach(team=>{
    const art=g6_el('g6Art'+team); if(art)art.innerHTML=hwChar(G6_CAST[team],'face');
    const name=g6_el('g6Name'+team); if(name)name.textContent=g6_who(team);
    const tag=g6_el('g6Tag'+team); if(tag)tag.textContent=hwCharName(G6_CAST[team])+'의 바구니';
  });
}

function g6_renderAll(){ g6_renderBasket('A'); g6_renderBasket('B'); g6_renderHand(); g6_renderCounts(); }

function g6_renderBasket(team){
  const box=g6_el('g6Basket'+team); if(!box)return;
  box.style.setProperty('--g6n',g6_sums().length);
  box.innerHTML=g6_sums().map(v=>{
    const has=g6.basket[team].includes(v), last=g6.last&&g6.last.team===team&&g6.last.value===v;
    return `<span class="g6-slot${has?' on':''}${last?' last':''}" aria-label="${v}${has?', 조개 있음':', 빈 자리'}">${has?`<span class="g6-mini">${g6_shellCard(team,v)}</span>`:''}<b>${v}</b></span>`;
  }).join('');
}

function g6_renderHand(){
  const box=g6_el('g6Hand'); if(!box)return;
  const team=g6.turn, list=g6.hand[team];
  box.dataset.team=team;
  const label=g6_el('g6HandLabel');
  if(label)label.textContent=(g6.mode==='solo'&&team==='B')?'컴퓨터의 조개':(g6.mode==='solo'?'내 조개':g6_who(team)+'의 조개')+' · 점을 세어 골라요';
  box.innerHTML=list.map(v=>`<button type="button" class="g6-shell${g6.glow.includes(v)?' glow':''}" data-v="${v}" aria-label="점 ${v}개 조개" onclick="g6_pick(${v})">${g6_shellCard(team,v)}</button>`).join('')||'<p class="g6-empty">조개를 모두 담았어요!</p>';
}

function g6_renderCounts(){
  const total=g6_sums().length;
  ['A','B'].forEach(team=>{ const c=g6_el('g6Count'+team); if(c)c.textContent=g6.basket[team].length+' / '+total; });
}

/* ---------- 주사위와 식 ---------- */
function g6_faces(i){
  const cfg=g6_cfg();
  /* 별 면은 마지막 주사위에만 있다(1·2·3·1·2·별). */
  return cfg.blank&&i===cfg.dice-1?[1,2,3,1,2,0]:[1,2,3,1,2,3];
}
function g6_rollOnce(){ const n=g6_cfg().dice, out=[]; for(let i=0;i<n;i++){ const f=g6_faces(i); out.push(f[(Math.random()*f.length)|0]); } return out; }
/* 별 면에 넣을 수 있는 값까지 따져, 이 주사위로 만들 수 있는 합 목록 */
function g6_possibleSums(faces){
  const fixed=faces.filter(f=>f>0).reduce((s,f)=>s+f,0), blanks=faces.filter(f=>f===0).length;
  if(!blanks)return [fixed];
  const out=[]; for(let v=1;v<=3;v++)out.push(fixed+v); return out;
}
function g6_playable(team,faces){ return g6_possibleSums(faces).some(s=>g6.hand[team].includes(s)); }
/* 한 번 쉬었거나 조개가 두 개 이하로 남으면 보이지 않게 넣을 수 있는 굴림을 골라 준다(끝에서 오래 막히지 않게). */
function g6_rollFor(team){
  const help=g6.passes[team]>=1||(g6.hand[team].length<=2&&Math.random()<.5);
  let faces=g6_rollOnce();
  for(let i=0;help&&i<60&&!g6_playable(team,faces);i++)faces=g6_rollOnce();
  return faces;
}
function g6_sum(){ return g6.dice.reduce((s,d)=>s+(d.face||d.val||0),0); }
function g6_blankIdx(){ return g6.dice.findIndex(d=>d.face===0); }
function g6_ready(){ return g6.dice.every(d=>d.face>0||d.val>0); }

function g6_dieMarkup(d){
  const cfg=g6_cfg();
  if(d.face===0){
    if(!d.val)return '<span class="g6-star" aria-hidden="true">★</span>';
    return cfg.numerals?`<b class="g6-die-num">${d.val}</b>`:g6_pipMarkup(d.val,'star');
  }
  return cfg.numerals?`<b class="g6-die-num">${d.face}</b>`:g6_pipMarkup(d.face);
}
function g6_renderDice(animate){
  const box=g6_el('g6Dice'); if(!box)return;
  box.innerHTML=g6.dice.map((d,i)=>`<span class="g6-die${d.face===0?' blank':''}${animate?' rolling':''}" id="g6Die${i}">${g6_dieMarkup(d)}</span>`).join('');
  box.setAttribute('aria-label','주사위 '+g6.dice.map(d=>d.face===0?(d.val?'별 '+d.val:'별'):d.face).join(', '));
}
function g6_renderEquation(reveal){
  const eq=g6_el('g6Equation'); if(!eq)return;
  if(!g6.rolled){ eq.dataset.state='wait'; eq.innerHTML='<span>모두 더하면?</span><b>'+g6.dice.map(()=>'?').join(' + ')+' = ?</b>'; return; }
  const parts=g6.dice.map(d=>d.face===0?(d.val?`<i class="star">${d.val}</i>`:'<i class="star">★</i>'):String(d.face));
  eq.dataset.state=reveal?'shown':'ask';
  eq.innerHTML='<span>모두 더하면?</span><b>'+parts.join(' + ')+' = <em>'+(reveal?g6_sum():'?')+'</em></b>';
}
function g6_renderBlankPicker(){
  const box=g6_el('g6Blank'); if(!box)return;
  const bi=g6_blankIdx(), human=!(g6.mode==='solo'&&g6.turn==='B');
  if(!g6.rolled||bi<0||!human){ box.hidden=true; box.innerHTML=''; return; }
  const cur=g6.dice[bi].val;
  box.hidden=false;
  box.innerHTML='<span>별이 나왔어요! 넣고 싶은 수를 골라요</span><div>'+[1,2,3].map(v=>`<button type="button" data-on="${cur===v?'1':'0'}" aria-pressed="${cur===v?'true':'false'}" onclick="g6_setBlank(${v})"><span class="g6-pips small">${g6_pipMarkup(v)}</span><b>${v}</b></button>`).join('')+'</div>';
}

function g6_resetConsole(){
  g6.rolled=false; g6.dice=Array.from({length:g6_cfg().dice},()=>({face:1,val:0})); g6.wrong=0; g6.helpOpen=false; g6.glow=[];
  g6.turnHelp=false; g6.turnWrong=false; g6.blankPicks=0;
  clearTimeout(g6.helpTimer);
  const box=g6_el('g6Dice'); if(box)box.innerHTML=g6.dice.map(()=>'<span class="g6-die wait"></span>').join('');
  const row=g6_el('g6DiceRow'); if(row)row.dataset.rolled='0';
  g6_renderEquation(false); g6_renderBlankPicker();
  const help=g6_el('g6HelpBtn'), pass=g6_el('g6PassBtn');
  if(help){help.disabled=true;help.dataset.on='0';}
  if(pass)pass.disabled=true;
  const dots=g6_el('g6Dots'); if(dots){dots.hidden=true;dots.innerHTML='';}
}

function g6_roll(){
  if(g6.locked||g6.rolled)return;
  if(g6.mode==='solo'&&g6.turn==='B')return;
  g6_doRoll();
  const bi=g6_blankIdx();
  if(bi>=0){
    g6_setHint('별 면이 나왔어요! 1, 2, 3 중에서 넣을 수를 골라요.');
    hwSay('별이 나왔어요! 일, 이, 삼 중에서 넣고 싶은 수를 골라요.');
  }else{
    g6_setHint('주사위 점을 모두 더하고, 점 개수가 같은 조개를 눌러요.');
    hwSay(g6.dice.map(d=>d.face).join(' 더하기 ')+'. 모두 몇 개일까요?');
  }
  g6.helpTimer=g6_later(()=>{ const h=g6_el('g6HelpBtn'); if(h&&g6.rolled)h.disabled=false; },9000);
  const pass=g6_el('g6PassBtn'); if(pass)pass.disabled=false;
}

function g6_doRoll(){
  const faces=g6_rollFor(g6.turn);
  g6.dice=faces.map(f=>({face:f,val:0})); g6.rolled=true; g6.wrong=0; g6.helpOpen=false; g6.glow=[];
  hwSfx('roll');
  g6_renderDice(true);
  const row=g6_el('g6DiceRow'); if(row)row.dataset.rolled='1';
  g6_renderEquation(false); g6_renderBlankPicker();
  g6_renderHand();
}

function g6_setBlank(v){
  if(g6.locked||!g6.rolled)return;
  const bi=g6_blankIdx(); if(bi<0)return;
  if(g6.dice[bi].val!==v)g6.blankPicks++;
  g6.dice[bi].val=v; hwSfx('tap');
  g6_renderDice(false); g6_renderEquation(false); g6_renderBlankPicker();
  if(g6.helpOpen)g6_showDots();
  g6_setHint('별에 '+hwJosa(String(v),'을/를')+' 넣었어요. 모두 더해서 점 개수가 같은 조개를 찾아요.');
  hwSay(g6.dice.map(d=>d.face||d.val).join(' 더하기 ')+'. 모두 몇 개일까요?');
}

function g6_toggleHelp(){
  if(!g6.rolled)return;
  if(!g6_ready()){ g6_float('별에 넣을 수를 먼저 골라요'); return; }
  g6.helpOpen=!g6.helpOpen;
  if(g6.helpOpen&&g6.mode==='solo'&&g6.turn==='A'&&!g6.turnHelp){ g6.stat.helpTurns++; g6.turnHelp=true; }
  const btn=g6_el('g6HelpBtn'); if(btn)btn.dataset.on=g6.helpOpen?'1':'0';
  if(!g6.helpOpen){ const box=g6_el('g6Dots'); if(box)box.hidden=true; return; }
  g6_showDots();
  hwSay('점을 하나씩 짚으며 세어 봐요.');
}
/* 주사위마다 다른 색 점을 한 줄로 늘어놓는다. 개수(답)는 적지 않는다. */
function g6_showDots(){
  const box=g6_el('g6Dots'); if(!box)return;
  const cls=['a','b','c'];
  box.innerHTML='<div class="g6-dotset">'+g6.dice.map((d,i)=>Array.from({length:d.face||d.val},()=>`<i class="${cls[i]}${d.face===0?' star':''}"></i>`).join('')).join('<em>+</em>')+'</div><small>점을 하나씩 짚으며 모두 세어요</small>';
  box.hidden=false;
}

/* ---------- 조개 고르기 ---------- */
function g6_pick(value){
  if(g6.locked)return;
  if(g6.mode==='solo'&&g6.turn==='B')return;
  if(!g6.rolled){ g6_float('주사위를 먼저 굴려요'); hwSfx('tap'); return; }
  if(!g6_ready()){ g6_float('별에 넣을 수를 먼저 골라요'); hwSfx('tap'); const b=g6_el('g6Blank'); if(b){b.classList.remove('nudge');void b.offsetWidth;b.classList.add('nudge');} return; }
  if(value===g6_sum()){ g6_place(g6.turn,value); return; }
  g6.wrong++;
  if(g6.mode==='solo'){ g6.stat.wrong++; g6.turnWrong=true; }
  hwSfx('oops');
  const btn=document.querySelector('#g6Hand .g6-shell[data-v="'+value+'"]'); if(btn){btn.classList.remove('nope');void btn.offsetWidth;btn.classList.add('nope');}
  g6_afterMiss('그 조개는 점 개수가 달라요. 주사위 점을 다시 세어 봐요.');
}

function g6_afterMiss(message){
  g6_setHint(message);
  const help=g6_el('g6HelpBtn'); if(help)help.disabled=false;
  const sum=g6_sum(), inHand=g6.hand[g6.turn].includes(sum);
  if(g6.wrong===2&&!g6.helpOpen){ g6_toggleHelp(); return; }
  if(g6.wrong>=4&&inHand&&!g6.glow.length){
    /* 정답 조개와 가까운 수의 조개 하나를 같이 반짝여 둘 중에서 고르게 한다. */
    const others=g6.hand[g6.turn].filter(v=>v!==sum).sort((a,b)=>Math.abs(a-sum)-Math.abs(b-sum));
    g6.glow=g6_shuffle([sum].concat(others.slice(0,1)));
    if(g6.mode==='solo'&&g6.turn==='A'){ g6.stat.glowTurns++; g6.turnHelp=true; }
    g6_renderHand();
    g6_setHint('반짝이는 조개 중 하나예요. 점을 세어 비교해 봐요.');
    hwSay('반짝이는 조개 중 하나예요.');
    return;
  }
  if(g6.wrong>=4&&!inHand){
    g6_setHint('바구니를 살펴봐요. 그 수의 조개가 벌써 들어 있을지도 몰라요.');
    hwSay('바구니를 살펴봐요.');
    return;
  }
  if(g6.wrong===1)hwSay('다시 세어 봐요.');
}

function g6_claimPass(){
  if(g6.locked||!g6.rolled)return;
  if(g6.mode==='solo'&&g6.turn==='B')return;
  const team=g6.turn, bi=g6_blankIdx();
  if(bi>=0&&!g6.dice[bi].val&&g6_playable(team,g6.dice.map(d=>d.face))){
    g6_float('별에 넣을 수를 먼저 골라요'); hwSfx('tap'); return;
  }
  if(g6_ready()&&g6.hand[team].includes(g6_sum())){
    g6.wrong++;
    if(g6.mode==='solo'){ g6.stat.passWrong++; g6.turnWrong=true; }
    hwSfx('oops');
    g6_afterMiss('아직 담을 수 있는 조개가 있어요. 점을 다시 세어 봐요.');
    return;
  }
  if(bi>=0&&g6_playable(team,g6.dice.map(d=>d.face))){
    g6.wrong++;
    if(g6.mode==='solo'){ g6.stat.passWrong++; g6.turnWrong=true; }
    hwSfx('oops');
    g6_setHint('별에 다른 수를 넣어 볼까요? 그러면 담을 조개가 생길지도 몰라요.');
    hwSay('별에 다른 수를 넣어 볼까요?');
    const help=g6_el('g6HelpBtn'); if(help)help.disabled=false;
    return;
  }
  if(g6.mode==='solo'&&team==='A'&&!g6.turnWrong)g6.stat.passRight++;
  g6_pass(true);
}

function g6_pass(byPlayer){
  const team=g6.turn;
  g6.locked=true; g6.passes[team]++;
  const bi=g6_blankIdx();
  if(bi>=0&&!g6.dice[bi].val){ g6.dice[bi].val=1; g6_renderDice(false); }
  g6_renderEquation(true);
  const msg=!byPlayer?'컴퓨터는 이번에 담을 조개가 없어요. 쉬어요.':(bi>=0?'별에 어떤 수를 넣어도 ':'합 '+g6_sum()+' 조개는 ')+'벌써 바구니에 있어요. 이번 차례는 쉬어요.';
  g6_setHint(msg); g6_float('쉬어가요'); if(byPlayer)hwSay(msg);
  g6_later(g6_endTurn,1600);
}

function g6_place(team,value){
  g6.locked=true; g6.passes[team]=0;
  clearTimeout(g6.helpTimer);
  const human=g6.mode==='duo'||team==='A', bi=g6_blankIdx();
  if(g6.mode==='solo'&&team==='A'){
    g6.stat.turns++;
    if(!g6.turnWrong&&!g6.turnHelp)g6.stat.clean++;
    if(bi>=0){ g6.stat.blankTurns++; if(g6.blankPicks<=1&&!g6.turnWrong)g6.stat.blankSmart++; }
  }
  g6.hand[team]=g6.hand[team].filter(v=>v!==value);
  g6.basket[team].push(value); g6.last={team,value}; g6.glow=[];
  g6_renderEquation(true);
  const box=g6_el('g6Dots'); if(box)box.hidden=true;
  g6_renderAll();
  hwSfx('place');
  const eqText=g6.dice.map(d=>d.face||d.val).join(' + ')+' = '+value;
  if(!g6.hand[team].length){
    g6_setHint(hwCharName(G6_CAST[team])+' 바구니가 가득 찼어요!');
    g6_later(()=>showWin(team,g6.mode,`<span class="g6-win-art">${hwChar(G6_CAST[team],'happy')}</span>`),900);
    return;
  }
  if(human){ g6_float(eqText+' 맞아요!'); g6_setHint(eqText+'! 조개를 바구니에 담았어요.'); hwSay(eqText.replace(/\+/g,'더하기').replace('=','는')+'. 맞아요!'); }
  else g6_setHint('컴퓨터는 '+eqText+' 조개를 담았어요.');
  g6_later(g6_endTurn,human?1300:1500);
}

function g6_endTurn(){
  g6.turn=g6.turn==='A'?'B':'A';
  g6_resetConsole();
  g6_renderHand();
  g6_updateTurn();
  const computer=g6.mode==='solo'&&g6.turn==='B';
  g6.locked=computer;
  if(computer)g6_later(g6_aiTurn,700);
  else if(g6.mode==='duo')hwSay((g6.turn==='A'?'파랑':'빨강')+' 차례예요.');
}

function g6_updateTurn(){
  const isA=g6.turn==='A', thinking=g6.mode==='solo'&&!isA;
  const ta=g6_el('g6TeamA'), tb=g6_el('g6TeamB');
  if(ta)ta.dataset.turn=isA?'1':'0';
  if(tb){tb.dataset.turn=isA?'0':'1';tb.classList.toggle('thinking',thinking);}
  const game=g6_el('g6Game'); if(game)game.dataset.turn=g6.turn;
  const roll=g6_el('g6RollBtn');
  if(roll){ roll.disabled=thinking; roll.innerHTML=hwIcon(thinking?'eye':'sparkles')+(thinking?' 컴퓨터 차례':' 주사위 굴리기'); }
  g6_setHint(thinking?'컴퓨터 차례예요. 점을 세고 있어요.':g6_who(g6.turn)+' 차례! 주사위를 굴려요.');
}

/* ---------- 컴퓨터 ---------- */
function g6_aiTurn(){
  if(g6.mode!=='solo'||g6.turn!=='B')return;
  g6_doRoll();
  g6_later(()=>{
    const bi=g6_blankIdx();
    if(bi>=0){
      const fixed=g6.dice.reduce((s,d)=>s+(d.face||0),0);
      const good=[1,2,3].filter(v=>g6.hand.B.includes(fixed+v));
      /* 보통은 가끔 별 수를 대충 고른다. 어려움은 항상 담을 수 있는 수를 고른다. */
      const careless=g6.level===2&&Math.random()<.35;
      g6.dice[bi].val=(!careless&&good.length)?good[(Math.random()*good.length)|0]:1+((Math.random()*3)|0);
      g6_renderDice(false); g6_renderEquation(false);
    }
    g6_later(()=>{
      if(g6.hand.B.includes(g6_sum()))g6_place('B',g6_sum());
      else g6_pass(false);
    },bi>=0?700:300);
  },900);
}

/* ---------- 표시 도우미 ---------- */
function g6_setHint(text){ const h=g6_el('g6Hint'); if(h)h.textContent=text; }
function g6_float(text){ const f=g6_el('g6Float'); if(!f)return; f.textContent=text; f.classList.remove('show'); void f.offsetWidth; f.classList.add('show'); }

function g6_sessionSummary(){ const s=g6.stat; if(!s)return null; return {level:g6.level,...s}; }

/* ---------- 공통 등록 ---------- */
/* ---------- 등록 (게임 약속: games/registry.js) ---------- */
hwRegisterGame({
  id:'g6',order:6,
  title:'조개 모으기',age:'4세+',ages:['4-5','6-7'],players:'1–2명',time:'3–5분',category:'수·세기',hero:'주사위를 모두 더해서<br>조개를 모아봐!',description:'수달과 가재가 주사위 수를 더하고, 점 개수가 같은 조개로 바구니를 채워요.',card:'주사위 수를 더해 같은 조개를 찾아요.',coverClass:'cover-shells',cast:['otter','crayfish'],icon:'grid',
  music:'number',questIcon:'grid',
  defaults:{mode:'solo',level:1},
  cover(){ return `<span class="cover-row" aria-hidden="true"><i>3</i><i>6</i><i>4</i><i>8</i></span><span class="cover-side">${hwChar('crayfish','full')}</span><span class="cover-main">${hwChar('otter','full')}</span>`; },
  levels:{
    1:'주사위 두 개, 조개 5개. 점을 세어 더해요.',
    2:'주사위 세 개, 조개 7개. 별 면이 나오면 넣을 수를 골라요.',
    3:'주사위에 점 대신 숫자가 나와요. 머릿속으로 더해 점 조개를 찾아요.'
  },
  rules:{title:'조개 모으기',body:[
    ['1','주사위를 굴려요. 나온 수를 <b>모두 더해요</b>.'],
    ['2','점 개수가 그 수와 <b>같은 조개</b>를 찾아 눌러요. 조개가 내 바구니에 들어가요.'],
    ['i-sparkles','<b>별 면</b>이 나오면 1, 2, 3 중에서 넣을 수를 내가 골라요. 아직 없는 조개를 만들 수를 골라 봐요.'],
    ['i-eye','세기 어려우면 <b>점 세기 도움</b>을 눌러요. 그 조개가 벌써 바구니에 있으면 <b>“담을 조개가 없어요”</b>를 눌러요.'],
    ['i-star','내 바구니를 <b>먼저 가득 채우면</b> 승리!']
  ]},
  guide:{art:'otter',
     line:'주사위 두세 개의 수를 모두 더하고, 그 수만큼 점이 있는 조개를 찾아 맞추는 수 게임이에요.',
     areas:{obs:1,num:2,plan:1,self:1},
     steps:[['grid','모두 더하기','주사위 수를 하나씩 이어 세거나 더해요.'],['eye','점 조개 찾기','같은 개수의 점이 있는 조개를 골라요.'],['sparkles','별 면 고르기','아직 없는 조개를 만들 수를 골라요.']],
     levels:[['쉬움','주사위 2개, 조개 5개'],['보통','주사위 3개, 별 면 고르기'],['어려움','숫자 주사위로 머릿속 덧셈']],
     signs:['점을 하나부터 다 세지 않고 큰 수에서 이어 세요.','별 면에서 바구니를 먼저 보고 필요한 수를 골라요.','“담을 조개가 없어요”를 바구니를 확인한 뒤 눌러요.'],
     talk:'간식이나 장난감 두세 묶음을 놓고 “모두 몇 개일까?” 하고 이어 세기를 같이 해 보세요.'},
  insight(list,h){ const {add,ratio}=h;
      const turns=add(list,'turns'), clean=add(list,'clean'), help=add(list,'helpTurns')+add(list,'glowTurns');
      const blank=add(list,'blankTurns'), smart=add(list,'blankSmart'), passRight=add(list,'passRight'), passWrong=add(list,'passWrong');
      const lines=[`직접 담은 조개 <b>${turns}개 중 ${clean}개</b>는 틀리거나 도움 없이 바로 찾았어요.`];
      if(blank)lines.push(`별 면이 나온 차례 <b>${blank}번 중 ${smart}번</b>은 한 번에 담을 수 있는 수를 골랐어요.`);
      if(passRight||passWrong)lines.push(`“담을 조개가 없어요”를 맞게 누른 건 <b>${passRight}번</b>, 조개가 남아 있는데 누른 건 <b>${passWrong}번</b>이에요.`);
      if(help)lines.push(`도움(점 세기·조개 좁히기)은 <b>${help}번</b> 썼어요.`);
      return {lines,metric:l=>ratio(add(l,'clean'),add(l,'turns')),metricName:'바로 찾은 비율',
        tip:turns&&clean/turns<.5?'주사위 점을 손가락으로 짚으며 “하나, 둘, 셋…” 같이 세어 보세요.':'“큰 수부터 이어 세면 더 빠를까?” 하고 이어 세기를 권해 보세요.'};
    },
  mount(){
      const setup=g6_el('g6Setup');
  if(setup)setup.innerHTML=hwSetupMarkup({
    id:'g6',title:'조개 모으기',duo:true,
    art:hwChar(G6_CAST.A,'full')+hwChar(G6_CAST.B,'full'),
    desc:'주사위 수를 모두 더하고, 점 개수가 같은 조개를 골라 수달과 가재의 바구니를 먼저 채워요.',
    age:'4세+',players:'1–2명',time:'3–5분',
    points:[['grid','모두 더하기','주사위 두세 개의 수를 더해요.'],['eye','점 세어 맞추기','점 개수가 같은 조개를 찾아요.'],['sparkles','별 면 고르기','아직 없는 조개를 만들 수를 골라요.'],['shield','없을 땐 쉬기','이미 담은 조개인지 바구니를 확인해요.']],
    levelQuestion:'주사위를 몇 개 굴릴까요?',levelHint:'주사위 수와 모양이 달라져요',
    levels:[['쉬움','주사위 2개'],['보통','3개 · 별 면'],['어려움','숫자 주사위']]
  });
  const game=g6_el('g6Game');
  if(game)game.innerHTML=`
    <div class="pagebar"><button onclick="backHub()" aria-label="홈으로 돌아가기">${hwIcon('chevron-left')}</button><span>조개 모으기</span><button onclick="showRules('g6')" aria-label="게임 방법 보기">?</button></div>
    <div class="scorebar g6-scorebar">
      <div class="team blue" id="g6TeamA"><span class="team-avatar" id="g6ArtA" aria-hidden="true"></span><span><span class="name" id="g6NameA">나</span><small class="g6-count" id="g6CountA"></small></span></div>
      <div class="team red" id="g6TeamB"><span class="team-avatar" id="g6ArtB" aria-hidden="true"></span><span><span class="name" id="g6NameB">컴퓨터</span><small class="g6-count" id="g6CountB"></small></span></div>
    </div>
    <div class="board g6-board" id="g6Board">
      <div class="g6-baskets">
        <div class="g6-basket A"><small id="g6TagA"></small><div class="g6-slots" id="g6BasketA"></div></div>
        <div class="g6-basket B"><small id="g6TagB"></small><div class="g6-slots" id="g6BasketB"></div></div>
      </div>
      <div class="g6-sand"><small id="g6HandLabel"></small><div class="g6-hand" id="g6Hand" role="group" aria-label="고를 수 있는 조개"></div></div>
      <div class="floatmsg" id="g6Float" aria-live="polite"></div>
    </div>
    <section class="g6-console" aria-label="주사위와 식">
      <div class="g6-dice-row" id="g6DiceRow" data-rolled="0">
        <div class="g6-dice" id="g6Dice" aria-label="아직 주사위를 굴리지 않았어요"></div>
        <button class="g6-roll" id="g6RollBtn" onclick="g6_roll()">주사위 굴리기</button>
        <div class="g6-eq" id="g6Equation" data-state="wait" aria-live="polite"></div>
      </div>
      <div class="g6-blank" id="g6Blank" hidden></div>
      <div class="g6-dots" id="g6Dots" hidden></div>
      <div class="g6-tools">
        <button class="g6-tool" id="g6HelpBtn" data-on="0" disabled onclick="g6_toggleHelp()">${hwIcon('eye')} 점 세기 도움</button>
        <button class="g6-tool" id="g6PassBtn" disabled onclick="g6_claimPass()">담을 조개가 없어요</button>
      </div>
      <button class="g6-hint say-line" id="g6Hint" aria-live="polite" onclick="hwSay(this.textContent,true)"></button>
    </section>
    `;
  },
  /* 아이 기록 화면: 최고 기록(과거의 나와 비교)과 기록 배지 */
  record:{key:'clean',label:'바로 담은 조개',unit:'개',goal:5,badge:'조개 박사'},
  start:g6_start,cancel:g6_cancel,summary:g6_sessionSummary
});
