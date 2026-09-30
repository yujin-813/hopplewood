/*
 * 호플우드 숲 — 메타게임 (아이에게는 "내가 가꾸는 숲속 모험")
 * 흐름: 동물이 부탁 → 게임 한 판(3–5분) → 숲이 바로 바뀜 → 아이가 선물을 골라 직접 놓기 → 다음 친구의 반응·부탁
 * 지역(ADR-0004): 지역마다 지도 1장·장소 섬·친구 자리·선물 자리·퀘스트를 가진다. 지도 위 표지판과 지역 탭으로 오간다.
 *   숲(forest)      map_forest_v2.jpg  (map_forest.jpg는 소개 페이지 start.html·스토어 그림에서 계속 쓴다) · stage_{pond,flower,bridge,house}_{before,after}.png
 *   개울가(riverside) map_riverside.jpg · stage_{beach,garden,appletree}_{before,after}.png — 섬 그림 안에 친구들이 그려져 있다
 * 확장(ADR-0005): 지역은 안개(아직 없음) → 길 막힘(unlock 부탁 전) → 열림 → 완성 순서로 보인다.
 *   안개 너머(FOG)는 지도 없이 탭과 이야기 카드로만 암시한다. 날짜·가격은 약속하지 않는다.
 * 그림: assets/art/forest/ (world-expansion-v1, forest-map-v2 납품분을 앱 크기로 줄임)
 *   reward_*.png(선물 10종) · char_hopple_{ask,celebrate,surprised}.png(호플이 반응)
 * 의존 전역: hwChar, hwCharName, hwSay, hwHush, hwSfx, hwIcon, hwReadJSON, hwStore, showScreen, showProgress, showParent, goGames,
 *           recordCompletion, logSession, lastCfg, curGame, cancelAllGames, HW_GAMES(게임 시작·이름), g3_faceSVG(가면 축제 장식)
 */
