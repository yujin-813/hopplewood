/*
 * 얼굴 짝꿍 — 호플우드 게임 3 (관찰 게임)
 * 큰 카드에 얼굴 반쪽이 보이고, 후보 반쪽들은 머리·귀·눈·코·입(·볼) 중 한 곳만 다르다.
 * 정답을 보여주지 않고, 틀리면 "어느 쪽이 달랐는지"만 알려 스스로 비교하게 한다.
 * 의존 전역: showScreen, showWin, lastCfg, curGame, LEVEL_INFO, RULES, hwChar, hwSfx, hwSay, hwSetupMarkup
 */

const G3_SPECIES={
  bear:{name:'곰',base:'#d69a64',ear:'#c3834f',muzzle:'#f3d9b5',tuft:'#a86c3d'},
  fox:{name:'여우',base:'#ef8a3c',ear:'#e27a2c',muzzle:'#fff4e6',tuft:'#c9621f'},
  panda:{name:'판다',base:'#fbfbf6',ear:'#3b3b40',muzzle:'#ffffff',tuft:'#55555c'}
};
const G3_ZONES={
  head:{label:'머리',variants:['sprout','tuft','band','flower'],band:[0,37]},
  ears:{label:'귀',variants:['pink','cream','dots','stripe'],band:[17,38]},
  eyes:{label:'눈',variants:['round','sparkle','smile','sleepy','lash'],band:[38,58]},
  nose:{label:'코',variants:['oval','heart','triangle','pink'],band:[55,72]},
  mouth:{label:'입',variants:['w','open','o','teeth','grin'],band:[65,83]},
  cheeks:{label:'볼',variants:['blush','freckle','star','none'],band:[58,75]}
};
const G3_DEFAULTS={head:'tuft',ears:'pink',eyes:'round',nose:'oval',mouth:'w',cheeks:'blush'};
/* similar: 가짜 후보를 정답과 "비슷하게 보이는" 모양으로 고를 확률 (-1이면 가장 다르게 보이는 모양).
   rareZones: 한 판에 한 번까지만 쓰는 쉬운 부위 (머리 장식은 크게 달라 보여서 어려움에서는 아껴 쓴다) */
const G3_LEVELS={
  1:{zones:['head','ears','mouth'],choices:3,rounds:6,similar:-1,rareZones:[]},
  2:{zones:['head','ears','eyes','nose','mouth'],choices:4,rounds:8,similar:.2,rareZones:[]},
  3:{zones:['head','ears','eyes','nose','mouth','cheeks'],choices:6,rounds:10,similar:1,rareZones:['head','cheeks']}
};
/* 부위 모양끼리 달라 보이는 정도: 최종 납품 레이어로 곰·여우·판다 반쪽 카드 픽셀 차이를 재서 평균낸 값 (작을수록 비슷함) */
const G3_LOOK_DIFF={head:{'sprout|tuft':1051,'sprout|band':2081,'sprout|flower':1999,'tuft|band':1866,'tuft|flower':1786,'band|flower':2683},
  ears:{'pink|cream':606,'pink|dots':514,'pink|stripe':409,'cream|dots':171,'cream|stripe':421,'dots|stripe':412},
  eyes:{'round|sparkle':163,'round|smile':403,'round|sleepy':379,'round|lash':334,'sparkle|smile':449,'sparkle|sleepy':422,'sparkle|lash':392,'smile|sleepy':233,'smile|lash':478,'sleepy|lash':471},
  nose:{'oval|heart':198,'oval|triangle':126,'oval|pink':267,'heart|triangle':145,'heart|pink':310,'triangle|pink':266},
  mouth:{'w|open':191,'w|o':262,'w|teeth':217,'w|grin':263,'open|o':266,'open|teeth':256,'open|grin':149,'o|teeth':212,'o|grin':307,'teeth|grin':297},
  cheeks:{'blush|freckle':958,'blush|star':978,'blush|none':944,'freckle|star':519,'freckle|none':131,'star|none':499}};
function g3_lookDiff(zone,a,b){ const t=G3_LOOK_DIFF[zone]||{}; return t[a+'|'+b]??t[b+'|'+a]??500; }
function g3_pickVariant(zone,target,options,similar){
  const sorted=options.slice().sort((a,b)=>g3_lookDiff(zone,target,a)-g3_lookDiff(zone,target,b));
  const half=Math.max(1,Math.ceil(sorted.length/2));
  if(similar<0)return g3_pick(sorted.slice(-half));
  if(Math.random()<similar)return g3_pick(sorted.slice(0,half));
  return g3_pick(sorted);
}

