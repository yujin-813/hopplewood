/*
 * 모양 만들기 — 호플우드 게임 2 (패턴·전략 게임)
 * 부엉이와 파랑새를 한 칸씩 놓아 내 목표 줄을 먼저 만들고 상대 줄은 막는다.
 *   - 칩은 두 친구(0/1) 아무거나 빈 칸에 놓음(공용)
 *   - 내가 고른 '모양(패턴)'을 한 줄로 먼저 만들면 승리
 * 의존 전역: showScreen, showWin, lastCfg, savePreferences, curGame, hwChar, hwCharName, hwSfx, hwSay, icon
 */
const G2_CAST=['owl','bluebird'];
function chipMarkup(color){ return hwChar(G2_CAST[color],'face'); }
function chipLabel(color){ return hwCharName(G2_CAST[color]); }

const PATS={ 1:[[0,1,0],[1,0,1],[0,0,1],[1,1,0]],
             2:[[0,1,0,1],[1,0,0,1],[0,0,1,1],[1,1,0,0],[0,1,1,0]],
             3:[[0,1,1,0],[1,0,1,1],[0,0,1,0],[1,1,0,1],[0,1,0,0],[1,0,0,1]] };
const g2={ mode:'solo', level:1, size:5, need:3, board:null, turn:'A', locked:false, moves:0, patA:null, patB:null, sel:0, runId:0 };
function g2_later(callback,delay){ const runId=g2.runId; return setTimeout(()=>{if(g2.runId===runId&&curGame==='g2')callback();},delay); }
function g2_cancel(){g2.runId++;g2.locked=true;}

function g2Start(mode){ g2.runId++; g2.stat={moves:0,threats:0,blocks:0,accidental:0}; g2.mode=mode; g2.level=lastCfg.g2.level; lastCfg.g2.mode=mode; savePreferences();
  g2.size=g2.level===1?5:(g2.level===2?6:7); g2.need=g2.level===1?3:4;
  g2.board=Array.from({length:g2.size},()=>Array(g2.size).fill(null)); g2.turn='A'; g2.locked=false; g2.moves=0; g2.sel=0;
  const arr=PATS[g2.level].slice(); g1_shuffle(arr); g2.patA=arr[0]; g2.patB=arr[1];
  g2_renderPats(); g2_renderPicker(); g2_build(); g2_turnMsg(); showScreen('g2Game');
  if(typeof hwCoach==='function')g2_later(()=>hwCoach('g2',[
    {el:'#g2patA',text:'이게 내 목표 모양이에요. 친구들을 이 순서대로 한 줄로 놓으면 이겨요.'},
    {el:'#g2picker .pick[data-i="'+g2.patA[0]+'"]',text:'목표 모양의 첫 친구를 눌러 골라요.',tap:true},
    {el:'#g2grid',text:'이제 빈 칸을 눌러 놓아요. 가로, 세로, 비스듬히 모두 돼요!',tap:true}
  ]),400); }

function g2_build(){ const grid=document.getElementById('g2grid'); grid.style.gridTemplateColumns='repeat('+g2.size+',1fr)'; grid.style.gridTemplateRows='repeat('+g2.size+',1fr)'; grid.innerHTML='';
  for(let r=0;r<g2.size;r++)for(let c=0;c<g2.size;c++){ const cell=document.createElement('button'); cell.type='button'; cell.className='c2'; cell.id='g2c_'+r+'_'+c;
    cell.setAttribute('aria-label',`${r+1}행 ${c+1}열, 빈 칸`); cell.innerHTML='<div class="slot"></div>'; cell.onclick=()=>g2_click(r,c); grid.appendChild(cell); } }
function g2_renderPats(){ const nA=g2.mode==='solo'?'내 목표':'파랑 목표', nB=g2.mode==='solo'?'상대 목표':'빨강 목표';
  document.getElementById('g2pats').innerHTML=g2_patRow(nA,g2.patA,'A')+g2_patRow(nB,g2.patB,'B'); g2_patTurn(); }