(function(){
  const KEY='hw_forest_v1';
  const ART='assets/art/forest/';

  /* 지역. 좌표는 모두 지도 % (지도 비율 1080×1920)
     places: 장소 섬 box=[left, top, width, height] — 섬 그림은 정사각형이라 height = width × 0.5625
     friends: 부탁을 해결하면 이사 오는 친구 [left, top, 가로 크기]. 섬 그림에 이미 그려진 친구는 적지 않는다
     gifts: 선물을 놓는 자리 [가운데 x, 발밑 y]. 길·마당·잔디처럼 빈 바닥에만, 섬·친구·표시와 겹치지 않게
     sign: 다른 지역으로 가는 표지판
     unlock: 이 부탁을 해결해야 길이 열린다 (이야기로 이어지게: 개울 다리를 놓으면 개울가로) */
  const REGIONS={
    forest:{name:'호플우드 숲',short:'숲',map:'map_forest_v2.jpg',hopple:[43,88],
      places:{
        pond:{name:'연잎 연못',box:[3,0.5,53,29.8]},
        flower:{name:'나비 꽃밭',box:[50,19.5,48,27]},
        bridge:{name:'개울 다리',box:[9,37,43,24.2]},
        house:{name:'비버네 집',box:[45,57.5,50,28.1]}
      },
      friends:{
        beaver:[62,79,13], frog:[35,16,12], duck:[8,20,11],
        squirrel:[47,50,11], hedgehog:[14,56,11], raccoon:[3,46,12],
        owl:[64,3,11], bluebird:[80,8,9],
        butterfly:[63,24,11], ladybug:[84,37,9],
        bee:[80,55,10], ant:[88,60,8]
      },
      gifts:[[58,8],[60,15],[48,24],[44,31],[66,34],[12,42],[41,61],[37,69],[36,77],[71,73],[50,84],[17,72],[27,33]],
      sign:{to:'riverside',at:[60,93]}},
    riverside:{name:'개울가와 정원',short:'개울가',map:'map_riverside.jpg',hopple:[37,86],
      unlock:{after:'bridge',hint:'개울 다리를 놓으면 건너갈 수 있어요.',opened:'개울 다리가 생겨서 개울가로 가는 길이 열렸어!'},
      places:{
        beach:{name:'개울가 모래톱',box:[15,9,50,28.1]},
        garden:{name:'정원 돌길',box:[43,32,50,28.1]},
        appletree:{name:'사과나무 잎길',box:[7,57.5,52,29.3]}
      },
      friends:{},
      gifts:[[74,18],[82,29],[16,40],[24,52],[84,62],[76,76],[64,88],[30,93]],
      sign:{to:'forest',at:[62,3]}}
  };
  const REGION_IDS=Object.keys(REGIONS);
  /* 안개 너머: 아직 만들지 않은 다음 지역. 이름·친구는 숨기고, 전체 진행에 따라 단서만 바뀐다.
     새 지역을 만들면 REGIONS에 넣고 여기 단서를 다음 지역용으로 바꾼다. 모두 해결해도 날짜는 약속하지 않는다. */
  const FOG={name:'안개 너머',clues:[
    [0,'비바람이 남긴 안개가 자욱해요. 저 너머엔 누가 살고 있을까요?'],
    [4,'안개 너머에서 콧노래 소리가 들려요.'],
    [8,'안개 사이로 처음 보는 발자국이 보여요!'],
    [Infinity,'숲과 개울가 친구들을 모두 도왔어요! 안개 너머 친구들도 호플우드에 오고 싶어 해요.']]};
  const PLACES=Object.assign({},...REGION_IDS.map(r=>REGIONS[r].places));
  const FRIEND_SPOTS=Object.assign({},...REGION_IDS.map(r=>REGIONS[r].friends));
  const GIFT_SPOTS=REGIONS.forest.gifts;
  /* 가면 축제 장식(숲): 나뭇잎 깃발 두 개 사이에 줄을 걸고 곰·여우·판다 가면을 매단다 (지도 %) */
  const FESTIVAL={flags:[[50,42.5,10],[76,42.5,10]],masks:[[56.5,46.2,7.2],[62.6,47.3,7.2],[68.7,46.2,7.2]],picnic:[56,51,15],
    line:'M55.5 43.6 Q63.5 48.4 81.5 43.6'};
  const INTRO=[
    {line:'어젯밤, 큰 비바람이 호플우드를 지나갔어요.',scene:'storm'},
    {line:'아침에는 비버의 집이 무너지고, 연못으로 가는 물길도 막혔어요.',scene:'morning'},
    {line:'나는 큰 씨앗나무에서 태어난 새싹 요정 호플이야. 숲 친구들을 같이 도와줄래?',scene:'hopple'}
  ];

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

  /* 부탁: 지역마다 순서대로 열린다(region이 없으면 숲). level은 첫 해결 때 난이도, place는 열리는 장소, friends는 이사 오는 친구 */
  const QUESTS=[
    {id:'beaver',title:'비버네 집 짓기',mark:[66,62],who:'beaver',game:'g5',level:1,place:'house',
      ask:'비바람에 집이 무너졌어. 통나무 조각으로 빈틈 없이 집터를 채워 줄래?',
      thanks:'우와, 우리 집이 생겼어! 이제 여기서 살래. 고마워!',
      gifts:['bench','acorns','signpost'],friends:['beaver']},
    {id:'festival',title:'가면 축제 준비',mark:[60,40],who:'hopple',game:'g3',level:1,place:null,masks:true,
      ask:'비바람에 풀이 죽은 친구들과 가면 축제를 열래. 반쪽 가면의 짝을 찾아 줄래?',
      thanks:'짝꿍 가면을 다 찾았어! 가면 친구들이 숲에 놀러 왔어!',
      gifts:['leafFlag','picnic','lantern'],friends:[]},
    {id:'pond',title:'마른 연못 살리기',mark:[26,15],who:'frog',game:'g4',level:1,theme:'pond',place:'pond',
      ask:'비바람에 물길이 막혀 연못이 말라 버렸어. 주사위로 더하고 빼며 연잎 길을 이어 줄래?',
      thanks:'연못에 물이 찼어! 오리도 같이 이사 왔어!',
      gifts:['wateringCan','flowerPot','signpost'],friends:['frog','duck']},
    {id:'owl',title:'밤길 표시 만들기',mark:[70,13],who:'owl',game:'g2',level:1,place:null,
      ask:'밤에 길을 잃지 않게 표시를 만들래. 내 목표 줄을 먼저 완성해 줄래?',
      thanks:'나무 구멍에 새 둥지를 틀었어! 파랑새도 함께 왔어!',
      gifts:['birdhouse','lantern','leafFlag'],friends:['owl','bluebird']},
    {id:'bridge',title:'개울 다리 놓기',mark:[26,42],who:'squirrel',game:'g1',level:1,place:'bridge',
      ask:'비바람에 다리가 떠내려갔어. 도토리를 옮길 수 있게 길을 잘 보고 건너가 볼래?',
      thanks:'다리가 생겼어! 고슴도치랑 너구리도 건너왔어!',
      gifts:['acorns','signpost','bench'],friends:['squirrel','hedgehog','raccoon']},
    {id:'together',title:'온 가족 쉼터 짓기',mark:[80,70],who:'beaver',game:'g5',level:2,place:null,coop:true,
      ask:'숲 친구들이 쉬어 갈 큰 쉼터를 지으려고 해. 엄마·아빠랑 번갈아 한 조각씩 놓아 줄래?',
      thanks:'둘이 힘을 합치니 쉼터가 금방 생겼어! 벤치랑 등불도 놓았어!',
      talk:'어떤 조각이 제일 어려웠는지, 어떻게 알아냈는지 서로 이야기해 봐요.',
      decor:[['bench',72,85,12],['lantern',88,74,9],['flowerPot',56,86,9]],
      gifts:['flowerPot','lantern','berryBush'],friends:[]},
    {id:'flower',title:'나비 무늬 꽃밭',mark:[70,26],who:'butterfly',game:'g2',level:1,place:'flower',
      ask:'빈 밭에 꽃을 심어 나비 무늬를 만들고 싶어. 내 무늬 줄을 먼저 완성해 줄래?',
      thanks:'나비 무늬 꽃밭이 활짝 피었어! 무당벌레도 이사 왔어!',
      gifts:['flowerPot','wateringCan','berryBush'],friends:['butterfly','ladybug']},
    {id:'hive',title:'꿀 나르기 시합',mark:[84,50],who:'bee',game:'g1',level:1,place:null,
      ask:'꿀을 벌집까지 날라야 해. 친구들 길을 잘 보고 먼저 건너가 볼래?',
      thanks:'꿀을 벌집까지 다 날랐어! 개미도 꿀 냄새를 맡고 왔어!',
      gifts:['berryBush','picnic','flowerPot'],friends:['bee','ant']},
    {id:'beach',region:'riverside',title:'조개 바구니 채우기',mark:[40,19],who:'otter',game:'g6',level:1,place:'beach',
      ask:'개울가에 조개가 잔뜩 흩어졌어. 주사위 수를 더해서 같은 조개를 바구니에 담아 줄래?',
      thanks:'바구니가 가득 찼어! 가재도 조개 구경하러 왔어!',
      gifts:['picnic','wateringCan','flowerPot'],friends:['otter','crayfish']},
    {id:'garden',region:'riverside',title:'꽃집 가는 돌길',mark:[68,43],who:'snail',game:'g7',level:1,place:'garden',
      ask:'꽃집까지 가는 돌길이 뒤죽박죽이야. 알맞은 수가 적힌 가장 가까운 돌을 찾아 길을 안내해 줄래?',
      thanks:'돌길이 생겼어! 거북이랑 같이 꽃집까지 갔어!',
      gifts:['signpost','lantern','flowerPot'],friends:['snail','turtle']},
    {id:'appletree',region:'riverside',title:'사과나무 살리기',mark:[33,69],who:'caterpillar',game:'g8',level:1,place:'appletree',
      ask:'비바람에 사과나무 잎이 다 떨어졌어. 홀수와 짝수를 맞히며 사과까지 가 줄래?',
      thanks:'사과가 주렁주렁 열렸어! 메뚜기도 폴짝 놀러 왔어!',
      gifts:['berryBush','acorns','picnic'],friends:['caterpillar','grasshopper']}
  ];
  /* 모든 부탁을 해결한 뒤 이어지는 짧은 부탁 (선물만 받는다) */
  const REPEATS=[
    {who:'hopple',game:'g3',coop:true,title:'가족 가면 놀이',ask:'엄마·아빠랑 번갈아 가면 짝을 찾아볼래? 한 판씩 차례로 해요!',thanks:'둘 다 짝꿍 찾기 선수야!',talk:'어디가 달라서 알아챘는지 서로 말해 봐요.',gifts:['picnic','leafFlag','lantern']},
    {who:'beaver',game:'g5',title:'친구 집 한 채 더',ask:'친구 집도 지어 주고 싶어. 같이 한 채 더 지을래?',thanks:'집이 또 생겼어! 숲이 점점 북적북적해!',gifts:['bench','signpost','acorns']},
    {who:'hopple',game:'g3',title:'축제 가면 또 찾기',ask:'축제에 새 친구들이 왔어. 가면 짝을 또 찾아 줄래?',thanks:'이번에도 딱 맞았어!',gifts:['leafFlag','lantern','picnic']},
    {who:'duck',game:'g4',theme:'pond',title:'새 연잎 길 잇기',ask:'연못에 새 연잎이 생겼어. 연잎 길을 또 이어 볼래?',thanks:'첨벙! 오늘도 건넜어!',gifts:['wateringCan','flowerPot','berryBush']},
    {who:'hedgehog',game:'g1',title:'개울 건너기 시합',ask:'개울 건너기 시합 한 판 할래?',thanks:'휴, 재밌었다! 다리가 더 튼튼해졌어!',gifts:['acorns','bench','signpost']},
    {who:'bluebird',game:'g2',title:'등불 표시 하나 더',ask:'등불 표시를 하나 더 만들까?',thanks:'숲이 더 환해졌어!',gifts:['lantern','birdhouse','leafFlag']},
    {region:'riverside',who:'crayfish',game:'g6',mark:[40,19],title:'조개 한 바구니 더',ask:'물살에 새 조개가 떠내려 왔어. 한 바구니 더 채워 볼래?',thanks:'반짝반짝 조개가 가득해!',gifts:['wateringCan','picnic','lantern']},
    {region:'riverside',who:'turtle',game:'g7',mark:[68,43],title:'느릿느릿 돌길 산책',ask:'돌길을 한 번 더 걸어 볼래? 이번엔 누가 먼저 꽃집에 갈까?',thanks:'천천히 가도 끝까지 갔어!',gifts:['signpost','flowerPot','bench']},
    {region:'riverside',who:'grasshopper',game:'g8',mark:[33,69],title:'잎길 달리기',ask:'잎길 달리기 한 판 할래? 홀수 짝수를 잘 맞혀 봐!',thanks:'폴짝폴짝, 사과까지 도착!',gifts:['berryBush','acorns','leafFlag']}
  ];
  /* 게임 이름·아이콘은 등록부에서 (games/registry.js) */
  const GAME_NAME=new Proxy({},{get:(_,id)=>{ const g=HW_GAMES.get(id); return g?g.title:''; }});
  const GAME_ICON=new Proxy({},{get:(_,id)=>{ const g=HW_GAMES.get(id); return g?(g.questIcon||g.icon):'sparkles'; }});

  const state=Object.assign({done:[],placed:[],repeatIndex:0,greeted:false,pendingGifts:null,view:'forest',collected:[],celebrated:[],opened:[]},hwReadJSON(KEY,{}));
  if(!REGIONS[state.view])state.view='forest';
  state.placed=state.placed.map(p=>({...p,gift:GIFTS[p.gift]?p.gift:(LEGACY_GIFT[p.gift]||'lantern')}));
  /* 예전에는 아무 곳에나 놓았다(x,y). 최근 선물부터 가장 가까운 빈 자리로 옮기고, 자리보다 많으면 오래된 것은 뺀다. */
  if(state.placed.some(p=>typeof p.spot!=='number')){
    const used=new Set(), kept=[];
    state.placed.slice().reverse().forEach(p=>{
      if(typeof p.spot==='number'&&(p.region&&p.region!=='forest'||!used.has(p.spot))){ if(!p.region||p.region==='forest')used.add(p.spot); kept.push(p); return; }
      const cx=(p.x||0)+6, cy=(p.y||0)+6; let best=-1,bd=Infinity;
      GIFT_SPOTS.forEach(([x,y],i)=>{ if(used.has(i))return; const d=(x-cx)**2+((y-cy)*1.78)**2; if(d<bd){bd=d;best=i;} });
      if(best>=0){ used.add(best); kept.push({gift:p.gift,spot:best}); }
    });
    state.placed=kept.reverse();
  }
  state.placed=state.placed.filter(p=>{ p.region=p.region||'forest'; return Boolean(REGIONS[p.region]&&REGIONS[p.region].gifts[p.spot]); });
  /* 선물 모음(아이 기록 화면): 한 번이라도 놓아 본 선물. 예전 기록은 지금 놓인 선물로 채운다 */
  if(!Array.isArray(state.collected))state.collected=[];
  ['celebrated','opened'].forEach(k=>{ if(!Array.isArray(state[k]))state[k]=[]; });
  state.placed.forEach(p=>{ if(!state.collected.includes(p.gift))state.collected.push(p.gift); });
  if(state.pendingGifts)state.pendingGifts=state.pendingGifts.map(g=>GIFTS[g]?g:(LEGACY_GIFT[g]||'lantern'));
  function save(){ hwStore(KEY,JSON.stringify(state)); }

  let active=null, patchBackup=null, placing=null, justOpened=null;
  let introPending=false, introShowing=false, introReplay=false, introIndex=0;

  function el(id){ return document.getElementById(id); }
  function regionOf(q){ return (q&&q.region)||'forest'; }
  function view(){ return REGIONS[state.view]; }
  function reachable(id){ const u=REGIONS[id]&&REGIONS[id].unlock; return !u||state.done.includes(u.after); }
  function regionQuests(id){ return QUESTS.filter(q=>regionOf(q)===id); }
  function regionComplete(id){ const qs=regionQuests(id); return qs.length>0&&qs.every(q=>state.done.includes(q.id)); }
  function fogClue(){ const n=state.done.filter(id=>QUESTS.some(q=>q.id===id)).length, all=n>=QUESTS.length; return (all?FOG.clues[FOG.clues.length-1]:FOG.clues.filter(c=>c[0]<=n&&c[0]!==Infinity).pop())[1]; }
  function nextQuest(region){ return QUESTS.find(q=>!state.done.includes(q.id)&&(!region||regionOf(q)===region))||null; }
  /* 보고 있는 지역의 부탁. 무료판에서 열린 퀘스트가 끝나면 무료 게임으로 된 반복 퀘스트만 이어진다.
     지역에 할 수 있는 부탁이 하나도 없으면(놀이팩 지역) 가격 없이 "어른과 함께 열 수 있어요"만 보여 준다. */
  function currentRequest(){
    const region=state.view, q=nextQuest(region);
    /* 놀이팩이 열려 있으면 이야기 길(unlock)이 먼저: 아직 못 가는 지역은 무엇을 하면 열리는지 보여 준다 */
    if(!reachable(region)&&regionQuests(region).some(x=>hwQuestOpen(x.id)))return {id:'path',region,locked:true,path:true,title:REGIONS[region].name,who:(q&&q.who)||'hopple'};
    if(q&&hwQuestOpen(q.id))return q;
    const pool=REPEATS.filter(r=>regionOf(r)===region&&hwGameOpen(r.game));
    if(pool.length&&(!q||region==='forest')){ const r=pool[state.repeatIndex%pool.length]; return {...r,id:'repeat',region,level:null,place:null,friends:[]}; }
    return {id:'locked',region,locked:true,title:REGIONS[region].name,who:(q&&q.who)||'hopple'};
  }
  function placedHere(){ return state.placed.filter(p=>p.region===state.view); }
  function residents(){ const set=new Set(); QUESTS.forEach(q=>{ if(state.done.includes(q.id))q.friends.forEach(f=>set.add(f)); }); return [...set]; }
  function placeOpen(place){ return QUESTS.some(q=>q.place===place&&state.done.includes(q.id)); }
  function markSpot(q){ if(q.mark)return q.mark; const f=view().friends[q.who]; return f?[f[0]+f[2]/2,Math.max(2,f[1]-6)]:[50,80]; }
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
  /* 자리 좌표(발밑 가운데) → 선물 상자(지도 폭 14%, 정사각형)의 left/top. 지도 비율 1080×1920이라 세로 %는 14×0.5625 */
  function giftAt([x,y]){ return `left:${(x-7).toFixed(2)}%;top:${(y-7.4).toFixed(2)}%`; }
  function giftImg(id){ const g=GIFTS[id]||GIFTS.lantern; return `<img src="${ART}${g.file}.png" alt="" draggable="false">`; }

  /* ---------- 지도 그리기 ---------- */
  function renderMap(){
    const map=el('fwMap'); if(!map)return;
    const R=view(), here=placedHere(), spots=R.gifts;
    map.dataset.region=state.view;
    map.dataset.reach=reachable(state.view)?'1':'0';
    map.setAttribute('aria-label',R.name+' 지도');
    let html=`<img class="fw-mapimg" src="${ART}${R.map}" alt="" draggable="false">`;
    Object.entries(R.places).forEach(([key,p])=>{
      const [x,y,w,h]=p.box, open=placeOpen(key), fresh=justOpened===key;
      html+=`<div class="fw-place fw-${key}" data-open="${open?'1':'0'}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%" aria-label="${p.name}${open?'':' (아직 준비 중)'}">`+
        `<img class="fw-stage before" src="${ART}stage_${key}_before.png" alt="" draggable="false">`+
        (open?`<img class="fw-stage after${fresh?' fw-reveal':''}" src="${ART}stage_${key}_after.png" alt="" draggable="false">`:'')+
        `</div>`;
    });
    if(state.view==='forest'&&state.done.includes('festival')){
      const pop=justOpened==='festival'?' fw-pop':'';
      html+=`<svg class="fw-festival-line${pop}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${FESTIVAL.line}" fill="none" stroke="#6b4a2f" stroke-width=".35" vector-effect="non-scaling-stroke"/></svg>`;
      FESTIVAL.flags.forEach(([x,y,w])=>{ html+=`<span class="fw-deco${pop}" style="left:${x}%;top:${y}%;width:${w}%">${giftImg('leafFlag')}</span>`; });
      html+=`<span class="fw-deco${pop}" style="left:${FESTIVAL.picnic[0]}%;top:${FESTIVAL.picnic[1]}%;width:${FESTIVAL.picnic[2]}%">${giftImg('picnic')}</span>`;
      if(typeof g3_faceSVG==='function'){
        const faces=[{species:'bear',head:'flower',ears:'pink',eyes:'smile',nose:'oval',mouth:'open',cheeks:'blush'},{species:'fox',head:'sprout',ears:'cream',eyes:'round',nose:'heart',mouth:'w',cheeks:'star'},{species:'panda',head:'tuft',ears:'pink',eyes:'sparkle',nose:'pink',mouth:'grin',cheeks:'blush'}];
        faces.forEach((f,i)=>{ const [x,y,w]=FESTIVAL.masks[i]; html+=`<span class="fw-mask${pop}" style="left:${x}%;top:${y}%;width:${w}%;--swing:${i%2?-4:4}deg">${g3_faceSVG(f,'full')}</span>`; });
      }
    }
    QUESTS.forEach(q=>{ if(!q.decor||regionOf(q)!==state.view||!state.done.includes(q.id))return; const pop=justOpened===q.id?' fw-pop':'';
      q.decor.forEach(([gift,x,y,w])=>{ html+=`<span class="fw-deco${pop}" style="left:${x}%;top:${y}%;width:${w}%">${giftImg(gift)}</span>`; }); });
    const freshFriends=new Set(justOpened?((QUESTS.find(q=>q.id===justOpened||q.place===justOpened)||{}).friends||[]):[]);
    residents().forEach(id=>{ const s=R.friends[id]; if(!s)return; html+=`<span class="fw-friend${freshFriends.has(id)?' fw-pop':''}" style="left:${s[0]}%;top:${s[1]}%;width:${s[2]}%">${hwChar(id,'full')}</span>`; });
    here.forEach(p=>{ const s=spots[p.spot]; if(!s)return; html+=`<span class="fw-placed" style="${giftAt(s)}" data-spot="${p.spot}">${giftImg(p.gift)}</span>`; });
    if(placing){
      html+=`<span class="fw-dim" aria-hidden="true"></span>`;
      const full=here.length>=spots.length;
      spots.forEach(([x,y],i)=>{ const taken=here.some(p=>p.spot===i);
        if(taken&&!full)return;
        html+=`<button type="button" class="fw-spot${taken?' swap':''}" style="left:${x-6}%;top:${y-6.2}%" onclick="event.stopPropagation();hwForest.placeAt(${i})" aria-label="${taken?'이 자리 선물과 바꾸기':'여기에 놓기'}"><span aria-hidden="true">${taken?hwIcon('swap'):'+'}</span></button>`; });
    }
    html+=`<span class="fw-hopple" style="left:${R.hopple[0]}%;top:${R.hopple[1]}%">${hoppleArt(state.done.length?'celebrate':'ask')}</span>`;
    if(R.sign&&!placing){ const to=REGIONS[R.sign.to];
      html+=`<button type="button" class="fw-sign${R.sign.at[1]<50?' up':''}${reachable(R.sign.to)?'':' shut'}" style="left:${R.sign.at[0]}%;top:${R.sign.at[1]}%" onclick="event.stopPropagation();hwForest.goRegion('${R.sign.to}')" aria-label="${to.name}(으)로 가기">${hwIcon(R.sign.at[1]<50?'arrow-up':'route')}<b>${to.short}</b></button>`; }
    if(!state.pendingGifts&&!placing){
      const q=currentRequest();
      if(!q.locked){ const [mx,my]=markSpot(q);
        html+=`<button type="button" class="fw-marker${q.coop?' coop':''}" style="left:${mx}%;top:${my}%" onclick="event.stopPropagation();hwForest.openQuest()" aria-label="퀘스트: ${q.title}"><span class="fw-marker-face">${q.who==='hopple'?hwChar('hopple','face'):hwChar(q.who,'face')}</span><b>!</b></button>`; }
    }
    if(!reachable(state.view))html+=`<span class="fw-mist" aria-hidden="true"></span>`;
    html+=`<div class="fw-place-hint" id="fwPlaceHint"${placing?'':' hidden'}>${here.length>=spots.length?'바꿔 놓을 선물 자리를 눌러요':'반짝이는 자리 중 하나를 눌러요'}</div>`;
    map.innerHTML=html;
    map.dataset.placing=placing?'1':'0';
    const count=el('fwFriendCount'); if(count)count.textContent=String(residents().length+(state.done.includes('festival')?3:0));
    const giftCount=el('fwGiftCount'); if(giftCount)giftCount.textContent=String(state.placed.length);
    const openCount=el('fwAreaCount'); if(openCount)openCount.textContent=state.done.filter(id=>QUESTS.some(q=>q.id===id)).length+' / '+QUESTS.length;
    renderRegions();
  }
  /* 지역 탭: 지역 이름과 해결한 부탁 수 */
  function renderRegions(){
    const box=el('fwRegions'); if(!box)return;
    /* 지역 상태: 완성(별) · 열림(해결 수) · 길 막힘/놀이팩(자물쇠). 끝에 안개 너머 탭 */
    box.innerHTML=REGION_IDS.map(id=>{ const qs=regionQuests(id), done=qs.filter(q=>state.done.includes(q.id)).length, on=id===state.view;
      const open=qs.some(q=>hwQuestOpen(q.id))&&reachable(id), complete=regionComplete(id);
      const status=complete?`${hwIcon('star')}완성`:(open?done+' / '+qs.length:hwIcon('lock'));
      return `<button type="button" role="tab" aria-selected="${on?'true':'false'}" data-on="${on?'1':'0'}"${complete?' data-complete="1"':''} ${placing?'disabled':''} onclick="hwForest.goRegion('${id}')"><b>${REGIONS[id].name}</b><small>${status}</small></button>`; }).join('')+
      `<button type="button" class="fw-fog-tab" ${placing?'disabled':''} onclick="hwForest.showFog()" aria-label="${FOG.name}, 아직 안개 속"><b>${FOG.name}</b><small>${hwIcon('cloud')}?</small></button>`;
  }
  function goRegion(id){
    if(!REGIONS[id]||placing||id===state.view)return;
    state.view=id; save(); hwSfx('tap');
    render();
    const map=el('fwMap'); if(map){ map.classList.remove('fw-enter'); void map.offsetWidth; map.classList.add('fw-enter'); }
    const box=el('fwRegions'); if(box)box.scrollIntoView({block:'start',behavior:'smooth'});
    hwSay(REGIONS[id].name+'에 왔어요!');
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
    if(q.path){
      const u=REGIONS[q.region].unlock, key=QUESTS.find(x=>x.id===u.after);
      box.dataset.kind='locked';
      box.innerHTML=`<div class="fw-req-art full">${whoArt(key?key.who:'hopple')}</div><div class="fw-req-body"><small>${hwIcon('lock')} ${REGIONS[q.region].name}</small><p>${u.hint}</p><button type="button" class="btn ghost fw-path-go" onclick="hwForest.goRegion('forest')">${hwIcon('route')} ${REGIONS.forest.short}으로 가기</button></div>`;
      return;
    }
    if(q.locked){
      const friends=QUESTS.filter(x=>regionOf(x)===q.region).map(x=>x.who);
      box.dataset.kind='locked';
      box.innerHTML=`<div class="fw-req-art fw-locked-faces" aria-hidden="true">${friends.map(f=>hwChar(f,'face')).join('')}</div><div class="fw-req-body"><small>${hwIcon('lock')} ${REGIONS[q.region].name}</small><p>이곳 친구들이 기다리고 있어요. 어른과 함께 열 수 있어요.</p></div>`;
      return;
    }
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
    const next=nextQuest(state.view);
    t.setAttribute('aria-label',REGIONS[state.view].name+' 퀘스트 길');
    t.innerHTML=QUESTS.filter(q=>regionOf(q)===state.view).map((q,i)=>{
      const done=state.done.includes(q.id), now=next&&next.id===q.id&&hwQuestOpen(q.id)&&reachable(state.view);
      return `<li data-state="${done?'done':(now?'now':'lock')}"${q.coop?' data-coop="1"':''} aria-label="${i+1}번 퀘스트 ${done?q.title+' 완료':(now?q.title+' 진행 중':'아직 잠김')}">${done?hwChar(q.who==='hopple'?'hopple':q.who,'face'):(now?'!':hwIcon('lock'))}</li>`;
    }).join('');
  }
  function render(){ renderMap(); renderRequest(); }

  /* ---------- 부탁 시작과 끝 ---------- */
  /* 숲 퀘스트는 짧게: 게임 약속의 shortRun(on)이 있으면 판 수를 줄였다가 끝나면 되돌린다 */
  function applyPatch(game){
    const g=HW_GAMES.get(game); if(!g||typeof g.shortRun!=='function')return;
    g.shortRun(true); patchBackup=game;
  }
  function restorePatch(){
    if(!patchBackup)return;
    const g=HW_GAMES.get(patchBackup); if(g&&typeof g.shortRun==='function')g.shortRun(false);
    patchBackup=null;
  }
  function launch(q){
    curGame=q.game; /* g1Start·g2Start는 curGame을 직접 바꾸지 않으므로 먼저 정한다 */
    HW_GAMES.get(q.game).start('solo');
  }
  function openQuest(){
    if(state.pendingGifts||placing)return;
    const q=currentRequest(); if(q.locked)return;
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
    const q=currentRequest(); if(q.locked)return;
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

  /* 첫 방문에만 짧게 소개한다. 기존 사용자의 greeted 기록은 그대로 존중한다. */
  function introArt(scene){
    if(scene==='storm')return `<div class="fw-story-art storm" aria-hidden="true"><img src="${ART}map_forest_v2.jpg" alt=""><span class="fw-story-rain"></span></div>`;
    if(scene==='morning')return `<div class="fw-story-art morning" aria-hidden="true"><img src="${ART}stage_house_before.png" alt=""><img src="${ART}stage_pond_before.png" alt=""></div>`;
    return `<div class="fw-story-art hopple" aria-hidden="true"><img class="forest" src="${ART}map_forest_v2.jpg" alt="">${hoppleArt('ask')}</div>`;
  }
  function showIntro(index=0,replay=false){
    if(index<0||index>=INTRO.length)return;
    introPending=false; introShowing=true; introIndex=index;
    if(index===0)introReplay=Boolean(replay);
    const part=INTRO[index];
    overlay(`<div class="fw-quest-ribbon">호플우드 이야기 · ${index+1}/${INTRO.length}</div>
      ${introArt(part.scene)}
      <h2 class="fw-story-line">${part.line}</h2>
      <div class="fw-story-steps" aria-label="이야기 ${index+1}장 / ${INTRO.length}장">${INTRO.map((_,i)=>`<span class="${i===index?'on':''}"></span>`).join('')}</div>
      <button class="btn blue big" onclick="hwForest.nextIntro()">${index===INTRO.length-1?'도와줄게!':'다음 이야기'}</button>
      <button class="btn ghost" onclick="hwForest.skipIntro()">${introReplay?'닫기':'건너뛰기'}</button>`);
    hwSay(part.line);
  }
  function finishIntro(openFirstQuest){
    const replay=introReplay;
    introPending=false; introShowing=false; introReplay=false;
    if(!state.greeted){ state.greeted=true; save(); }
    hwHush(); closeFw();
    if(openFirstQuest&&!replay&&!state.pendingGifts&&!currentRequest().locked)openQuest();
  }
  function nextIntro(){
    if(!introShowing)return;
    if(introIndex<INTRO.length-1)showIntro(introIndex+1,introReplay);
    else finishIntro(true);
  }
  function skipIntro(){ if(introShowing||introPending)finishIntro(false); }
  function closeStoryOrQuest(){ if(introShowing||introPending)skipIntro(); else closeFw(); }

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
      <button class="btn blue big" onclick="hwForest.afterResult()">${REGIONS[regionOf(q)]?REGIONS[regionOf(q)].short:'숲'}에 가 볼래!</button>`);
    hwSay(line);
  }
  function afterResult(){
    const q=active; closeFw();
    if(q&&REGIONS[regionOf(q)])state.view=regionOf(q);
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
    /* 대상 위쪽에 띄우고, 대상이 오른쪽 반에 있으면 오른쪽 끝에 맞춰 잘리지 않게 한다. */
    const cx=(tr.left+tr.width/2-mr.left)/mr.width*100;
    if(cx>50)b.style.right=Math.max(2,(mr.right-tr.right)/mr.width*100-4)+'%';
    else b.style.left=Math.max(2,(tr.left-mr.left)/mr.width*100-4)+'%';
    b.style.top=Math.max(1,(tr.top-mr.top-58)/mr.height*100)+'%';
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
    hwSay(placedHere().length>=view().gifts.length?'선물 자리가 꽉 찼어요. 바꿔 놓을 선물을 눌러요.':'반짝이는 자리 중 하나를 눌러요.');
  }
  function onMapTap(ev){
    if(!placing)return;
    /* 자리 밖을 누르면 가장 가까운 자리에 놓는다(작은 손가락이 조금 빗나가도 괜찮게). */
    const map=el('fwMap'), r=map.getBoundingClientRect();
    const here=placedHere(), spots=view().gifts;
    const x=(ev.clientX-r.left)/r.width*100, y=(ev.clientY-r.top)/r.height*100, full=here.length>=spots.length;
    let best=-1,bd=Infinity;
    spots.forEach(([sx,sy],i)=>{ if(!full&&here.some(p=>p.spot===i))return; const d=(sx-x)**2+((sy-y)*1.78)**2; if(d<bd){bd=d;best=i;} });
    if(best>=0)placeAt(best);
  }
  function placeAt(spot){
    const region=state.view, spots=view().gifts;
    if(!placing||!spots[spot])return;
    const taken=state.placed.findIndex(p=>p.region===region&&p.spot===spot);
    if(taken>=0&&placedHere().length<spots.length)return;
    if(taken>=0)state.placed.splice(taken,1);
    state.placed.push({gift:placing,spot,region});
    if(!state.collected.includes(placing))state.collected.push(placing);
    const name=(GIFTS[placing]||GIFTS.lantern).name;
    placing=null; state.pendingGifts=null; save(); hwSfx('place');
    renderMap();
    const last=el('fwMap').querySelector('.fw-placed[data-spot="'+spot+'"]');
    if(last){ last.classList.add('fw-pop','fw-new'); setTimeout(()=>last.classList.remove('fw-new'),3200); showBubble(last,hwJosa(name,'을/를')+' 놓았어!'); }
    setTimeout(nextEvent,1600);
  }
  /* "내 선물" 칩: 지도로 내려가서 모은 선물을 한꺼번에 반짝인다. */
  function showGifts(){
    const map=el('fwMap'); if(!map)return;
    map.scrollIntoView({block:'center',behavior:'smooth'});
    const gifts=[...map.querySelectorAll('.fw-placed')];
    if(!gifts.length){ const other=state.placed.length; hwSay(other?'다른 곳에 선물이 '+other+'개 있어요. 위에서 지역을 바꿔 봐요!':'아직 놓은 선물이 없어요. 퀘스트를 해결하면 선물을 받아요!'); return; }
    gifts.forEach((g,i)=>{ g.classList.remove('fw-shine'); void g.offsetWidth; g.style.animationDelay=(i*.08)+'s'; g.classList.add('fw-shine'); setTimeout(()=>{ g.classList.remove('fw-shine'); g.style.animationDelay=''; },2600+i*80); });
    hwSfx('good'); hwSay(view().short+'에 선물이 '+gifts.length+'개 있어요!');
  }
  /* 지역 이정표: 지역을 모두 해결하면 완성 축하, 이야기 길이 열리면 새 지역 안내. 한 번씩만 보여 준다 */
  function milestone(){
    const done=REGION_IDS.find(id=>regionComplete(id)&&!state.celebrated.includes(id));
    if(done){ state.celebrated.push(done); save(); showRegionDone(done); return true; }
    const opened=REGION_IDS.find(id=>REGIONS[id].unlock&&reachable(id)&&!state.opened.includes(id)&&regionQuests(id).some(q=>hwQuestOpen(q.id)));
    if(opened){ state.opened.push(opened); save(); showRegionOpened(opened); return true; }
    return false;
  }
  function showRegionDone(id){
    const R=REGIONS[id], faces=[...new Set(regionQuests(id).flatMap(q=>q.friends||[]))];
    const line=R.name+'을 모두 도왔어! 친구들이 고맙대!';
    hwSfx('win'); if(typeof confetti==='function')confetti();
    overlay(`<div class="fw-quest-ribbon done">${hwIcon('star')} 지역 완성</div>
      <div class="fw-stamp" aria-hidden="true">${hoppleArt('celebrate')}<b>${R.short}</b></div>
      <h2>${line}</h2>
      <div class="fw-done-faces" aria-hidden="true">${faces.map(f=>hwChar(f,'face')).join('')}</div>
      <p class="fw-fog-clue">${hwIcon('cloud')} ${fogClue()}</p>
      <button class="btn blue big" onclick="hwForest.afterMilestone()">좋아!</button>`);
    hwSay(line+' '+fogClue());
  }
  function showRegionOpened(id){
    const R=REGIONS[id], line=R.unlock.opened;
    hwSfx('good');
    overlay(`<div class="fw-quest-ribbon">${hwIcon('route')} 새 길</div>
      <div class="fw-card-art">${hoppleArt('surprised')}</div>
      <h2>${line}</h2>
      <p class="fw-quest-ask">${R.name}에 새 친구들이 기다리고 있어요.</p>
      <button class="btn blue big" onclick="hwForest.closeQuest();hwForest.goRegion('${id}')">${R.short}에 가 볼래!</button>
      <button class="btn ghost" onclick="hwForest.afterMilestone()">나중에</button>`);
    hwSay(line);
  }
  function afterMilestone(){ closeFw(); if(!milestone())nextEvent(true); }
  /* 안개 너머: 지도 대신 이야기 카드. 진행에 따라 단서가 바뀐다 */
  function showFog(){
    if(placing)return;
    hwSfx('tap');
    const clue=fogClue();
    overlay(`<div class="fw-quest-ribbon fog">${hwIcon('cloud')} ${FOG.name}</div>
      <div class="fw-fog-art" aria-hidden="true"><i></i><i></i><i></i><span>?</span><span>?</span><span>?</span></div>
      <h2>${clue}</h2>
      <p class="fw-quest-ask">친구들을 도우면 새로운 단서를 찾을 수 있어요.</p>
      <button class="btn blue big" onclick="hwForest.closeQuest()">다시 와 볼게!</button>`);
    hwSay(clue);
  }
  function nextEvent(skipMilestone){
    if(!skipMilestone&&milestone())return;
    renderRequest();
    const q=currentRequest(), box=el('fwRequest');
    if(q.locked)return;
    if(box){ box.classList.remove('fw-bump'); void box.offsetWidth; box.classList.add('fw-bump'); box.scrollIntoView({block:'nearest',behavior:'smooth'}); }
    hwSay((q.coop?'부모님과 함께하는 퀘스트가 생겼어!':'새 퀘스트가 생겼어!')+' 숲에서 느낌표를 눌러 봐!');
    const m=document.querySelector('.fw-marker'); if(m)m.classList.add('fw-pop');
  }

  /* ---------- 화면 ---------- */
  function showForest(offer=true){
    if(typeof showScreen==='function')showScreen('forestScreen');
    render();
    if(offer&&state.pendingGifts&&!placing)setTimeout(offerGifts,300);
    if(!state.greeted&&!state.pendingGifts&&!introPending&&!introShowing){
      introPending=true;
      setTimeout(()=>{ if(introPending)showIntro(); },350);
    }
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
      <div class="fw-stats"><span>${hwIcon('users')} 숲 친구 <b id="fwFriendCount">0</b></span><span>${hwIcon('house')} 퀘스트 <b id="fwAreaCount">0</b></span><button type="button" class="fw-gift-chip" id="fwGiftChip" onclick="hwForest.showGifts()" aria-label="내 선물 찾기">${hwIcon('sparkles')} 내 선물 <b id="fwGiftCount">0</b></button></div>
      <section class="fw-request" id="fwRequest" aria-live="polite"></section>
      <div class="fw-regions" id="fwRegions" role="tablist" aria-label="지역"></div>
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

  window.hwForest={mount,showForest,refresh:()=>render(),openQuest,closeQuest:closeStoryOrQuest,startQuest,retry,home,afterResult,pickGift,placeAt,showGifts,
    isQuestActive:()=>Boolean(active), abortQuest:endQuest,
    goRegion,showFog,afterMilestone,showIntro,nextIntro,skipIntro,INTRO,
    /* 아이 기록 화면의 숲 친구 도감·선물 모음 */
    collection:()=>{
      const met=new Set(residents());
      const friends=[];
      QUESTS.forEach(q=>{
        const add=(id,name,art)=>{ if(!friends.some(f=>f.id===id))friends.push({id,name,art,region:regionOf(q),quest:q.title,met:state.done.includes(q.id)}); };
        if(q.masks){ [['bear','곰'],['fox','여우'],['panda','판다']].forEach(([sp,name])=>add('mask-'+sp,name,()=>typeof g3_faceSVG==='function'?g3_faceSVG({species:sp,head:'sprout',ears:'pink',eyes:'round',nose:'oval',mouth:'w',cheeks:'blush'},'full'):hwChar('hopple','face'))); }
        (q.friends||[]).forEach(id=>add(id,hwCharName(id),()=>hwChar(id,'face')));
      });
      friends.forEach(f=>{ if(!f.id.startsWith('mask-'))f.met=met.has(f.id); });
      const gifts=Object.entries(GIFTS).map(([id,g])=>({id,name:g.name,src:ART+g.file+'.png',got:state.collected.includes(id)}));
      return {friends,gifts,regions:REGION_IDS.map(id=>({id,name:REGIONS[id].name,complete:regionComplete(id)})),fog:{name:FOG.name,clue:fogClue()}};
    },
    reset:()=>{ Object.assign(state,{done:[],placed:[],repeatIndex:0,greeted:false,pendingGifts:null,view:'forest',collected:[],celebrated:[],opened:[]}); save(); render(); },
    state:()=>JSON.parse(JSON.stringify(state)), QUESTS, REPEATS, REGIONS, PLACES, FRIEND_SPOTS, GIFT_SPOTS};
})();