const g3={mode:'solo',level:1,round:0,turn:'A',score:{A:0,B:0},sparkles:{A:0,B:0},target:null,side:'left',choices:[],answer:0,tries:0,locked:false,runId:0,wrongZone:null};

function g3_el(id){ return document.getElementById(id); }
function g3_later(callback,delay){ const runId=g3.runId; return setTimeout(()=>{ if(g3.runId===runId&&curGame==='g3')callback(); },delay); }
function g3_cancel(){ g3.runId++; g3.locked=true; }
function g3_pick(list){ return list[(Math.random()*list.length)|0]; }
function g3_shuffle(list){ const a=list.slice(); for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];} return a; }

/* ---------- 얼굴 그리기 ---------- */
/* 납품받은 부위 레이어(1000×880, 가운데 x=500)를 겹쳐 얼굴을 만든다.
   겹침 순서: 얼굴 바탕 → 귀 안쪽 → 볼 → 눈 → 코 → 입 → 머리 장식
   (귀 안쪽을 바탕보다 먼저 깔면 가려지므로 바탕 위에 올린다. 판다는 검은 무늬 때문에 전용 눈을 쓴다.) */
const G3_ART='assets/art/face/';
const G3_FILE={
  ears:{pink:'pink',cream:'cream',dots:'dot',stripe:'stripe'},
  nose:{oval:'oval',heart:'heart',triangle:'tri',pink:'pink'},
  mouth:{w:'omega',open:'open',o:'o',teeth:'teeth',grin:'grin'}
};
function g3_layers(f){
  const sp=f.species, list=['face_'+sp+'_base','face_'+sp+'_ears_'+G3_FILE.ears[f.ears]];
  if(f.cheeks&&f.cheeks!=='none')list.push('face_cheek_'+f.cheeks);
  list.push('face_eyes_'+f.eyes); /* 최종 납품(v2)은 판다도 공용 눈을 쓴다 (판다 전용 눈은 대비 검사를 통과해 생략) */
  list.push('face_nose_'+G3_FILE.nose[f.nose],'face_mouth_'+G3_FILE.mouth[f.mouth],'face_hair_'+f.head);
  return list;
}
/* side: 'left' | 'right' | 'full'. 반쪽은 두 배 넓이의 레이어 상자를 잘라서 보여준다. */
function g3_faceSVG(f,side,extra){
  const imgs=g3_layers(f).map(n=>'<img src="'+G3_ART+n+'.png" alt="" draggable="false" decoding="async">').join('');
  return '<span class="g3-face-art '+side+'" aria-hidden="true"><span class="g3-face-layers">'+imgs+'</span>'+(extra||'')+'</span>';
}

/* ---------- 라운드 만들기 ---------- */
/* 그림에서 실제로 구별되지 않는 조합은 가짜 후보로 만들지 않는다 (최종 납품 v2 레이어 픽셀 비교 결과).
   - 머리띠가 귀 안쪽을 덮는다 → 머리띠 얼굴에서는 귀만 다른 후보 금지 */
function g3_visibleDiff(target,zone,variant){
  if(zone==='ears'&&target.head==='band')return false;
  return true;
}
function g3_sameFace(a,b){ return Object.keys(G3_DEFAULTS).every(k=>a[k]===b[k])&&a.species===b.species; }
function g3_makeTarget(){
  const f={species:g3_pick(Object.keys(G3_SPECIES)),...G3_DEFAULTS};
  G3_LEVELS[g3.level].zones.forEach(zone=>{ f[zone]=g3_pick(G3_ZONES[zone].variants); });
  return f;
}
function g3_buildRound(){
  const cfg=G3_LEVELS[g3.level], target=g3_makeTarget(), faces=[{...target,diff:null}];
  const usedRare=new Set();
  let zoneOrder=g3_shuffle(cfg.zones), guard=0;
  while(faces.length<cfg.choices&&guard++<200){
    if(!zoneOrder.length)zoneOrder=g3_shuffle(cfg.zones);
    const zone=zoneOrder.shift();
    if(cfg.rareZones.includes(zone)&&usedRare.has(zone)&&guard<150)continue;
    const options=G3_ZONES[zone].variants.filter(v=>v!==target[zone]&&g3_visibleDiff(target,zone,v));
    if(!options.length)continue;
    const candidate={...target,[zone]:g3_pickVariant(zone,target[zone],options,cfg.similar),diff:zone};
    if(!faces.some(face=>g3_sameFace(face,candidate))){ faces.push(candidate); usedRare.add(zone); }
  }
  const order=g3_shuffle(faces);
  g3.target=target;
  g3.side=Math.random()<.5?'left':'right';
  g3.choices=order;
  g3.answer=order.findIndex(face=>face.diff===null);
  g3.tries=0; g3.wrongZone=null;
}

