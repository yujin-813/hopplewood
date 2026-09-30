/*
 * 애벌레 홀짝 잎길 — 호플우드 게임 8 (홀수·짝수 게임)
 * 먼저 홀수·짝수 중 하나를 "예상"하고 주사위를 굴린다. 나온 수가 홀수인지 짝수인지는 아이가 "스스로" 판단한다.
 * 판단이 맞으면 예상이 맞았을 때 2칸, 틀렸을 때 1칸 잎길을 간다. 사과에 먼저 닿으면 승리.
 * 합과 홀짝은 미리 보여주지 않는다. 판단이 틀리면 점을 둘씩 짝지은 그림을 보여 주고 다시 생각하게 한다.
 * 친구: 애벌레(파랑) · 메뚜기(빨강), 무대는 잎사귀 길.
 * 의존 전역: showScreen, showWin, lastCfg, curGame, LEVEL_INFO, RULES, hwChar, hwCharName, hwSfx, hwSay, hwJosa, hwSetupMarkup, hwIcon, savePreferences
 */

const G8_LEVELS={
  1:{dice:1,numerals:false,cols:6,rows:2},
  2:{dice:2,numerals:false,cols:6,rows:3},
  3:{dice:2,numerals:true,cols:6,rows:3}
};
const G8_CAST={A:'caterpillar',B:'grasshopper'};
const G8_PIPS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
const G8_WORD={odd:'홀수',even:'짝수'};

const g8={
  mode:'solo',level:1,turn:'A',locked:false,phase:'predict',
  pos:{A:-1,B:-1},guess:null,dice:[],wrong:0,runId:0
};

function g8_el(id){ return document.getElementById(id); }
function g8_later(callback,delay){ const runId=g8.runId; return setTimeout(()=>{ if(g8.runId===runId&&curGame==='g8')callback(); },delay); }
function g8_cancel(){ g8.runId++; g8.locked=true; }
function g8_cfg(){ return G8_LEVELS[g8.level]||G8_LEVELS[1]; }
function g8_who(team){ return g8.mode==='solo'?(team==='A'?'나':'컴퓨터'):(team==='A'?'파랑':'빨강'); }
function g8_goal(){ const c=g8_cfg(); return c.cols*c.rows; }
function g8_sum(){ return g8.dice.reduce((s,d)=>s+d,0); }
function g8_parity(){ return g8_sum()%2?'odd':'even'; }

function g8_start(mode){
  g8_cancel();
  g8.runId++;
  curGame='g8';
  g8.mode=mode==='duo'?'duo':'solo';
  g8.level=(lastCfg.g8||{}).level||1;
  lastCfg.g8={mode:g8.mode,level:g8.level}; savePreferences();
  g8.turn='A'; g8.locked=false; g8.pos={A:-1,B:-1};
  g8.stat={turns:0,clean:0,wrong:0,helpTurns:0,oddWrong:0,evenWrong:0,predictRight:0};
  const float=g8_el('g8Float'); if(float){ float.classList.remove('show'); float.textContent=''; }
  g8_renderPlayers();
  g8_buildBoard();
  g8_resetConsole();
  g8_updateTurn();
  showScreen('g8Game');
  hwSay('홀수일지 짝수일지 먼저 예상하고 주사위를 굴려요. 예상이 맞으면 두 칸, 틀리면 한 칸! 사과에 먼저 닿으면 이겨요.');
  if(typeof hwCoach==='function')g8_later(()=>hwCoach('g8',[
    {el:'#g8Predict',text:'홀수가 나올지 짝수가 나올지 골라요. 고르면 주사위가 굴러가요!',tap:true,wait:900},
    {el:'#g8Judge',text:'나온 수가 홀수인지 짝수인지 스스로 생각해서 눌러요.'}
  ]),400);
}