function g2_patRow(label,pat,team){ return `<div class="patrow ${team==='A'?'blue':'red'}" id="g2pat${team}"><span class="pl">${label}</span><span class="pc-line">`+
  pat.map(v=>`<span class="mini k${v}">${chipMarkup(v)}</span>`).join('')+`</span></div>`; }
function g2_patTurn(){ const a=document.getElementById('g2patA'), b=document.getElementById('g2patB'); if(a)a.dataset.turn=g2.turn==='A'?'1':'0'; if(b)b.dataset.turn=g2.turn==='B'?'1':'0'; }
function g2_renderPicker(){ document.getElementById('g2picker').innerHTML=`<span class="plbl">놓을 친구:</span>`+
  [0,1].map(i=>`<button class="pick k${i}" data-i="${i}" data-on="${g2.sel===i?'1':'0'}" aria-pressed="${g2.sel===i?'true':'false'}" onclick="g2_sel(${i})" aria-label="${chipLabel(i)} 친구 놓기">${chipMarkup(i)}</button>`).join(''); }
function g2_sel(i){ g2.sel=i; document.querySelectorAll('#g2picker .pick').forEach(b=>{ const on=+b.dataset.i===i; b.dataset.on=on?'1':'0'; b.setAttribute('aria-pressed',on?'true':'false'); }); }

function g2_place(r,c,color){ g2.board[r][c]=color; const disc=document.createElement('div'); disc.className='disc k'+color; disc.innerHTML=chipMarkup(color);
  const cell=document.getElementById('g2c_'+r+'_'+c); cell.appendChild(disc); cell.setAttribute('aria-label',`${r+1}행 ${c+1}열, ${chipLabel(color)} 놓임`); cell.disabled=true; }
function g2_click(r,c){ if(g2.locked||g2.board[r][c]!==null)return; if(g2.mode==='solo'&&g2.turn!=='A')return;
  /* 쉬움: 상대 모양을 대신 완성하는 칸이면 한 번 알려 주고, 같은 칸을 한 번 더 누르면 놓는다 */
  if(g2.level===1){ const other=g2.turn==='A'?g2.patB:g2.patA, key=r+','+c+','+g2.sel;
    g2.board[r][c]=g2.sel; const gift=g2_present(other); g2.board[r][c]=null;
    if(gift&&g2.warned!==key){ g2.warned=key; g2_float('앗! 여기 놓으면 상대 모양이 돼요'); if(typeof hwSay==='function')hwSay('여기 놓으면 상대 모양이 돼요.'); return; }
    g2.warned=null; }
  if(g2.mode==='solo'&&g2.stat){ const threat=g2_threatCells(g2.patB); g2.stat.moves++; if(threat.size){ g2.stat.threats++; if(threat.has(r+','+c))g2.stat.blocks++; } }
  g2_do(r,c,g2.sel,g2.turn); }
/* 상대가 다음 한 수로 목표 줄을 완성할 수 있는 빈 칸들 */
function g2_threatCells(pat){ const out=new Set(); for(const [r,c] of g2_empty())for(const col of [0,1]){ g2.board[r][c]=col; if(g2_present(pat))out.add(r+','+c); g2.board[r][c]=null; } return out; }
function g2_do(r,c,color,team){ g2.locked=true; g2_place(r,c,color); g2.moves++; hwSfx('place');
  const selfPat=team==='A'?g2.patA:g2.patB, otherTeam=team==='A'?'B':'A', otherPat=team==='A'?g2.patB:g2.patA;
  let line=g2_present(selfPat);
  if(line){ g2_mark(line); g2_later(()=>showWin(team,g2.mode),520); return; }
  line=g2_present(otherPat);
  if(line){ if(team==='A'&&g2.mode==='solo'&&g2.stat)g2.stat.accidental=1; g2_mark(line); g2_float('앗! 상대 줄을 만들었어요'); g2_later(()=>showWin(otherTeam,g2.mode),750); return; }
  if(g2.moves>=g2.size*g2.size){ g2_later(()=>showWin(null,g2.mode),400); return; }
  g2.turn=g2.turn==='A'?'B':'A'; g2_turnMsg();
  if(g2.mode==='solo'&&g2.turn==='B') g2_later(g2_ai,650); else g2.locked=false; }