/* ---------- 화면 ---------- */
function g3_openSetup(){ openSetup('g3'); }
function g3_start(mode){
  g3.runId++;
  curGame='g3';
  g3.mode=mode==='duo'?'duo':'solo';
  g3.level=(lastCfg.g3&&lastCfg.g3.level)||1;
  lastCfg.g3={mode:g3.mode,level:g3.level}; savePreferences();
  g3.stat={rounds:0,first:0,wrongZones:{}};
  g3.round=0; g3.turn='A'; g3.score={A:0,B:0}; g3.sparkles={A:0,B:0}; g3.locked=false;
  showScreen('g3Game');
  g3_nextRound(true);
}
function g3_restart(){ g3_start(g3.mode); }

function g3_nextRound(first){
  g3.round++;
  if(g3.mode==='duo')g3.turn=g3.round%2===1?'A':'B';
  g3_buildRound();
  g3.locked=false;
  g3_render();
  const other=g3.side==='left'?'오른쪽':'왼쪽';
  const who=g3.mode==='duo'?(g3.turn==='A'?'파랑 차례! ':'빨강 차례! '):'';
  g3_guide(who+'이 얼굴과 꼭 맞는 '+other+' 반쪽을 골라요.');
  if(first){
    hwSay('큰 카드의 반쪽 얼굴을 잘 보고, 꼭 맞는 '+other+' 반쪽을 찾아요.');
    if(typeof hwCoach==='function')g3_later(()=>hwCoach('g3',[
      {el:'#g3Stage',text:'큰 카드에 얼굴 반쪽이 있어요. 머리, 귀, 눈, 코, 입을 잘 봐요.'},
      {el:'#g3Choices',text:'아래 반쪽들은 딱 한 곳씩 달라요. 똑같은 짝을 찾아 눌러요.'}
    ]),350);
  }else if(g3.mode==='duo')hwSay(who);
}

function g3_guide(text){ const guide=g3_el('g3Guide'); if(guide)guide.textContent=text; }

function g3_render(){
  const cfg=G3_LEVELS[g3.level];
  const progress=g3_el('g3Progress');
  if(progress){
    let dots='';
    for(let i=1;i<=cfg.rounds;i++)dots+=`<i data-state="${i<g3.round?'done':(i===g3.round?'now':'todo')}"></i>`;
    progress.innerHTML=`<span class="g3-round">${g3.round} / ${cfg.rounds}</span><span class="g3-dots">${dots}</span>`;
  }
  const scores=g3_el('g3Scores');
  if(scores){
    if(g3.mode==='solo')scores.innerHTML=`<div class="g3-score solo"><span class="g3-score-art">${hwChar('hopple','face')}</span><span><small>반짝 한 번에 찾기</small><b>${g3.sparkles.A}</b></span></div>`;
    else scores.innerHTML=['A','B'].map(t=>`<div class="g3-score ${t==='A'?'blue':'red'}" data-turn="${g3.turn===t?'1':'0'}"><span><small>${t==='A'?'파랑':'빨강'}</small><b>${g3.score[t]}점</b></span></div>`).join('');
  }
  const stage=g3_el('g3Stage');
  if(stage){
    const known=g3_faceSVG(g3.target,g3.side,g3_zoneOverlay());
    const empty=`<span class="g3-empty" aria-hidden="true"><b>?</b><small>짝을 찾아요</small></span>`;
    stage.dataset.joined='0';
    stage.innerHTML=`<div class="g3-slot ${g3.side==='left'?'known':'open'}">${g3.side==='left'?known:empty}</div><div class="g3-slot ${g3.side==='right'?'known':'open'}">${g3.side==='right'?known:empty}</div><span class="g3-seam" aria-hidden="true"></span>`;
    stage.setAttribute('aria-label',G3_SPECIES[g3.target.species].name+' 얼굴의 '+(g3.side==='left'?'왼쪽':'오른쪽')+' 반쪽');
  }
  const list=g3_el('g3Choices');
  if(list){
    const otherSide=g3.side==='left'?'right':'left';
    list.dataset.count=String(g3.choices.length);
    g3_el('g3Game').dataset.count=String(g3.choices.length);
    list.innerHTML='';
    g3.choices.forEach((face,index)=>{
      const button=document.createElement('button');
      button.type='button'; button.className='g3-choice'; button.dataset.state='idle';
      button.setAttribute('aria-label','반쪽 후보 '+(index+1));
      button.innerHTML=g3_faceSVG(face,otherSide)+`<span class="g3-choice-no">${index+1}</span>`;
      button.addEventListener('click',()=>g3_choose(index));
      list.appendChild(button);
    });
  }
}
function g3_zoneOverlay(){
  if(!g3.wrongZone)return '';
  /* band: 부위가 캔버스(1000×880)에서 차지하는 세로 범위 %, 최종 납품 레이어를 측정해 정함 */
  const [top,bottom]=G3_ZONES[g3.wrongZone].band, height=bottom-top;
  return `<span class="g3-zone-hint" style="top:${top.toFixed(1)}%;height:${height.toFixed(1)}%"></span>`;
}