/* ---------- 잎길 ---------- */
/* 한 줄씩 방향이 바뀌는 길. 위에 출발, 아래에 사과가 있다. */
function g8_cell(i){
  const {cols,rows}=g8_cfg(), vrows=rows+2;
  if(i<0)return {x:.5/cols,y:.5/vrows};
  if(i>=cols*rows){ const c=(rows-1)%2===0?cols-1:0; return {x:(c+.5)/cols,y:(rows+1.5)/vrows}; }
  const r=Math.floor(i/cols), k=i%cols, c=r%2===0?k:cols-1-k;
  return {x:(c+.5)/cols,y:(r+1.5)/vrows};
}
const G8_LEAF=['green','lime','yellow','orange','red'];
function g8_leafSVG(i){
  return `<img src="assets/art/board/tile_leaf_${G8_LEAF[i%G8_LEAF.length]}.png" alt="" draggable="false" decoding="async">`;
}
function g8_buildBoard(){
  const grid=g8_el('g8Path'); if(!grid)return;
  const {cols,rows}=g8_cfg(), n=g8_goal();
  grid.style.aspectRatio=(cols/(rows+2)*1.1).toFixed(3);
  grid.style.setProperty('--g8c',cols);
  const at=p=>`left:${(p.x*100).toFixed(2)}%;top:${(p.y*100).toFixed(2)}%`;
  const pts=[]; for(let i=-1;i<=n;i++){ const p=g8_cell(i); pts.push((p.x*100).toFixed(2)+','+(p.y*100).toFixed(2)); }
  let html=`<svg class="g8-trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.join(' ')}"/></svg>`;
  for(let i=-1;i<n;i++){
    const p=g8_cell(i), q=g8_cell(i+1), deg=q.x>p.x+1e-6?0:(q.x<p.x-1e-6?180:90);
    html+=`<i class="g8-arrow" style="left:${((p.x+q.x)*50).toFixed(2)}%;top:${((p.y+q.y)*50).toFixed(2)}%;--r:${deg}deg"></i>`;
  }
  html+=`<span class="g8-start" style="${at(g8_cell(-1))}">출발</span>`;
  for(let i=0;i<n;i++)html+=`<span class="g8-leaf" id="g8Leaf${i}" style="${at(g8_cell(i))}">${g8_leafSVG(i)}</span>`;
  html+=`<span class="g8-apple" style="${at(g8_cell(n))}" aria-label="사과"><img src="assets/art/board/goal_apple.png" alt="" draggable="false" decoding="async"></span>`;
  html+=`<span class="g8-piece A" id="g8PieceA">${hwChar(G8_CAST.A,'face')}</span><span class="g8-piece B" id="g8PieceB">${hwChar(G8_CAST.B,'face')}</span>`;
  grid.innerHTML=html;
  g8_placePieces();
}
function g8_placePieces(){
  ['A','B'].forEach(team=>{
    const el=g8_el('g8Piece'+team); if(!el)return;
    const p=g8_cell(Math.min(g8.pos[team],g8_goal())), same=g8.pos.A===g8.pos.B;
    const dx=same?(team==='A'?-3.2:3.2):0, dy=same?(team==='A'?-1.6:1.6):0;
    el.style.left=(p.x*100+dx)+'%'; el.style.top=(p.y*100+dy)+'%';
    el.classList.toggle('now',team===g8.turn);
  });
}
function g8_renderPlayers(){
  ['A','B'].forEach(team=>{
    const art=g8_el('g8Art'+team); if(art)art.innerHTML=hwChar(G8_CAST[team],'face');
    const name=g8_el('g8Name'+team); if(name)name.textContent=g8_who(team);
  });
  g8_updateProgress();
}
function g8_updateProgress(){
  ['A','B'].forEach(team=>{ const t=g8_el('g8Tag'+team); if(t)t.textContent=hwCharName(G8_CAST[team])+' · 사과까지 '+Math.max(0,g8_goal()-g8.pos[team])+'칸'; });
}

/* ---------- 주사위 ---------- */
function g8_dieMarkup(n){ return g8_cfg().numerals?`<b class="g8-die-num">${n}</b>`:(G8_PIPS[n]||[]).map(p=>'<i class="p'+p+'"></i>').join(''); }
function g8_renderDice(animate){
  const box=g8_el('g8Dice'); if(!box)return;
  const n=g8_cfg().dice;
  box.innerHTML=g8.dice.length?g8.dice.map(d=>`<span class="g8-die${animate?' rolling':''}">${g8_dieMarkup(d)}</span>`).join(''):Array.from({length:n},()=>'<span class="g8-die wait"></span>').join('');
}
function g8_renderEquation(reveal){
  const eq=g8_el('g8Equation'); if(!eq)return;
  if(!g8.dice.length){ eq.hidden=true; return; }
  eq.hidden=false;
  const one=g8.dice.length===1;
  const left=one?(g8_cfg().numerals?String(g8.dice[0]):'주사위 점'):g8.dice.join(' + ');
  eq.dataset.state=reveal?'shown':'ask';
  eq.innerHTML=one&&!g8_cfg().numerals
    ?`<b>점 <em>${reveal?g8_sum():'?'}</em>개${reveal?' · '+G8_WORD[g8_parity()]:''}</b>`
    :`<b>${left} = <em>${reveal?g8_sum():'?'}</em>${reveal?' · '+G8_WORD[g8_parity()]:''}</b>`;
}

