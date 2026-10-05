/*
 * 호플우드 게임 등록부와 게임 약속 (ADR-0004)
 * 게임은 games/<id>-<name>/game.js 에서 hwRegisterGame({...})로 자기를 등록한다.
 * 홈 목록·준비/게임 화면·배경음악·규칙·난이도 안내·부모 리포트·숲 퀘스트·놀이팩 문구는 모두 이 등록부를 읽는다.
 *
 * 게임 약속 (필수)
 *   id, order                     'g6', 6
 *   title, age, ages, players, time, category, hero, description, card, icon   홈 목록·추천 카드 문구
 *   cast                          추천 카드·표지에 쓰는 캐릭터 id 목록 (characters.js)
 *   coverClass                    표지 배경 CSS 클래스
 *   music                         배경음악 이름 (music.js)
 *   defaults                      기본 설정 {mode:'solo', level:1, ...}
 *   levels                        {1:'…',2:'…',3:'…'} 준비 화면 난이도 안내
 *   rules                         {title, body:[[번호 또는 'i-아이콘', 문장], …]}
 *   guide                         부모 안내 {art, line, areas, steps, levels, signs, talk}
 *   insight(list)                 부모 리포트 문장 {lines, metric, metricName, tip}
 *   mount()                       #<id>Setup, #<id>Game 화면 내용을 만든다 (등록 때가 아니라 홈이 준비된 뒤 한 번 부른다)
 *   start(mode), cancel()         한 판 시작 / 진행 중인 판 멈추기('solo' | 'duo')
 *   summary(winner)               혼자 하기로 끝난 판의 부모 리포트용 요약 (없으면 null)
 *   record                        아이 기록 화면의 최고 기록·배지 {key: summary의 값 이름, label, unit, goal, badge}
 *                                 예: {key:'first',label:'한 번에 찾은 얼굴',unit:'개',goal:6,badge:'짝꿍 탐정'} — 과거의 나와만 비교한다
 * 선택
 *   cover()                       표지 그림 HTML (없으면 cast로 그린다)
 *   heroArt()                     추천 카드 큰 그림 HTML
 *   questIcon                     숲 퀘스트 카드 아이콘 (없으면 icon)
 *   onSetupOpen()                 준비 화면을 열 때
 *   pause(), resume()             앱이 가려지거나 다시 보일 때
 *   shortRun(on)                  숲 퀘스트로 할 때 판 수를 줄였다가(true) 원래대로(false) 돌린다
 * 등록할 때는 DOM이나 홈 전역(lastCfg 등)을 건드리지 않는다. 그래서 scripts/check-games.cjs가 node에서 등록부를 검사할 수 있다.
 */
(function(root){
  const REQUIRED=['id','order','title','age','ages','players','time','category','hero','description','card','icon','cast','coverClass','music','defaults','levels','rules','guide','insight','record','mount','start','cancel','summary'];
  const FUNCS=['insight','mount','start','cancel','summary','cover','heroArt','onSetupOpen','pause','resume','shortRun'];
  const games=[], byId={};
  function problems(def){
    const out=[];
    REQUIRED.forEach(k=>{ if(def[k]===undefined||def[k]===null||def[k]==='')out.push(k+' 없음'); });
    FUNCS.forEach(k=>{ if(def[k]!==undefined&&typeof def[k]!=='function')out.push(k+'는 함수여야 함'); });
    if(def.id&&!/^g\d+$/.test(def.id))out.push('id는 g숫자 형식');
    if(def.levels&&![1,2,3].every(n=>typeof def.levels[n]==='string'))out.push('levels 1–3 필요');
    if(def.rules&&!(def.rules.title&&Array.isArray(def.rules.body)&&def.rules.body.length))out.push('rules.title/body 필요');
    if(def.guide&&!['line','areas','steps','levels','signs','talk'].every(k=>def.guide[k]))out.push('guide 항목 부족');
    if(def.record&&!(def.record.key&&def.record.label&&def.record.unit&&def.record.goal>0&&def.record.badge))out.push('record{key,label,unit,goal,badge} 필요');
    return out;
  }
  function hwRegisterGame(def){
    const bad=problems(def||{});
    if(bad.length){ const msg='[호플우드] '+((def&&def.id)||'?')+' 등록 실패: '+bad.join(', '); if(root.console)console.error(msg); throw new Error(msg); }
    if(byId[def.id])throw new Error('[호플우드] 같은 게임 id가 두 번 등록됨: '+def.id);
    byId[def.id]=def; games.push(def); games.sort((a,b)=>a.order-b.order);
    return def;
  }
  root.hwRegisterGame=hwRegisterGame;
  root.HW_GAMES={
    list:()=>games.slice(),
    ids:()=>games.map(g=>g.id),
    get:id=>byId[id]||null,
    problems
  };
})(typeof window!=='undefined'?window:globalThis);