function g3_choose(index){
  if(g3.locked)return;
  const button=g3_el('g3Choices').children[index], face=g3.choices[index];
  if(!button||button.dataset.state==='wrong')return;
  if(index===g3.answer){
    g3.locked=true;
    const first=g3.tries===0, team=g3.mode==='duo'?g3.turn:'A';
    g3.score[team]+=first?2:1; if(first)g3.sparkles[team]++;
    if(g3.stat&&g3.mode==='solo'){ g3.stat.rounds++; if(first)g3.stat.first++; }
    button.dataset.state='right';
    const stage=g3_el('g3Stage'), open=stage.querySelector('.g3-slot.open');
    if(open){ open.innerHTML=g3_faceSVG(g3.target,g3.side==='left'?'right':'left'); open.classList.add('filled'); }
    stage.querySelectorAll('.g3-zone-hint').forEach(n=>n.remove());
    stage.dataset.joined='1';
    hwSfx('good');
    g3_float(first?'반짝! 한 번에 찾았어요':'딱 맞았어요!');
    g3_guide(first?'눈이 정말 좋아요! 한 번에 찾았어요.':'끝까지 비교해서 찾았어요!');
    hwSay(first?'반짝! 한 번에 찾았어요.':'딱 맞았어요!');
    g3_render_scores_only();
    g3_later(()=>{ if(g3.round>=G3_LEVELS[g3.level].rounds)g3_finish(); else g3_nextRound(false); },1500);
    return;
  }
  g3.tries++;
  if(g3.stat&&g3.mode==='solo'&&face.diff)g3.stat.wrongZones[face.diff]=(g3.stat.wrongZones[face.diff]||0)+1;
  button.dataset.state='wrong';
  hwSfx('oops');
  if(g3.tries===1){
    g3_guide('조금 달라요. 큰 카드와 한 곳씩 다시 비교해 봐요.');
    hwSay('조금 달라요. 다시 비교해 봐요.');
  }else{
    g3.wrongZone=face.diff;
    const label=G3_ZONES[face.diff].label;
    g3_guide('방금 고른 반쪽은 '+hwJosa(label,'이/가')+' 달랐어요. 큰 카드의 '+label+' 쪽을 자세히 봐요.');
    hwSay(label+' 쪽을 자세히 봐요.');
    const known=g3_el('g3Stage').querySelector('.g3-slot.known');
    if(known)known.innerHTML=g3_faceSVG(g3.target,g3.side,g3_zoneOverlay());
  }
}
function g3_render_scores_only(){
  const scores=g3_el('g3Scores'); if(!scores)return;
  if(g3.mode==='solo'){ const b=scores.querySelector('b'); if(b)b.textContent=String(g3.sparkles.A); }
  else scores.querySelectorAll('.g3-score').forEach((node,i)=>{ const t=i===0?'A':'B'; const b=node.querySelector('b'); if(b)b.textContent=g3.score[t]+'점'; });
}
function g3_float(text){ const f=g3_el('g3Float'); if(!f)return; f.textContent=text; f.classList.remove('show'); void f.offsetWidth; f.classList.add('show'); }