function g8_resetConsole(){
  g8.phase='predict'; g8.guess=null; g8.dice=[]; g8.wrong=0; g8.turnHelp=false; g8.turnWrong=false;
  g8_renderDice(false); g8_renderEquation(false);
  const pair=g8_el('g8Pairs'); if(pair){pair.hidden=true;pair.innerHTML='';}
  g8_renderPhase();
}
function g8_renderPhase(){
  const human=!(g8.mode==='solo'&&g8.turn==='B');
  const pred=g8_el('g8Predict'), judge=g8_el('g8Judge');
  if(pred){ pred.hidden=g8.phase!=='predict'; pred.querySelectorAll('button').forEach(b=>{ b.disabled=!human||g8.locked; }); }
  if(judge){ judge.hidden=g8.phase!=='judge'; judge.querySelectorAll('button').forEach(b=>{ b.disabled=!human||g8.locked; }); }
  const badge=g8_el('g8Guess');
  if(badge){ badge.hidden=!g8.guess; if(g8.guess){ badge.dataset.kind=g8.guess; badge.textContent='예상: '+G8_WORD[g8.guess]; } }
}

/* 1단계: 예상하고 굴리기 */
function g8_predict(kind){
  if(g8.locked||g8.phase!=='predict')return;
  if(g8.mode==='solo'&&g8.turn==='B')return;
  g8.guess=kind; hwSfx('tap');
  g8_roll();
  g8_setHint('나온 수는 홀수일까요, 짝수일까요? 스스로 생각해서 눌러요.');
  hwSay(g8_cfg().dice===1?'주사위 점은 홀수일까요, 짝수일까요?':g8.dice.join(' 더하기 ')+'. 홀수일까요, 짝수일까요?');
}
function g8_roll(){
  const n=g8_cfg().dice;
  g8.dice=Array.from({length:n},()=>1+((Math.random()*6)|0));
  g8.phase='judge';
  hwSfx('roll');
  g8_renderDice(true); g8_renderEquation(false); g8_renderPhase();
}

/* 2단계: 나온 수의 홀짝을 스스로 판단하기 */
function g8_judge(kind){
  if(g8.locked||g8.phase!=='judge')return;
  if(g8.mode==='solo'&&g8.turn==='B')return;
  if(kind===g8_parity()){ g8_resolve(g8.turn); return; }
  g8.wrong++;
  if(g8.mode==='solo'){ g8.stat.wrong++; g8.turnWrong=true; if(g8_parity()==='odd')g8.stat.oddWrong++; else g8.stat.evenWrong++; }
  hwSfx('oops');
  const btn=document.querySelector('#g8Judge button[data-kind="'+kind+'"]'); if(btn){btn.classList.remove('nope');void btn.offsetWidth;btn.classList.add('nope');}
  g8_showPairs(false);
  if(g8.mode==='solo'&&g8.turn==='A'&&!g8.turnHelp){ g8.stat.helpTurns++; g8.turnHelp=true; }
  g8_setHint('점을 둘씩 짝지어 봐요. 짝꿍 없이 하나가 남으면 홀수, 모두 짝꿍이 있으면 짝수예요.');
  hwSay('점을 둘씩 짝지어 봐요. 하나가 남으면 홀수, 모두 짝꿍이 있으면 짝수예요.');
}
/* 점을 둘씩 묶어 보여 준다. 남은 점을 따로 표시하거나 답을 적지는 않는다(reveal일 때만 결과를 적는다). */
function g8_showPairs(reveal){
  const box=g8_el('g8Pairs'); if(!box)return;
  const total=g8_sum(), cols=[];
  for(let i=0;i<total;i+=2)cols.push(`<span class="g8-pair">${'<i></i>'.repeat(Math.min(2,total-i))}</span>`);
  const pairs=Math.floor(total/2), left=total%2;
  box.innerHTML=`<div class="g8-pairs">${cols.join('')}</div><small>${reveal?`짝꿍 ${pairs}쌍${left?' + 하나 남음 → 홀수':', 남는 점 없음 → 짝수'}`:'두 개씩 짝지은 점이에요. 혼자 남은 점이 있나요?'}</small>`;
  box.hidden=false;
}