function g2_empty(){ const o=[]; for(let r=0;r<g2.size;r++)for(let c=0;c<g2.size;c++) if(g2.board[r][c]===null)o.push([r,c]); return o; }
function eqA(a,b){ if(a.length!==b.length)return false; for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false; return true; }
function g2_present(pat){ const S=g2.size,L=pat.length,rev=pat.slice().reverse(); const dirs=[[0,1],[1,0],[1,1],[1,-1]];
  for(let r=0;r<S;r++)for(let c=0;c<S;c++)for(const [dr,dc] of dirs){ const cells=[]; let ok=true;
    for(let k=0;k<L;k++){ const nr=r+dr*k,nc=c+dc*k; if(nr<0||nc<0||nr>=S||nc>=S){ok=false;break;} const v=g2.board[nr][nc]; if(v===null){ok=false;break;} cells.push([nr,nc,v]); }
    if(!ok)continue; const seq=cells.map(x=>x[2]); if(eqA(seq,pat)||eqA(seq,rev)) return cells.map(x=>[x[0],x[1]]); }
  return null; }
function g2_winScore(cells,pat){ let f=0; for(let i=0;i<pat.length;i++){ const v=cells[i]; if(v===null)continue; if(v===pat[i])f++; else return 0; } return f; }
function g2_progress(pat){ const S=g2.size,L=pat.length,rev=pat.slice().reverse(); const dirs=[[0,1],[1,0],[1,1],[1,-1]]; let sc=0;
  for(let r=0;r<S;r++)for(let c=0;c<S;c++)for(const [dr,dc] of dirs){ const cells=[]; let ok=true;
    for(let k=0;k<L;k++){ const nr=r+dr*k,nc=c+dc*k; if(nr<0||nc<0||nr>=S||nc>=S){ok=false;break;} cells.push(g2.board[nr][nc]); }
    if(!ok)continue; sc+=Math.max(g2_winScore(cells,pat),g2_winScore(cells,rev)); }
  return sc; }
function g2_mark(line){ line.forEach(([r,c])=>document.getElementById('g2c_'+r+'_'+c).classList.add('win')); }

/* 컴퓨터 성향: skip 막기를 놓칠 확률 · wander 아무 안전한 칸에 둘 확률 · fork 한 번에 두 군데 위협(막을 곳이 둘)을 노리는 확률
   difficulty-sim.js로 잰 승률을 보고 정했다. */