function g3_finish(){
  g3.locked=true;
  const total=G3_LEVELS[g3.level].rounds, art=`<span class="g3-win-face">${g3_faceSVG(g3.target,'full')}</span>`;
  if(g3.mode==='solo'){
    showWin('A','solo',art,{title:'얼굴 '+total+'개를 모두 찾았어요!',sub:'그중 '+g3.sparkles.A+'개는 한 번에 찾았어요.'});
    return;
  }
  const {A,B}=g3.score, winner=A===B?null:(A>B?'A':'B');
  showWin(winner,'duo',art,{sub:'파랑 '+A+'점 · 빨강 '+B+'점'});
}

function g3_sessionSummary(){ const s=g3.stat; if(!s)return null; return {level:g3.level,rounds:s.rounds,first:s.first,wrongZones:s.wrongZones}; }

/* ---------- 공통 등록 ---------- */
(function g3_register(){
  LEVEL_INFO.g3={
    1:'곰·여우·판다의 머리, 귀, 입을 비교해요. 후보 3개 중에서 찾아요.',
    2:'눈과 코까지 비교해요. 후보 4개 중에서 찾아요.',
    3:'볼 무늬까지 살펴봐요. 후보 6개가 모두 정답과 아주 닮은 가짜예요.'
  };
  RULES.g3={title:'얼굴 짝꿍',body:[
    ['1','큰 카드에 <b>얼굴 반쪽</b>이 있어요. 나머지 반쪽은 비어 있어요.'],
    ['2','아래 후보들은 <b>머리·귀·눈·코·입</b> 중 딱 한 곳만 달라요.'],
    ['i-eye','큰 카드와 한 곳씩 비교해서 <b>꼭 같은 짝</b>을 눌러요.'],
    ['i-sparkles','한 번에 찾으면 <b>반짝 별</b>! 틀려도 괜찮아요. 어디가 달랐는지 알려줄게요.'],
    ['i-users','둘이 하면 번갈아 찾아요. 한 번에 찾으면 2점, 다시 찾으면 1점!']
  ]};
  const setup=g3_el('g3Setup');
  if(setup)setup.innerHTML=hwSetupMarkup({
    id:'g3',title:'얼굴 짝꿍',
    art:`<span class="g3-intro-card">${g3_faceSVG({species:'bear',...G3_DEFAULTS,head:'sprout'},'left')}<span class="g3-intro-q">?</span></span>`,
    desc:'큰 카드의 얼굴 반쪽을 보고, 딱 한 곳씩 다른 반쪽들 중에서 꼭 맞는 짝을 찾아요.',
    age:'5세+',players:'1–2명',time:'3–6분',
    points:[['eye','한 곳씩 비교','머리부터 입까지 차례로 봐요.'],['puzzle','반쪽 맞추기','두 반쪽을 붙여 얼굴을 완성해요.'],['target','다른 곳 찾기','딱 한 곳만 다른 가짜를 골라내요.'],['sparkles','반짝 별','한 번에 찾으면 별을 모아요.']],
    levelQuestion:'얼마나 자세히 볼까요?',levelHint:'단계마다 비교할 곳과 후보가 늘어요',
    levels:[['쉬움','후보 3 · 머리·귀·입'],['보통','후보 4 · 눈·코 추가'],['어려움','후보 6 · 아주 닮은 가짜']]
  });
  const game=g3_el('g3Game');
  if(game)game.innerHTML=`
    <div class="pagebar"><button onclick="backHub()" aria-label="홈으로 돌아가기">${hwIcon('chevron-left')}</button><span>얼굴 짝꿍</span><button onclick="showRules('g3')" aria-label="게임 방법 보기">?</button></div>
    <div class="g3-top"><div class="g3-progress" id="g3Progress"></div><div class="g3-scores" id="g3Scores"></div></div>
    <button class="turnmsg g3-guide say-line" id="g3Guide" aria-live="polite" onclick="hwSay(this.textContent,true)"></button>
    <section class="g3-table">
      <div class="g3-stage" id="g3Stage" role="img"></div>
      <div class="floatmsg" id="g3Float" aria-live="polite"></div>
    </section>
    <div class="g3-choices" id="g3Choices" role="group" aria-label="반쪽 후보"></div>
    <div class="foot"><button class="btn ghost" onclick="showRules('g3')">방법</button><button class="btn ghost" onclick="backHub()">홈으로</button></div>`;
})();