function g8_resolve(team){
  g8.locked=true;
  const human=g8.mode==='duo'||team==='A', hit=g8.guess===g8_parity(), steps=hit?2:1;
  if(g8.mode==='solo'&&team==='A'){ g8.stat.turns++; if(!g8.turnWrong)g8.stat.clean++; if(hit)g8.stat.predictRight++; }
  g8_renderEquation(true); g8_showPairs(true);
  const judge=g8_el('g8Judge'); if(judge)judge.hidden=true;
  const word=G8_WORD[g8_parity()];
  if(human){
    g8_float(hit?'예상 적중! 2칸':'1칸 가요');
    g8_setHint(hwJosa(String(g8_sum()),'은/는')+' '+word+'! '+(hit?'예상이 맞아서 두 칸 가요.':'예상과 달라서 한 칸 가요.'));
    hwSay(hwJosa(String(g8_sum()),'은/는')+' '+word+'! '+(hit?'예상이 맞았어요. 두 칸!':'한 칸 가요.'));
  }else g8_setHint('컴퓨터는 '+G8_WORD[g8.guess]+'를 예상했고 '+hwJosa(String(g8_sum()),'이/가')+' 나와서 '+steps+'칸 가요.');
  g8_later(()=>g8_step(team,steps,human),900);
}
function g8_step(team,steps,human){
  g8.pos[team]++; g8_placePieces(); g8_updateProgress(); hwSfx('place');
  const leaf=g8_el('g8Leaf'+g8.pos[team]); if(leaf){ leaf.classList.remove('bump'); void leaf.offsetWidth; leaf.classList.add('bump'); }
  if(g8.pos[team]>=g8_goal()){
    g8_setHint(hwJosa(hwCharName(G8_CAST[team]),'이/가')+' 사과에 닿았어요!');
    g8_later(()=>showWin(team,g8.mode,`<span class="g8-win-art">${hwChar(G8_CAST[team],'happy')}</span>`),800);
    return;
  }
  if(steps>1){ g8_later(()=>g8_step(team,steps-1,human),420); return; }
  g8_later(g8_endTurn,human?1200:1100);
}

function g8_endTurn(){
  g8.turn=g8.turn==='A'?'B':'A';
  const computer=g8.mode==='solo'&&g8.turn==='B';
  g8.locked=computer;
  g8_resetConsole();
  g8_placePieces();
  g8_updateTurn();
  if(computer)g8_later(g8_aiTurn,700);
  else if(g8.mode==='duo')hwSay((g8.turn==='A'?'파랑':'빨강')+' 차례예요. 홀수일까, 짝수일까?');
}
function g8_updateTurn(){
  const isA=g8.turn==='A', thinking=g8.mode==='solo'&&!isA;
  const ta=g8_el('g8TeamA'), tb=g8_el('g8TeamB');
  if(ta)ta.dataset.turn=isA?'1':'0';
  if(tb){tb.dataset.turn=isA?'0':'1';tb.classList.toggle('thinking',thinking);}
  g8_renderPhase();
  g8_setHint(thinking?'컴퓨터 차례예요. 무엇을 예상할까요?':g8_who(g8.turn)+' 차례! 홀수일지 짝수일지 예상해요.');
}

/* ---------- 컴퓨터 ---------- */
function g8_aiTurn(){
  if(g8.mode!=='solo'||g8.turn!=='B')return;
  g8.guess=Math.random()<.5?'odd':'even';
  g8_renderPhase();
  g8_setHint('컴퓨터는 '+hwJosa(G8_WORD[g8.guess],'을/를')+' 예상했어요.');
  g8_later(()=>{ g8_roll(); g8_later(()=>g8_resolve('B'),1100); },800);
}

