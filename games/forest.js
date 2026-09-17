/*
 * 호플우드 숲 — 메타게임 (아이에게는 "내가 가꾸는 숲속 모험")
 * 흐름: 동물이 부탁 → 게임 한 판(3–5분) → 숲이 바로 바뀜 → 아이가 선물을 골라 직접 놓기 → 다음 친구의 반응·부탁
 * 그림: assets/art/forest/ (world-expansion-v1 납품분을 앱 크기로 줄임)
 *   map_forest.jpg(1080×1920 비율 지도) · stage_{pond,flower,bridge,house}_{before,after}.png(장소 섬)
 *   reward_*.png(선물 10종) · char_hopple_{ask,celebrate,surprised}.png(호플이 반응)
 * 의존 전역: hwChar, hwCharName, hwSay, hwHush, hwSfx, hwIcon, hwReadJSON, hwStore, showScreen, showProgress, showParent, goGames,
 *           recordCompletion, logSession, lastCfg, curGame, cancelAllGames, g1Start, g2Start, g3_start, g4_start, g5_start, g3_faceSVG
 */
(function(){
  const KEY='hw_forest_v1';
  const ART='assets/art/forest/';

  /* 지도 위 장소: box=[left, top, width, height] (지도 %, 지도 비율 1080×1920). 지도의 빈 공터·개울 건너는 자리에 맞춤 */
  const PLACES={
    pond:{name:'연잎 연못',box:[3,0.5,53,29.8]},
    flower:{name:'나비 꽃밭',box:[50,19.5,48,27]},
    bridge:{name:'개울 다리',box:[9,37,43,24.2]},
    house:{name:'비버네 집',box:[45,57.5,50,28.1]}
  };
  /* 부탁을 해결하면 이사 오는 친구들의 자리 (지도 %, 가로 크기 %) */
  const FRIEND_SPOTS={
    beaver:[62,79,13], frog:[35,16,12], duck:[8,20,11],
    squirrel:[47,50,11], hedgehog:[14,56,11], raccoon:[3,46,12],
    owl:[64,3,11], bluebird:[80,8,9],
    butterfly:[63,24,11], ladybug:[84,37,9],
    bee:[80,55,10], ant:[88,60,8]
  };
  /* 가면 축제 장식: 나뭇잎 깃발 두 개 사이에 줄을 걸고 곰·여우·판다 가면을 매단다 (지도 %) */
  const FESTIVAL={flags:[[50,42.5,10],[76,42.5,10]],masks:[[56.5,46.2,7.2],[62.6,47.3,7.2],[68.7,46.2,7.2]],picnic:[56,51,15],
    line:'M55.5 43.6 Q63.5 48.4 81.5 43.6'};

  /* 선물 */
  const GIFTS={
    lantern:{name:'버섯 등불',file:'reward_mushroom_lantern'},
    acorns:{name:'도토리 바구니',file:'reward_acorn_basket'},
    bench:{name:'통나무 벤치',file:'reward_log_bench'},
    birdhouse:{name:'새집',file:'reward_birdhouse'},
    flowerPot:{name:'꽃 화분',file:'reward_flower_pot'},
    picnic:{name:'소풍 담요',file:'reward_picnic_blanket'},
    leafFlag:{name:'나뭇잎 깃발',file:'reward_leaf_flag'},
    wateringCan:{name:'물뿌리개',file:'reward_watering_can'},
    berryBush:{name:'열매 덤불',file:'reward_berry_bush'},
    signpost:{name:'길 안내판',file:'reward_signpost'}
  };
  /* 예전 버전에서 놓은 선물 id → 새 선물 */
  const LEGACY_GIFT={flowerPink:'flowerPot',flowerYellow:'flowerPot',flowerPurple:'flowerPot',lilypad:'wateringCan',honey:'berryBush',logOrange:'bench',logGreen:'bench',mushroom:'lantern',stone:'signpost'};

  /* 부탁: 순서대로 열린다. level은 첫 해결 때 난이도, place는 열리는 장소, friends는 이사 오는 친구 */
  const QUESTS=[
    {id:'beaver',title:'비버네 집 짓기',mark:[66,62],who:'beaver',game:'g5',level:1,place:'house',
      ask:'비바람에 집이 무너졌어. 통나무 조각으로 빈틈 없이 집터를 채워 줄래?',
      thanks:'우와, 우리 집이 생겼어! 이제 여기서 살래. 고마워!',
      gifts:['bench','acorns','signpost'],friends:['beaver']},
    {id:'festival',title:'가면 축제 준비',mark:[60,40],who:'hopple',game:'g3',level:1,place:null,masks:true,
      ask:'곰·여우·판다가 가면 축제를 연대! 반쪽 가면의 꼭 맞는 짝을 찾아 줄래?',
      thanks:'짝꿍 가면을 다 찾았어! 가면 친구들이 숲에 놀러 왔어!',
      gifts:['leafFlag','picnic','lantern'],friends:[]},
    {id:'pond',title:'마른 연못 살리기',mark:[26,15],who:'frog',game:'g4',level:1,theme:'pond',place:'pond',
      ask:'연못이 말라 버렸어. 주사위로 더하기, 빼기를 해서 연잎 길을 이어 줄래?',
      thanks:'연못에 물이 찼어! 오리도 같이 이사 왔어!',
      gifts:['wateringCan','flowerPot','signpost'],friends:['frog','duck']},
    {id:'bridge',title:'개울 다리 놓기',mark:[26,42],who:'squirrel',game:'g1',level:1,place:'bridge',
      ask:'도토리를 옮기려면 개울을 건너야 해. 친구들 길을 잘 보고 먼저 건너가 볼래?',
      thanks:'다리가 생겼어! 고슴도치랑 너구리도 건너왔어!',
      gifts:['acorns','signpost','bench'],friends:['squirrel','hedgehog','raccoon']},
    {id:'together',title:'온 가족 쉼터 짓기',mark:[80,70],who:'beaver',game:'g5',level:2,place:null,coop:true,
      ask:'숲 친구들이 쉬어 갈 큰 쉼터를 지으려고 해. 엄마·아빠랑 번갈아 한 조각씩 놓아 줄래?',
      thanks:'둘이 힘을 합치니 쉼터가 금방 생겼어! 벤치랑 등불도 놓았어!',
      talk:'어떤 조각이 제일 어려웠는지, 어떻게 알아냈는지 서로 이야기해 봐요.',
      decor:[['bench',72,85,12],['lantern',88,74,9],['flowerPot',56,86,9]],
      gifts:['flowerPot','lantern','berryBush'],friends:[]},
    {id:'owl',title:'밤길 표시 만들기',mark:[70,13],who:'owl',game:'g2',level:1,place:null,
      ask:'밤에 길을 잃지 않게 표시를 만들래. 내 목표 줄을 먼저 완성해 줄래?',
      thanks:'나무 구멍에 새 둥지를 틀었어! 파랑새도 함께 왔어!',
      gifts:['birdhouse','lantern','leafFlag'],friends:['owl','bluebird']},
    {id:'flower',title:'빈 밭에 꽃 피우기',mark:[70,26],who:'butterfly',game:'g4',level:1,theme:'flower',place:'flower',
      ask:'빈 밭에 꽃을 피우고 싶어. 더하기, 빼기로 꽃 칸을 찾아 줄래?',
      thanks:'꽃밭이 활짝 피었어! 무당벌레도 이사 왔어!',
      gifts:['flowerPot','wateringCan','berryBush'],friends:['butterfly','ladybug']},
    {id:'hive',title:'꿀벌 길 잇기',mark:[84,50],who:'bee',game:'g4',level:1,theme:'hive',place:null,
      ask:'꿀을 모을 벌집 길이 필요해. 벌집 칸을 이어 줄래?',
      thanks:'꿀을 가득 모았어! 개미도 꿀 냄새를 맡고 왔어!',
      gifts:['berryBush','picnic','flowerPot'],friends:['bee','ant']}
  ];
  /* 모든 부탁을 해결한 뒤 이어지는 짧은 부탁 (선물만 받는다) */
  const REPEATS=[
    {who:'hopple',game:'g3',coop:true,title:'가족 가면 놀이',ask:'엄마·아빠랑 번갈아 가면 짝을 찾아볼래? 한 판씩 차례로 해요!',thanks:'둘 다 짝꿍 찾기 선수야!',talk:'어디가 달라서 알아챘는지 서로 말해 봐요.',gifts:['picnic','leafFlag','lantern']},
    {who:'beaver',game:'g5',title:'친구 집 한 채 더',ask:'친구 집도 지어 주고 싶어. 같이 한 채 더 지을래?',thanks:'집이 또 생겼어! 숲이 점점 북적북적해!',gifts:['bench','signpost','acorns']},
    {who:'hopple',game:'g3',title:'축제 가면 또 찾기',ask:'축제에 새 친구들이 왔어. 가면 짝을 또 찾아 줄래?',thanks:'이번에도 딱 맞았어!',gifts:['leafFlag','lantern','picnic']},
    {who:'duck',game:'g4',theme:'pond',title:'새 연잎 길 잇기',ask:'연못에 새 연잎이 생겼어. 연잎 길을 또 이어 볼래?',thanks:'첨벙! 오늘도 건넜어!',gifts:['wateringCan','flowerPot','berryBush']},
    {who:'hedgehog',game:'g1',title:'개울 건너기 시합',ask:'개울 건너기 시합 한 판 할래?',thanks:'휴, 재밌었다! 다리가 더 튼튼해졌어!',gifts:['acorns','bench','signpost']},
    {who:'bluebird',game:'g2',title:'등불 표시 하나 더',ask:'등불 표시를 하나 더 만들까?',thanks:'숲이 더 환해졌어!',gifts:['lantern','birdhouse','leafFlag']}
  ];
  const QUEST_ROUNDS={g3:{rounds:4},g5:{puzzles:1}};
  const GAME_NAME={g1:'길따라 쪼르르',g2:'모양 만들기',g3:'얼굴 짝꿍',g4:'숫자 징검다리',g5:'비버 집짓기'};
  const GAME_ICON={g1:'route',g2:'shapes',g3:'eye',g4:'sequence',g5:'puzzle'};

  const state=Object.assign({done:[],placed:[],repeatIndex:0,greeted:false,pendingGifts:null},hwReadJSON(KEY,{}));
  state.placed=state.placed.map(p=>({...p,gift:GIFTS[p.gift]?p.gift:(LEGACY_GIFT[p.gift]||'lantern')}));
  if(state.pendingGifts)state.pendingGifts=state.pendingGifts.map(g=>GIFTS[g]?g:(LEGACY_GIFT[g]||'lantern'));
  function save(){ hwStore(KEY,JSON.stringify(state)); }

  let active=null, patchBackup=null, placing=null, justOpened=null;

  function el(id){ return document.getElementById(id); }
  function nextQuest(){ return QUESTS.find(q=>!state.done.includes(q.id))||null; }
  /* 무료판: 열린 퀘스트가 끝나면 무료 게임으로 된 반복 퀘스트만 이어진다 */
  function currentRequest(){
    const q=nextQuest(); if(q&&hwQuestOpen(q.id))return q;
    const pool=REPEATS.filter(r=>hwGameOpen(r.game));
    const r=pool[state.repeatIndex%pool.length];
    return {...r,id:'repeat',level:null,place:null,friends:[]};
  }
  function residents(){ const set=new Set(); QUESTS.forEach(q=>{ if(state.done.includes(q.id))q.friends.forEach(f=>set.add(f)); }); return [...set]; }
  function placeOpen(place){ return QUESTS.some(q=>q.place===place&&state.done.includes(q.id)); }
  function markSpot(q){ if(q.mark)return q.mark; const f=FRIEND_SPOTS[q.who]; return f?[f[0]+f[2]/2,Math.max(2,f[1]-6)]:[50,80]; }
  function rewardText(q){
    const bits=[];
    if(q.place)bits.push(PLACES[q.place].name+' 열림');
    if(q.id==='festival')bits.push('가면 축제 장식');
    if(q.decor)bits.push('쉼터 장식');
    const newFriends=(q.friends||[]).filter(f=>f!==q.who||q.id!=='repeat');
    if(newFriends.length)bits.push('새 친구 '+newFriends.length);
    bits.push('선물 1개');
    return bits.join(' · ');
  }
  function whoName(id){ return id==='hopple'?'호플이':hwCharName(id); }
  function hoppleArt(pose){ return `<span class="hw-char full hw-art"><img src="${ART}char_hopple_${pose}.png" alt="" draggable="false"></span>`; }
  function whoArt(id,mood){ if(id==='hopple')return hoppleArt(mood==='happy'?'celebrate':'ask'); return hwChar(id,mood==='happy'?'happy':'full'); }
  function giftImg(id){ const g=GIFTS[id]||GIFTS.lantern; return `<img src="${ART}${g.file}.png" alt="" draggable="false">`; }

  /* ---------- 지도 그리기 ---------- */
  function renderMap(){
    const map=el('fwMap'); if(!map)return;
    let html=`<img class="fw-mapimg" src="${ART}map_forest.jpg" alt="" draggable="false">`;
    Object.entries(PLACES).forEach(([key,p])=>{
      const [x,y,w,h]=p.box, open=placeOpen(key), fresh=justOpened===key;
      html+=`<div class="fw-place fw-${key}" data-open="${open?'1':'0'}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%" aria-label="${p.name}${open?'':' (아직 준비 중)'}">`+
        `<img class="fw-stage before" src="${ART}stage_${key}_before.png" alt="" draggable="false">`+
        (open?`<img class="fw-stage after${fresh?' fw-reveal':''}" src="${ART}stage_${key}_after.png" alt="" draggable="false">`:'')+
        `</div>`;
    });
    if(state.done.includes('festival')){
      const pop=justOpened==='festival'?' fw-pop':'';
      html+=`<svg class="fw-festival-line${pop}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${FESTIVAL.line}" fill="none" stroke="#6b4a2f" stroke-width=".35" vector-effect="non-scaling-stroke"/></svg>`;
      FESTIVAL.flags.forEach(([x,y,w])=>{ html+=`<span class="fw-deco${pop}" style="left:${x}%;top:${y}%;width:${w}%">${giftImg('leafFlag')}</span>`; });
      html+=`<span class="fw-deco${pop}" style="left:${FESTIVAL.picnic[0]}%;top:${FESTIVAL.picnic[1]}%;width:${FESTIVAL.picnic[2]}%">${giftImg('picnic')}</span>`;
      if(typeof g3_faceSVG==='function'){
        const faces=[{species:'bear',head:'flower',ears:'pink',eyes:'smile',nose:'oval',mouth:'open',cheeks:'blush'},{species:'fox',head:'sprout',ears:'cream',eyes:'round',nose:'heart',mouth:'w',cheeks:'star'},{species:'panda',head:'tuft',ears:'pink',eyes:'sparkle',nose:'pink',mouth:'grin',cheeks:'blush'}];
        faces.forEach((f,i)=>{ const [x,y,w]=FESTIVAL.masks[i]; html+=`<span class="fw-mask${pop}" style="left:${x}%;top:${y}%;width:${w}%;--swing:${i%2?-4:4}deg">${g3_faceSVG(f,'full')}</span>`; });
      }
    }
    QUESTS.forEach(q=>{ if(!q.decor||!state.done.includes(q.id))return; const pop=justOpened===q.id?' fw-pop':'';
      q.decor.forEach(([gift,x,y,w])=>{ html+=`<span class="fw-deco${pop}" style="left:${x}%;top:${y}%;width:${w}%">${giftImg(gift)}</span>`; }); });
    const freshFriends=new Set(justOpened?((QUESTS.find(q=>q.id===justOpened||q.place===justOpened)||{}).friends||[]):[]);
    residents().forEach(id=>{ const s=FRIEND_SPOTS[id]; if(!s)return; html+=`<span class="fw-friend${freshFriends.has(id)?' fw-pop':''}" style="left:${s[0]}%;top:${s[1]}%;width:${s[2]}%">${hwChar(id,'full')}</span>`; });
    state.placed.forEach((p,i)=>{ html+=`<span class="fw-placed" style="left:${p.x}%;top:${p.y}%" data-i="${i}">${giftImg(p.gift)}</span>`; });
    html+=`<span class="fw-hopple" style="left:43%;top:88%">${hoppleArt(state.done.length?'celebrate':'ask')}</span>`;
    if(!state.pendingGifts&&!placing){
      const q=currentRequest(), [mx,my]=markSpot(q);
      html+=`<button type="button" class="fw-marker${q.coop?' coop':''}" style="left:${mx}%;top:${my}%" onclick="event.stopPropagation();hwForest.openQuest()" aria-label="퀘스트: ${q.title}"><span class="fw-marker-face">${q.who==='hopple'?hwChar('hopple','face'):hwChar(q.who,'face')}</span><b>!</b></button>`;
    }
    html+=`<div class="fw-place-hint" id="fwPlaceHint"${placing?'':' hidden'}>선물을 놓고 싶은 곳을 눌러요</div>`;
    map.innerHTML=html;
    map.dataset.placing=placing?'1':'0';
    const count=el('fwFriendCount'); if(count)count.textContent=String(residents().length+(state.done.includes('festival')?3:0));
    const openCount=el('fwAreaCount'); if(openCount)openCount.textContent=state.done.filter(id=>QUESTS.some(q=>q.id===id)).length+' / '+QUESTS.length;
  }

  function renderRequest(){
    const box=el('fwRequest'); if(!box)return;
    renderTrail();
    if(state.pendingGifts){
      box.dataset.kind='gift';
      box.innerHTML=`<div class="fw-req-art full">${hoppleArt('celebrate')}</div><div class="fw-req-body"><small>퀘스트 완료!</small><p>선물을 하나 골라 숲에 놓아 줘.</p></div>`;
      return;
    }
    const q=currentRequest();
    box.dataset.kind=q.coop?'coop':'quest';
    box.innerHTML=`<button type="button" class="fw-quest-open" onclick="hwForest.openQuest()" aria-label="퀘스트 열기: ${q.title}">
      <span class="fw-req-art full">${whoArt(q.who)}</span>
      <span class="fw-req-body">
        <small>${q.coop?'부모님과 함께 퀘스트':(q.id==='repeat'?'숲 퀘스트':'새 퀘스트')}</small>
        <b class="fw-quest-title">${q.title}</b>
        <span class="fw-quest-meta"><i>${hwIcon(GAME_ICON[q.game])}${GAME_NAME[q.game]}</i>${q.coop?`<i class="coop">${hwIcon('users')}같이 해요</i>`:''}</span>
        <span class="fw-quest-go">${hwIcon('play')} 퀘스트 보기</span>
      </span></button>`;
  }
  function renderTrail(){
    const t=el('fwTrail'); if(!t)return;
    const next=nextQuest();
    t.innerHTML=QUESTS.map((q,i)=>{
      const done=state.done.includes(q.id), now=next&&next.id===q.id&&hwQuestOpen(q.id);
      return `<li data-state="${done?'done':(now?'now':'lock')}"${q.coop?' data-coop="1"':''} aria-label="${i+1}번 퀘스트 ${done?q.title+' 완료':(now?q.title+' 진행 중':'아직 잠김')}">${done?hwChar(q.who==='hopple'?'hopple':q.who,'face'):(now?'!':hwIcon('lock'))}</li>`;
    }).join('');
  }
  function render(){ renderMap(); renderRequest(); }

  /* ---------- 부탁 시작과 끝 ---------- */
  function applyPatch(game){
    const p=QUEST_ROUNDS[game]; if(!p)return;
    if(game==='g3'&&typeof G3_LEVELS!=='undefined'){ patchBackup={game,values:{}}; Object.keys(G3_LEVELS).forEach(l=>{patchBackup.values[l]=G3_LEVELS[l].rounds; G3_LEVELS[l].rounds=p.rounds;}); }
    if(game==='g5'&&typeof G5_LEVELS!=='undefined'){ patchBackup={game,values:{}}; Object.keys(G5_LEVELS).forEach(l=>{patchBackup.values[l]=G5_LEVELS[l].puzzles; G5_LEVELS[l].puzzles=p.puzzles;}); }
  }
  function restorePatch(){
    if(!patchBackup)return;
    const {game,values}=patchBackup;
    if(game==='g3')Object.keys(values).forEach(l=>{G3_LEVELS[l].rounds=values[l];});
    if(game==='g5')Object.keys(values).forEach(l=>{G5_LEVELS[l].puzzles=values[l];});
    patchBackup=null;
  }
  function launch(q){
    curGame=q.game; /* g1Start·g2Start는 curGame을 직접 바꾸지 않으므로 먼저 정한다 */
    if(q.game==='g1')g1Start('solo');
    else if(q.game==='g2')g2Start('solo');
    else window[q.game+'_start']('solo');
  }
  function openQuest(){
    if(state.pendingGifts||placing)return;
    const q=currentRequest();
    hwSfx('tap');
    const gifts=(q.gifts||[]).map(g=>`<span>${giftImg(g)}</span>`).join('');
    overlay(`<div class="fw-quest-ribbon${q.coop?' coop':''}">${q.coop?'부모님과 함께 퀘스트':'퀘스트'}</div>
      <div class="fw-card-art">${whoArt(q.who)}</div>
      <small class="fw-card-who">${whoName(q.who)}의 부탁</small>
      <h2>${q.title}</h2>
      <p class="fw-quest-ask">${q.ask}</p>
      <div class="fw-quest-info"><span>${hwIcon(GAME_ICON[q.game])} ${GAME_NAME[q.game]}</span><span>${hwIcon('clock')} ${q.coop?'5분':'3분'}</span></div>
      <div class="fw-quest-reward"><b>${hwIcon('star')} 해내면</b><small>${rewardText(q)}</small><div class="fw-quest-gifts">${gifts}</div></div>
      <button class="btn blue big" onclick="hwForest.startQuest()">${q.coop?'같이 할게요!':'도와줄게!'}</button>
      <button class="btn ghost" onclick="hwForest.closeQuest()">나중에</button>`);
    hwSay(q.ask);
  }
  function showCoopTip(){
    const q=currentRequest();
    const steps=q.game==='g5'
      ?['아이가 먼저 조각 하나를 놓고, 다음엔 어른이 하나를 놓아요.','어른 차례에도 정답을 바로 놓기보다 "어디가 제일 좁아 보여?"처럼 물어봐 주세요.','막히면 조각을 빼고 다시 놓아도 괜찮아요.']
      :['한 판씩 번갈아 짝을 찾아요. 아이가 먼저 해요.','어른 차례에는 "나는 귀를 먼저 봤어"처럼 생각을 소리 내어 말해 주세요.','틀려도 "어디가 달랐을까?" 하고 같이 찾아봐요.'];
    overlay(`<div class="fw-quest-ribbon coop">부모님께</div>
      <div class="fw-coop-pair" aria-hidden="true"><span>${hwChar('hopple','face')}<b>아이</b></span><i>+</i><span class="adult">${hwIcon('parent')}<b>어른</b></span></div>
      <h2>번갈아 한 번씩!</h2>
      <ol class="fw-coop-steps">${steps.map(t=>`<li>${t}</li>`).join('')}</ol>
      <button class="btn blue big" onclick="hwForest.startQuest(true)">같이 시작!</button>
      <button class="btn ghost" onclick="hwForest.closeQuest()">다음에 같이 할게요</button>`);
    hwSay('엄마 아빠와 번갈아 한 번씩 해요. 아이가 먼저 시작해요!');
  }
  /* 함께 퀘스트: 화면 아래에 누구 차례인지 보여 주고, 조각을 놓거나(g5) 한 판이 끝날 때(g3) 차례를 바꾼다 */
  function renderCoop(bump){
    let b=el('fwCoop');
    if(!active||!active.coop){ if(b)b.remove(); document.body.classList.remove('fw-coop-on'); return; }
    if(!b){ b=document.createElement('div'); b.id='fwCoop'; b.className='fw-coop'; b.setAttribute('aria-live','polite'); document.body.appendChild(b); }
    document.body.classList.add('fw-coop-on');
    const kid=active.turn==='kid';
    b.innerHTML=`<span data-on="${kid?1:0}">${hwChar('hopple','face')}<b>아이 차례</b></span><span data-on="${kid?0:1}" class="adult">${hwIcon('parent')}<b>어른 차례</b></span>`;
    if(bump){ b.classList.remove('fw-bump'); void b.offsetWidth; b.classList.add('fw-bump'); hwSfx('tap'); }
  }
  function coopSwap(){ if(!active||!active.coop)return; active.turn=active.turn==='kid'?'adult':'kid'; renderCoop(true); }
  let coopHooked=false;
  function hookCoop(){
    if(coopHooked)return; coopHooked=true;
    if(typeof window.g5_placePiece==='function'){ const orig=window.g5_placePiece; window.g5_placePiece=function(){ const out=orig.apply(this,arguments); if(active&&active.coop&&curGame==='g5')coopSwap(); return out; }; }
    if(typeof window.g3_nextRound==='function'){ const orig=window.g3_nextRound; window.g3_nextRound=function(first){ if(!first&&active&&active.coop&&curGame==='g3')coopSwap(); return orig.apply(this,arguments); }; }
  }
  function startQuest(confirmed){
    const q=currentRequest();
    if(q.coop&&!confirmed){ showCoopTip(); return; }
    closeFw();
    hwSfx('tap'); hwHush();
    active={...q,losses:0,turn:'kid'};
    hookCoop();
    const cfg=lastCfg[q.game]||{};
    lastCfg[q.game]={...cfg,mode:'solo',level:q.level||cfg.level||1,...(q.theme?{theme:q.theme}:{})};
    applyPatch(q.game);
    launch(q);
    renderCoop(false);
  }
  function endQuest(){ restorePatch(); active=null; renderCoop(false); }

  /* 게임이 끝나면 부탁 진행 중일 때만 숲 결과 화면으로 보낸다 */
  const originalShowWin=window.showWin;
  window.showWin=function(winner,mode,emWin,opts){
    if(!active||curGame!==active.game||mode!=='solo')return originalShowWin(winner,mode,emWin,opts);
    recordCompletion(winner,mode); if(typeof logSession==='function')logSession(winner,mode);
    if(winner==='A'||active.losses>=1||active.coop)showResult(winner==='A'||active.coop);
    else{ active.losses++; showRetry(); }
  };

  function overlay(html){
    let o=el('fwOverlay');
    if(!o){ o=document.createElement('div'); o.id='fwOverlay'; o.className='overlay fw-overlay'; o.setAttribute('role','dialog'); o.setAttribute('aria-modal','true'); document.body.appendChild(o); }
    o.innerHTML=`<div class="card fw-card">${html}</div>`;
    if(typeof openOverlay==='function')openOverlay('fwOverlay'); else o.classList.add('on');
  }
  function closeFw(){ if(typeof closeOverlay==='function')closeOverlay('fwOverlay',false); else { const o=el('fwOverlay'); if(o)o.classList.remove('on'); } }

  function showRetry(){
    hwSfx('good');
    const line='아깝다! 거의 다 됐어. 한 번만 더 해 볼까?';
    overlay(`<div class="fw-card-art">${active.who==='hopple'?hoppleArt('surprised'):hwChar(active.who,'full')}</div><h2>${line}</h2>
      <button class="btn blue big" onclick="hwForest.retry()">한 번 더!</button>
      <button class="btn ghost" onclick="hwForest.home()">숲으로 돌아가기</button>`);
    hwSay(line);
  }
  function retry(){ closeFw(); if(active){ active.turn='kid'; launch(active); renderCoop(false); } }

  function showResult(won){
    const q=active;
    const line=won?q.thanks:'같이 힘을 모아서 해냈어! '+q.thanks;
    if(q.id==='repeat')state.repeatIndex++;
    else if(!state.done.includes(q.id))state.done.push(q.id);
    state.pendingGifts=q.gifts; save();
    const coopBadge=el('fwCoop'); if(coopBadge)coopBadge.remove(); document.body.classList.remove('fw-coop-on');
    hwSfx('win'); if(typeof confetti==='function')confetti();
    overlay(`<div class="fw-card-art">${whoArt(q.who,'happy')}</div>
      <small class="fw-card-who">${whoName(q.who)}</small><h2>${line}</h2>
      ${q.talk?`<p class="fw-talk">${hwIcon('parent')} ${q.talk}</p>`:''}
      <button class="btn blue big" onclick="hwForest.afterResult()">숲에 가 볼래!</button>`);
    hwSay(line);
  }
  function afterResult(){
    const q=active; closeFw();
    if(typeof cancelAllGames==='function')cancelAllGames();
    curGame=null; endQuest();
    justOpened=q&&q.id!=='repeat'?(q.place||q.id):null;
    showForest(false);
    const target=justOpened&&(document.querySelector('.fw-'+justOpened)||document.querySelector('.fw-friend.fw-pop,.fw-mask.fw-pop'));
    if(target){
      target.scrollIntoView({block:'center',behavior:'smooth'});
      showBubble(target,'우와! 숲이 바뀌었어!');
    }
    setTimeout(()=>{ justOpened=null; offerGifts(); },target?1800:400);
  }
  /* 호플이 놀람 반응 말풍선 */
  function showBubble(target,text){
    const map=el('fwMap'); if(!map||!target)return;
    const mr=map.getBoundingClientRect(), tr=target.getBoundingClientRect();
    const b=document.createElement('div'); b.className='fw-bubble';
    b.style.left=Math.max(2,Math.min(62,(tr.left-mr.left)/mr.width*100+10))+'%';
    b.style.top=Math.max(1,(tr.top-mr.top)/mr.height*100-2)+'%';
    b.innerHTML=`<span class="fw-bubble-art">${hoppleArt('surprised')}</span><b>${text}</b>`;
    map.appendChild(b); hwSfx('good'); hwSay(text);
    setTimeout(()=>b.remove(),2200);
  }

  /* ---------- 선물 고르기와 놓기 ---------- */
  function offerGifts(){
    const gifts=state.pendingGifts; if(!gifts)return;
    renderRequest();
    const sheet=el('fwGiftSheet'); if(!sheet)return;
    sheet.innerHTML=`<p>고마워! 선물을 하나 골라 숲에 놓아 줘.</p><div class="fw-gifts">${gifts.map(id=>`<button class="fw-gift" onclick="hwForest.pickGift('${id}')"><span>${giftImg(id)}</span><small>${GIFTS[id].name}</small></button>`).join('')}</div>`;
    sheet.hidden=false;
    sheet.scrollIntoView({block:'center',behavior:'smooth'});
    hwSay('선물을 하나 골라 숲에 놓아 줘.');
  }
  function pickGift(id){
    if(!state.pendingGifts||!state.pendingGifts.includes(id))return;
    placing=id; hwSfx('tap');
    const sheet=el('fwGiftSheet'); if(sheet)sheet.hidden=true;
    renderMap();
    const map=el('fwMap'); if(map)map.scrollIntoView({block:'center',behavior:'smooth'});
    hwSay('선물을 놓고 싶은 곳을 눌러요.');
  }
  function onMapTap(ev){
    if(!placing)return;
    const map=el('fwMap'), r=map.getBoundingClientRect();
    const x=Math.max(1,Math.min(88,(ev.clientX-r.left)/r.width*100-6)), y=Math.max(1,Math.min(94,(ev.clientY-r.top)/r.height*100-4));
    state.placed.push({gift:placing,x:Math.round(x*10)/10,y:Math.round(y*10)/10});
    if(state.placed.length>40)state.placed.shift();
    placing=null; state.pendingGifts=null; save(); hwSfx('place');
    renderMap();
    const last=[...el('fwMap').querySelectorAll('.fw-placed')].pop(); if(last)last.classList.add('fw-pop');
    setTimeout(nextEvent,700);
  }
  function nextEvent(){
    renderRequest();
    const q=currentRequest(), box=el('fwRequest');
    if(box){ box.classList.remove('fw-bump'); void box.offsetWidth; box.classList.add('fw-bump'); box.scrollIntoView({block:'nearest',behavior:'smooth'}); }
    hwSay((q.coop?'부모님과 함께하는 퀘스트가 생겼어!':'새 퀘스트가 생겼어!')+' 숲에서 느낌표를 눌러 봐!');
    const m=document.querySelector('.fw-marker'); if(m)m.classList.add('fw-pop');
  }

  /* ---------- 화면 ---------- */
  function showForest(offer=true){
    if(typeof showScreen==='function')showScreen('forestScreen');
    render();
    if(offer&&state.pendingGifts&&!placing)setTimeout(offerGifts,300);
    if(!state.greeted){ state.greeted=true; save(); setTimeout(()=>hwSay('안녕! 나는 호플이야. 숲 친구들이 도움이 필요해. 부탁을 들어줄래?'),400); }
  }
  function home(){ closeFw(); if(typeof cancelAllGames==='function')cancelAllGames(); curGame=null; endQuest(); showForest(); }

  function mount(){
    const screen=el('forestScreen'); if(!screen)return;
    screen.innerHTML=`
      <header class="platform-header">
        <div class="platform-brand" aria-label="호플우드"><span class="brand-mascot" aria-hidden="true">${hwChar('hopple','face')}</span><span><small>HOPPLEWOOD</small><b>호플우드 숲</b></span></div>
        <div class="platform-actions">
          <button class="square-btn setting-btn" data-setting="music" onclick="hwToggleSetting('music')" aria-label="배경음악 켜고 끄기">${hwIcon('music')}<span class="sr-only" data-setting-label>배경음악</span></button>
          <button class="square-btn setting-btn" data-setting="voice" onclick="hwToggleSetting('voice')" aria-label="읽어주기 켜고 끄기">${hwIcon('speak')}<span class="sr-only" data-setting-label>읽어주기</span></button>
          <button class="square-btn setting-btn" data-setting="sound" onclick="hwToggleSetting('sound')" aria-label="효과음 켜고 끄기">${hwIcon('sound')}<span class="sr-only" data-setting-label>효과음</span></button>
        </div>
      </header>
      <div class="fw-stats"><span>${hwIcon('users')} 숲 친구 <b id="fwFriendCount">0</b></span><span>${hwIcon('house')} 퀘스트 <b id="fwAreaCount">0</b></span></div>
      <section class="fw-request" id="fwRequest" aria-live="polite"></section>
      <ol class="fw-trail" id="fwTrail" aria-label="숲 퀘스트 길"></ol>
      <div class="fw-map" id="fwMap" role="img" aria-label="호플우드 숲 지도"></div>
      <section class="fw-gift-sheet" id="fwGiftSheet" hidden></section>
      <button class="btn ghost fw-all-games" onclick="goGames()">${hwIcon('gamepad')} 모든 놀이 보기</button>
      <nav class="bottom-nav" aria-label="주요 메뉴">
        <button class="active" onclick="hwForest.home()"><span aria-hidden="true">${hwIcon('home')}</span>숲</button>
        <button onclick="goGames()"><span aria-hidden="true">${hwIcon('gamepad')}</span>놀이</button>
        <button onclick="showProgress()"><span aria-hidden="true">${hwIcon('trophy')}</span>기록</button>
        <button onclick="showParent()"><span aria-hidden="true">${hwIcon('parent')}</span>부모님</button>
      </nav>`;
    el('fwMap').addEventListener('click',onMapTap);
    if(typeof hwSyncSettings==='function')hwSyncSettings();
    render();
  }

  window.hwForest={mount,showForest,refresh:()=>render(),openQuest,closeQuest:()=>closeFw(),startQuest,retry,home,afterResult,pickGift,
    isQuestActive:()=>Boolean(active), abortQuest:endQuest,
    reset:()=>{ Object.assign(state,{done:[],placed:[],repeatIndex:0,greeted:false,pendingGifts:null}); save(); render(); },
    state:()=>JSON.parse(JSON.stringify(state)), QUESTS, REPEATS, PLACES, FRIEND_SPOTS};
})();