const G2_AI={1:{skip:.6,wander:.55,fork:0},2:{skip:.25,wander:.2,fork:.05},3:{skip:0,wander:.03,fork:.6}};
function g2_winningSpots(pat,avoid){ const spots=[]; for(const [r,c] of g2_empty())for(const col of [0,1]){ g2.board[r][c]=col; const w=g2_present(pat), bad=avoid&&g2_present(avoid); g2.board[r][c]=null; if(w&&!bad){ spots.push(r+','+c); break; } } return spots; }
function g2_ai(){ const empties=g2_empty(); const cfg=G2_AI[g2.level]||G2_AI[2];
  for(const [r,c] of empties) for(const col of [0,1]){ g2.board[r][c]=col; const w=g2_present(g2.patB); g2.board[r][c]=null; if(w) return g2_do(r,c,col,'B'); }
  const threats=[]; for(const [r,c] of empties) for(const col of [0,1]){ g2.board[r][c]=col; const w=g2_present(g2.patA); g2.board[r][c]=null; if(w) threats.push([r,c,col]); }
  const skipBlock=Math.random()<cfg.skip;
  if(threats.length && !skipBlock){ for(const [r,c,col] of threats){ const blk=col^1;
    g2.board[r][c]=blk; const foe=g2_present(g2.patA); const me=g2_present(g2.patB); g2.board[r][c]=null;
    if(me) return g2_do(r,c,blk,'B'); if(!foe) return g2_do(r,c,blk,'B'); } }
  let best=null,bv=-1e9; const mid=(g2.size-1)/2; const useFork=Math.random()<cfg.fork;
  for(const [r,c] of empties) for(const col of [0,1]){ g2.board[r][c]=col; const foe=g2_present(g2.patA); let v=-1e9;
    if(!foe){ v=g2_progress(g2.patB)*10 - g2_progress(g2.patA)*2 - (Math.abs(r-mid)+Math.abs(c-mid))*0.3 + Math.random()*3;
      if(useFork){ const mine=g2_winningSpots(g2.patB,g2.patA).length, theirs=g2_winningSpots(g2.patA,g2.patB).length;
        if(mine>=2)v+=400; else if(mine===1)v+=40;
        if(theirs>=2)v-=500; else if(theirs===1)v-=60; } }
    g2.board[r][c]=null; if(v>bv){bv=v;best=[r,c,col];} }
  if(Math.random()<cfg.wander){ const safe=[]; for(const [r,c] of empties)for(const col of [0,1]){ g2.board[r][c]=col; const foe=g2_present(g2.patA); g2.board[r][c]=null; if(!foe)safe.push([r,c,col]); } if(safe.length) best=safe[(Math.random()*safe.length)|0]; }
  if(!best){ const e=empties[(Math.random()*empties.length)|0]; best=[e[0],e[1],0]; }
  g2_do(best[0],best[1],best[2],'B'); }

function g2_turnMsg(){ g2_patTurn(); const who=g2.turn==='A'?'<b class="blue">'+(g2.mode==='solo'?'나':'파랑')+'</b>':'<b class="red">'+(g2.mode==='solo'?'컴퓨터':'빨강')+'</b>';
  document.getElementById('g2patB').classList.toggle('thinking',g2.mode==='solo'&&g2.turn==='B');
  document.getElementById('g2turn').innerHTML=who+((g2.mode==='solo'&&g2.turn==='B')?' 생각 중…':' 놓을 차례!'); }
function g2_float(t){ const f=document.getElementById('g2float'); f.textContent=t; f.classList.remove('show'); void f.offsetWidth; f.classList.add('show'); }

/* 놀이 기록 요약 (혼자 하기 판) */
function g2_sessionSummary(){ const s=g2.stat; if(!s)return null; return {level:g2.level,moves:s.moves,threats:s.threats,blocks:s.blocks,accidental:s.accidental}; }