/* ---------- 표시 도우미 ---------- */
function g8_setHint(text){ const h=g8_el('g8Hint'); if(h)h.textContent=text; }
function g8_float(text){ const f=g8_el('g8Float'); if(!f)return; f.textContent=text; f.classList.remove('show'); void f.offsetWidth; f.classList.add('show'); }

function g8_sessionSummary(){ const s=g8.stat; if(!s)return null; return {level:g8.level,...s}; }

/* ---------- 공통 등록 ---------- */
/* ---------- 등록 (게임 약속: games/registry.js) ---------- */
hwRegisterGame({
  id:'g8',order:8,
  title:'애벌레 홀짝 잎길',age:'4세+',ages:['4-5','6-7'],players:'1–2명',time:'3–5분',category:'수·홀짝',hero:'홀수일까, 짝수일까?<br>예상하고 굴려봐!',description:'애벌레와 메뚜기가 홀짝을 예상하고, 나온 수의 홀짝을 스스로 가려 사과까지 가요.',card:'홀짝을 예상하고 스스로 가려 가요.',coverClass:'cover-leaves',cast:['caterpillar','grasshopper'],icon:'sparkles',
  music:'forest',questIcon:'sparkles',
  defaults:{mode:'solo',level:1},
  cover(){ return `<span class="cover-row" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="cover-side">${hwChar('grasshopper','full')}</span><span class="cover-main">${hwChar('caterpillar','full')}</span>`; },
  levels:{
    1:'주사위 한 개, 잎 12장. 점이 홀수인지 짝수인지 봐요.',
    2:'주사위 두 개를 더한 수가 홀수인지 짝수인지 판단해요. 잎 18장.',
    3:'숫자 주사위 두 개, 잎 18장. 점 없이 머릿속으로 따져요.'
  },
  rules:{title:'애벌레 홀짝 잎길',body:[
    ['1','<b>홀수</b>가 나올지 <b>짝수</b>가 나올지 먼저 예상해요. 고르면 주사위가 굴러가요.'],
    ['2','나온 수가 홀수인지 짝수인지 <b>스스로 생각해서</b> 눌러요.'],
    ['i-eye','헷갈리면 점을 <b>둘씩 짝지어</b> 봐요. 하나가 남으면 홀수, 모두 짝꿍이 있으면 짝수예요.'],
    ['i-route','예상이 맞으면 <b>두 칸</b>, 틀리면 <b>한 칸</b> 잎길을 가요.'],
    ['i-star','<b>사과에 먼저</b> 닿으면 승리!']
  ]},
  guide:{art:'caterpillar',
     line:'주사위에서 나온 수가 홀수인지 짝수인지 스스로 가려내는 게임이에요. 먼저 예상하는 재미가 있지만 이동은 운이 섞여 있어요.',
     areas:{obs:1,num:2,self:1},
     steps:[['sparkles','예상하기','홀수일까 짝수일까 먼저 골라요.'],['grid','수 만들기','주사위 점을 세거나 두 수를 더해요.'],['eye','홀짝 가리기','둘씩 짝지어 남는 점이 있는지 따져요.']],
     levels:[['쉬움','주사위 1개'],['보통','주사위 2개의 합'],['어려움','숫자 주사위 2개의 합']],
     signs:['점을 둘씩 짚으며 짝을 지어 봐요.','“1, 3, 5는 홀수” 처럼 규칙을 말로 설명해요.','더한 수를 다 세지 않고도 홀짝을 알아채는 순간이 생겨요.'],
     talk:'신발·양말처럼 짝이 있는 물건을 세며 “하나 남았네, 홀수야!” 하고 같이 짝지어 보세요.'},
  insight(list,h){ const {add,ratio}=h;
      const turns=add(list,'turns'), clean=add(list,'clean'), odd=add(list,'oddWrong'), even=add(list,'evenWrong');
      const lines=[`홀짝을 가린 차례 <b>${turns}번 중 ${clean}번</b>은 한 번에 맞혔어요.`];
      if(odd||even)lines.push(`홀수를 짝수로 본 건 <b>${odd}번</b>, 짝수를 홀수로 본 건 <b>${even}번</b>이에요.`);
      lines.push('예상이 맞는지는 운이라서 리포트에서는 보지 않아요.');
      return {lines,metric:l=>ratio(add(l,'clean'),add(l,'turns')),metricName:'한 번에 맞힌 비율',
        tip:turns&&clean/turns<.6?'바둑돌이나 과자를 둘씩 짝지어 “남는 게 있나?” 하고 같이 확인해 보세요.':'“7은 왜 홀수야?” 하고 이유를 말로 설명해 보게 해 주세요.'};
    },
  mount(){
      const setup=g8_el('g8Setup');
  if(setup)setup.innerHTML=hwSetupMarkup({
    id:'g8',title:'애벌레 홀짝 잎길',duo:true,
    art:hwChar(G8_CAST.A,'full')+hwChar(G8_CAST.B,'full'),
    desc:'홀수일지 짝수일지 예상하고 주사위를 굴려요. 나온 수의 홀짝을 스스로 가려 애벌레와 메뚜기가 사과까지 가요.',
    age:'4세+',players:'1–2명',time:'3–5분',
    points:[['sparkles','예상하기','홀수일까 짝수일까 먼저 골라요.'],['eye','짝짓기','점을 둘씩 묶어 남는지 봐요.'],['grid','더해서 따지기','두 수를 더한 수의 홀짝을 가려요.'],['route','잎길 경주','예상이 맞으면 두 칸!']],
    levelQuestion:'주사위를 몇 개 굴릴까요?',levelHint:'주사위 수와 길이가 달라져요',
    levels:[['쉬움','주사위 1개'],['보통','주사위 2개'],['어려움','숫자 주사위']]
  });
  const game=g8_el('g8Game');
  if(game)game.innerHTML=`
    <div class="pagebar"><button onclick="backHub()" aria-label="홈으로 돌아가기">${hwIcon('chevron-left')}</button><span>애벌레 홀짝 잎길</span><button onclick="showRules('g8')" aria-label="게임 방법 보기">?</button></div>
    <div class="scorebar g8-scorebar">
      <div class="team blue" id="g8TeamA"><span class="team-avatar" id="g8ArtA" aria-hidden="true"></span><span><span class="name" id="g8NameA">나</span><small class="g8-tag" id="g8TagA"></small></span></div>
      <div class="team red" id="g8TeamB"><span class="team-avatar" id="g8ArtB" aria-hidden="true"></span><span><span class="name" id="g8NameB">컴퓨터</span><small class="g8-tag" id="g8TagB"></small></span></div>
    </div>
    <div class="board g8-board" id="g8Board">
      <div class="g8-path" id="g8Path" role="group" aria-label="잎사귀 길"></div>
      <div class="floatmsg" id="g8Float" aria-live="polite"></div>
    </div>
    <section class="g8-console" aria-label="주사위와 홀짝">
      <div class="g8-dice-row">
        <div class="g8-dice" id="g8Dice" aria-hidden="true"></div>
        <div class="g8-status"><span class="g8-guess" id="g8Guess" hidden></span><div class="g8-eq" id="g8Equation" aria-live="polite" hidden></div></div>
      </div>
      <div class="g8-choice" id="g8Predict">
        <span>무엇이 나올지 예상해요</span>
        <div><button type="button" class="odd" onclick="g8_predict('odd')"><b>홀수</b><small>1 · 3 · 5 …</small></button><button type="button" class="even" onclick="g8_predict('even')"><b>짝수</b><small>2 · 4 · 6 …</small></button></div>
      </div>
      <div class="g8-choice judge" id="g8Judge" hidden>
        <span>나온 수는 홀수일까, 짝수일까?</span>
        <div><button type="button" class="odd" data-kind="odd" onclick="g8_judge('odd')"><b>홀수예요</b></button><button type="button" class="even" data-kind="even" onclick="g8_judge('even')"><b>짝수예요</b></button></div>
      </div>
      <div class="g8-pairbox" id="g8Pairs" hidden></div>
      <button class="g8-hint say-line" id="g8Hint" aria-live="polite" onclick="hwSay(this.textContent,true)"></button>
    </section>
    `;
  },
  /* 아이 기록 화면: 최고 기록(과거의 나와 비교)과 기록 배지 */
  record:{key:'clean',label:'한 번에 맞힌 홀짝',unit:'번',goal:8,badge:'홀짝 척척박사'},
  start:g8_start,cancel:g8_cancel,summary:g8_sessionSummary
});