/* ---------- 등록 (게임 약속: games/registry.js) ---------- */
hwRegisterGame({
  id:'g2',order:2,
  title:'모양 만들기',age:'6세+',ages:['6-7','8+'],players:'1–2명',time:'5–8분',category:'패턴',hero:'내 줄은 잇고,<br>상대 줄은 막아봐!',description:'부엉이와 파랑새를 한 칸씩 놓아 내 목표 줄을 먼저 완성해요.',card:'목표 줄을 만들고 상대 줄을 막아요.',coverClass:'cover-pattern',cast:['owl','bluebird'],icon:'shapes',
  music:'pattern',questIcon:'shapes',
  defaults:{mode:'solo',level:1},
  levels:{1:'5×5 판에서 3칸 줄을 만들어요. 컴퓨터가 막기를 자주 놓쳐요.',2:'6×6 판에서 4칸 줄. 컴퓨터가 막기를 가끔 놓쳐요.',3:'7×7 큰 판에서 4칸 줄. 컴퓨터가 빠짐없이 막고 함정을 자주 노려요.'},
  rules:{ title:'모양 만들기', body:[
    ['1','위에 <b>내 목표 줄</b>과 <b>상대 목표 줄</b>이 있어요.'],
    ['2','아래에서 <b>부엉이나 파랑새를 골라</b> 빈 칸을 눌러요. 누구든 둘 다 놓을 수 있어요!'],
    ['3','<b>내 목표</b>와 똑같은 줄을 가로·세로·대각선으로 먼저 만들면 <b>이겨요!</b>'],
    ['i-wall','상대 줄이 거의 다 되면 <b>중간을 막아요.</b>'],
    ['i-warning','실수로 <b>상대 줄</b>을 만들면 상대가 이겨요. 조심!']]},
  guide:{art:'owl',
     line:'내 목표 순서를 기억하면서, 내 줄은 잇고 상대 줄은 막는 게임이에요.',
     areas:{obs:2,space:1,plan:2,self:2},
     steps:[['eye','목표 기억하기','부엉이·파랑새 순서를 머릿속에 담아요.'],['swap','두 줄 번갈아 보기','내 줄과 상대 줄을 모두 살펴요.'],['shield','놓을까 참을까','상대 줄이 완성되는 자리는 피하고 막아요.']],
     levels:[['쉬움','5×5 판, 3칸 줄, 컴퓨터가 막기를 자주 놓쳐요'],['보통','6×6 판, 4칸 줄, 컴퓨터가 막기를 가끔 놓쳐요'],['어려움','7×7 판, 빠짐없이 막고 함정을 자주 노려요']],
     signs:['놓기 전에 상대 목표 줄을 한 번 확인해요.','실수로 상대 줄을 만든 뒤, 다음 판에서 같은 실수가 줄어요.','내 줄보다 막는 게 급한 순간을 알아채요.'],
     talk:'“상대는 어떤 순서를 만들고 있을까?” 상대 입장에서 보게 하는 질문이 좋아요.'},
  insight(list,h){ const {add,ratio}=h;
      const threats=add(list,'threats'), blocks=add(list,'blocks'), acc=add(list,'accidental');
      const lines=[];
      lines.push(threats?`상대 줄이 완성되기 직전인 순간 <b>${threats}번 중 ${blocks}번</b>을 막았어요.`:'아직 상대 줄이 완성되기 직전까지 간 적이 없어요.');
      lines.push(acc?`실수로 상대 줄을 만들어 끝난 판은 <b>${acc}판</b>이에요.`:'실수로 상대 줄을 만든 판은 없어요.');
      return {lines,metric:l=>ratio(add(l,'blocks'),add(l,'threats')),metricName:'막은 비율',
        tip:threats&&blocks/threats<.5?'놓기 전에 “상대는 뭘 만들고 있을까?” 하고 상대 줄을 같이 봐 주세요.':'상대 줄을 막았을 때 “어떻게 알았어?” 하고 물어보세요.'};
    },
  mount(){
    const setup=document.getElementById('g2Setup'), game=document.getElementById('g2Game');
    if(setup)setup.innerHTML=`
    <div class="pagebar"><button onclick="backHub()" aria-label="놀이터로 돌아가기"><svg class="ui-icon" aria-hidden="true"><use href="#i-chevron-left"></use></svg></button><span>모양 만들기</span><button onclick="showRules('g2')" aria-label="게임 방법 보기">?</button></div>
    <div class="setup-card">
      <div class="intro">
        <div class="big-em duo-stage" id="g2SetupEm" aria-hidden="true"></div>
        <div class="intro-copy">
          <h2 class="game-title-heading"><button class="game-title-button" id="g2TitleBtn" aria-expanded="false" aria-controls="g2Thinking" onclick="toggleThinking('g2')"><span>모양 만들기 <i>i</i></span></button></h2>
          <small class="skill-hint">제목을 눌러 재미 포인트 보기</small>
          <p class="desc">부엉이와 파랑새를 한 칸씩 놓아 내 목표 줄을 먼저 만들고, 상대의 줄은 영리하게 막아요.</p>
          <div class="game-meta"><span>6세+</span><span><svg class="ui-icon" aria-hidden="true"><use href="#i-users"></use></svg>1–2명</span><span><svg class="ui-icon" aria-hidden="true"><use href="#i-clock"></use></svg>5–8분</span></div>
        </div>
      </div>
      <div class="thinking-panel" id="g2Thinking" hidden>
        <strong>이 게임의 재미 포인트</strong>
        <div class="thinking-grid">
          <div class="thinking-item"><b><svg class="ui-icon" aria-hidden="true"><use href="#i-sequence"></use></svg>순서 찾기</b><small>친구들이 놓인 순서를 맞춰요.</small></div>
          <div class="thinking-item"><b><svg class="ui-icon" aria-hidden="true"><use href="#i-eye"></use></svg>목표 확인</b><small>내가 만들 모양을 보고 자리를 찾아요.</small></div>
          <div class="thinking-item"><b><svg class="ui-icon" aria-hidden="true"><use href="#i-shield"></use></svg>상대 막기</b><small>상대 모양이 완성될 자리를 먼저 막아요.</small></div>
          <div class="thinking-item"><b><svg class="ui-icon" aria-hidden="true"><use href="#i-swap"></use></svg>두 모양 비교</b><small>내 모양과 상대 모양을 번갈아 살펴봐요.</small></div>
        </div>
      </div>
      <div class="difficulty-progress"><i><span id="g2LevelFill"></span></i><b id="g2LevelCount">1 / 3</b></div>
      <div class="choice-label"><span>몇 칸 모양에 도전할까요?</span><small>칸이 늘면 더 어려워져요</small></div>
      <div class="seg three" id="g2LevelSeg">
        <button data-lv="1" data-on="1" aria-pressed="true" onclick="setLevel('g2',1)"><b>쉬움</b><small>3칸 모양</small></button>
        <button data-lv="2" data-on="0" aria-pressed="false" onclick="setLevel('g2',2)"><b>보통</b><small>4칸 모양</small></button>
        <button data-lv="3" data-on="0" aria-pressed="false" onclick="setLevel('g2',3)"><b>어려움</b><small>큰 판·함정 조심</small></button>
      </div>
      <p class="level-note" id="g2LevelNote">5×5 판에서 3칸 모양을 만들어요.</p>
      <div class="row">
        <button class="btn blue big" onclick="g2Start('solo')">혼자 시작</button>
        <button class="btn red big" onclick="g2Start('duo')">둘이 시작</button>
      </div>
      <div class="foot"><button class="btn ghost" onclick="showRules('g2')">게임 방법 듣고 보기</button></div>
    </div>
  `;
    if(game)game.innerHTML=`
    <div class="patterns" id="g2pats"></div>
    <div class="turnmsg" id="g2turn" aria-live="polite"></div>
    <div class="board" id="g2board">
      <div class="grid2" id="g2grid"></div>
      <div class="floatmsg" id="g2float" aria-live="polite"></div>
    </div>
    <div class="picker2" id="g2picker"></div>
    <div class="foot">
      <button class="btn ghost" onclick="showRules('g2')">방법</button>
      <button class="btn ghost" onclick="backHub()">홈으로</button>
    </div>
  `;
    const em=document.getElementById('g2SetupEm'); if(em)em.innerHTML=hwChar('owl','full')+hwChar('bluebird','full');
  },
  /* 아이 기록 화면: 최고 기록(과거의 나와 비교)과 기록 배지 */
  record:{key:'blocks',label:'한 판에 막은 줄',unit:'번',goal:3,badge:'막기 대장'},
  start:g2Start,cancel:g2_cancel,summary:g2_sessionSummary
});
