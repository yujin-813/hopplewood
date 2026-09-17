/*
 * 호플우드 공통 도구: 소리·읽어주기 설정, 효과음, 한국어 조사, 안전한 저장소.
 * 모든 게임이 같은 방식으로 소리를 내고 글을 읽어줄 수 있게 한다.
 */
(function(){
  const SETTINGS_KEY='hw_settings_v1';
  const settings={sound:true,voice:true,music:true};

  function storageGet(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }
  function storageSet(key,value){ try{ localStorage.setItem(key,value); return true; }catch(e){ return false; } }
  function readJSON(key,fallback){
    try{ const raw=storageGet(key); if(!raw)return fallback; const data=JSON.parse(raw); return data&&typeof data==='object'?data:fallback; }catch(e){ return fallback; }
  }
  Object.assign(settings,readJSON(SETTINGS_KEY,{}));

  /* 이전 이름(콩콩)으로 저장된 기록과 설정을 한 번만 옮긴다. */
  [['kk_progress_v2','hw_progress_v1'],['kk_preferences_v1','hw_preferences_v1']].forEach(([from,to])=>{
    if(storageGet(to)===null&&storageGet(from)!==null)storageSet(to,storageGet(from));
  });

  function saveSettings(){ storageSet(SETTINGS_KEY,JSON.stringify(settings)); syncSettingButtons(); }

  let audioCtx=null;
  function ctx(){
    if(!settings.sound)return null;
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return null;
    if(!audioCtx){ try{ audioCtx=new AC(); }catch(e){ return null; } }
    if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
    return audioCtx;
  }
  function tone(freq,start,dur,type='sine',gain=.12){
    const ac=ctx(); if(!ac)return;
    const osc=ac.createOscillator(), amp=ac.createGain(), t=ac.currentTime+start;
    osc.type=type; osc.frequency.setValueAtTime(freq,t);
    amp.gain.setValueAtTime(0.0001,t); amp.gain.exponentialRampToValueAtTime(gain,t+.02); amp.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    osc.connect(amp); amp.connect(ac.destination); osc.start(t); osc.stop(t+dur+.02);
  }
  const SFX={
    tap:()=>tone(660,0,.08,'triangle',.07),
    place:()=>{tone(520,0,.1,'triangle');tone(780,.07,.12,'triangle');},
    good:()=>{tone(660,0,.12);tone(880,.1,.14);tone(1175,.2,.2);},
    oops:()=>{tone(330,0,.14,'sine',.08);tone(294,.12,.18,'sine',.07);},
    win:()=>{[523,659,784,1047].forEach((f,i)=>tone(f,i*.12,.24,'triangle',.11));},
    roll:()=>{for(let i=0;i<5;i++)tone(300+Math.random()*300,i*.05,.05,'square',.03);}
  };
  function hwSfx(kind){ if(settings.sound&&SFX[kind])try{SFX[kind]();}catch(e){} }

  /* 한국어 목소리 고르기: 아이에게 친근한 여성·밝은 목소리를 먼저, 남성·어르신 목소리는 자동 선택에서 뺀다.
     기기마다 이름이 달라서(유나/Yuna, Google 한국의, Microsoft SunHi…) 이름 조각으로 점수를 매긴다.
     부모님이 고른 목소리(settings.voiceName)가 있으면 그것을 쓴다. */
  const VOICE_PREFER=[[/유나|yuna/i,100],[/sunhi|선희/i,95],[/google.*(한국|korean)/i,90],[/heami|혜미/i,88],[/sora|소라/i,86],[/jihun|지훈/i,-50],[/injoon|인준|minsu|민수/i,-60],[/flo/i,80],[/sandy/i,75],[/shelley/i,72],[/grandma/i,40],[/female|여성|woman/i,70],[/eddy|reed|rocko|grandpa|male|남성/i,-100]];
  const VOICE_NICK=[[/유나|yuna/i,'유나 (또렷한 누나)'],[/flo/i,'플로 (밝은 목소리)'],[/sandy/i,'샌디 (다정한 목소리)'],[/shelley/i,'셸리 (차분한 목소리)'],[/grandma/i,'할머니'],[/grandpa/i,'할아버지'],[/eddy/i,'에디 (남성)'],[/reed/i,'리드 (남성)'],[/rocko/i,'로코 (남성)'],[/google/i,'구글 한국어'],[/sunhi|선희/i,'선희'],[/heami|혜미/i,'혜미']];
  let koVoice=null;
  function koVoices(){ return ('speechSynthesis' in window)?speechSynthesis.getVoices().filter(v=>/^ko/i.test(v.lang)):[]; }
  function voiceScore(v){ let score=0; VOICE_PREFER.forEach(([re,n])=>{ if(re.test(v.name))score+=n; }); if(v.localService)score+=2; return score; }
  function voiceNick(v){ const hit=VOICE_NICK.find(([re])=>re.test(v.name)); return hit?hit[1]:v.name.replace(/\s*\(.*\)\s*/,''); }
  function pickVoice(){
    const list=koVoices(); if(!list.length){ koVoice=null; return; }
    const chosen=settings.voiceName&&list.find(v=>v.name===settings.voiceName);
    koVoice=chosen||list.slice().sort((a,b)=>voiceScore(b)-voiceScore(a))[0];
  }
  if('speechSynthesis' in window){ pickVoice(); speechSynthesis.addEventListener&&speechSynthesis.addEventListener('voiceschanged',pickVoice); }
  function plain(text){ const box=document.createElement('div'); box.innerHTML=String(text); return box.textContent.replace(/\s+/g,' ').trim(); }
  function speakWith(voice,words){
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(words);
    u.lang='ko-KR'; u.rate=.98; u.pitch=1.15; if(voice)u.voice=voice;
    speechSynthesis.speak(u);
  }
  /* 가족 목소리: mom-voice.js가 hwMomVoicePlan(문장)을 주면, 녹음된 문장은 녹음으로, 나머지는 기계 목소리로 이어 읽는다 */
  let sayRun=0, clipAudio=null;
  function stopClip(){ if(clipAudio){ try{ clipAudio.pause(); }catch(e){} clipAudio.onended=clipAudio.onerror=null; } }
  function speakTTS(words,onend){
    if(!('speechSynthesis' in window)){ if(onend)onend(); return; }
    if(!koVoice)pickVoice();
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(words);
    u.lang='ko-KR'; u.rate=.98; u.pitch=1.15; if(koVoice)u.voice=koVoice;
    if(onend){ u.onend=onend; u.onerror=onend; }
    speechSynthesis.speak(u);
  }
  function playPlan(plan){
    const run=++sayRun; let i=0;
    const next=()=>{
      if(run!==sayRun||i>=plan.length)return;
      const item=plan[i++];
      if(item.url){
        if(!clipAudio)clipAudio=new Audio();
        stopClip();
        clipAudio.src=item.url;
        clipAudio.onended=next;
        clipAudio.onerror=()=>{ if(run===sayRun)speakTTS(item.text,next); };
        const p=clipAudio.play(); if(p&&p.catch)p.catch(()=>{ if(run===sayRun)speakTTS(item.text,next); });
      }else speakTTS(item.text,next);
    };
    next();
  }
  function hwSay(text,force){
    if(!settings.voice&&!force)return false;
    const words=plain(text); if(!words)return false;
    if(window.hwMusic)hwMusic.duck(Math.min(9000,1200+words.length*90));
    sayRun++; stopClip();
    try{
      const plan=typeof window.hwMomVoicePlan==='function'?window.hwMomVoicePlan(words):null;
      if(plan){ if('speechSynthesis' in window)speechSynthesis.cancel(); playPlan(plan); return true; }
    }catch(e){}
    if(!('speechSynthesis' in window))return false;
    if(!koVoice)pickVoice();
    try{ speakWith(koVoice,words); return true; }catch(e){ return false; }
  }
  /* 녹음 화면의 "예시 듣기": 녹음 대신 늘 기계 목소리로 */
  function hwSayTTS(text){ sayRun++; stopClip(); const words=plain(text); if(!words)return; try{ speakTTS(words); }catch(e){} }
  /* 부모님 화면용: 고를 수 있는 목소리 목록(추천 순), 미리 듣기, 선택 저장 */
  function hwVoiceOptions(){
    return koVoices().map(v=>({name:v.name,nick:voiceNick(v),score:voiceScore(v),current:koVoice&&koVoice.name===v.name}))
      .sort((a,b)=>b.score-a.score);
  }
  function hwPreviewVoice(name){
    const v=koVoices().find(x=>x.name===name); if(!v)return;
    try{ speakWith(v,'안녕! 나는 호플이야. 오늘도 같이 재미있게 놀자!'); }catch(e){}
  }
  function hwSetVoice(name){ settings.voiceName=name||''; saveSettings(); pickVoice(); }
  function hwHush(){ sayRun++; stopClip(); try{ if('speechSynthesis' in window)speechSynthesis.cancel(); }catch(e){} }
  function hwCanSpeak(){ return 'speechSynthesis' in window; }

  function hasBatchim(word){
    const s=String(word).trim(); if(!s)return false;
    const last=s.charCodeAt(s.length-1);
    if(last>=0xAC00&&last<=0xD7A3)return (last-0xAC00)%28!==0;
    return /[013678]$/.test(s)||/[lmnr]$/i.test(s);
  }
  /* hwJosa('숫자 징검다리','을/를') → '숫자 징검다리를' */
  function hwJosa(word,pair){ const [withB,without]=pair.split('/'); return word+(hasBatchim(word)?withB:without); }

  function syncSettingButtons(){
    document.querySelectorAll('[data-setting]').forEach(btn=>{
      const key=btn.dataset.setting, on=Boolean(settings[key]);
      btn.setAttribute('aria-pressed',on?'true':'false');
      btn.dataset.on=on?'1':'0';
      const label=btn.querySelector('[data-setting-label]');
      const NAME={sound:'효과음',voice:'읽어주기',music:'배경음악'};
      if(label)label.textContent=(NAME[key]||key)+(on?' 켜짐':' 꺼짐');
    });
  }
  function hwToggleSetting(key){
    settings[key]=!settings[key];
    if(key==='music'&&window.hwMusic)hwMusic.refresh();
    if(key==='voice'&&!settings.voice)hwHush();
    saveSettings();
    if(key==='sound'&&settings.sound)hwSfx('tap');
    if(key==='voice'&&settings.voice)hwSay('읽어주기를 켰어요.');
  }

  function hwIcon(name){ return `<svg class="ui-icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`; }

  /* 게임 준비 화면을 같은 구조로 만든다. 레벨·규칙·시작 버튼은 공통 전역(setLevel, showRules, toggleThinking)을 쓴다. */
  function hwSetupMarkup(o){
    const id=o.id;
    const points=(o.points||[]).map(([ic,title,text])=>`<div class="thinking-item"><b>${hwIcon(ic)}${title}</b><small>${text}</small></div>`).join('');
    const levels=(o.levels||[]).map(([name,sub],i)=>`<button data-lv="${i+1}" data-on="${i===0?'1':'0'}" aria-pressed="${i===0?'true':'false'}" onclick="setLevel('${id}',${i+1})"><b>${name}</b><small>${sub}</small></button>`).join('');
    return `
    <div class="pagebar"><button onclick="backHub()" aria-label="홈으로 돌아가기">${hwIcon('chevron-left')}</button><span>${o.title}</span><button onclick="showRules('${id}')" aria-label="게임 방법 보기">?</button></div>
    <div class="setup-card">
      <div class="intro">
        <div class="big-em duo-stage" id="${id}SetupEm" aria-hidden="true">${o.art}</div>
        <div class="intro-copy">
          <h2 class="game-title-heading"><button class="game-title-button" id="${id}TitleBtn" aria-expanded="false" aria-controls="${id}Thinking" onclick="toggleThinking('${id}')"><span>${o.title} <i>i</i></span></button></h2>
          <small class="skill-hint">제목을 눌러 재미 포인트 보기</small>
          <p class="desc">${o.desc}</p>
          <div class="game-meta"><span>${o.age}</span><span>${hwIcon('users')}${o.players}</span><span>${hwIcon('clock')}${o.time}</span></div>
        </div>
      </div>
      <div class="thinking-panel" id="${id}Thinking" hidden><strong>이 게임의 재미 포인트</strong><div class="thinking-grid">${points}</div></div>
      ${o.extra||''}
      <div class="difficulty-progress"><i><span id="${id}LevelFill"></span></i><b id="${id}LevelCount">1 / 3</b></div>
      <div class="choice-label"><span>${o.levelQuestion}</span><small>${o.levelHint}</small></div>
      <div class="seg three" id="${id}LevelSeg">${levels}</div>
      <p class="level-note" id="${id}LevelNote"></p>
      <div class="row">
        <button class="btn blue big" onclick="${id}_start('solo')">${o.soloLabel||'혼자 시작'}</button>
        ${o.noDuo?'':`<button class="btn red big" onclick="${id}_start('duo')">둘이 시작</button>`}
      </div>
      <div class="foot"><button class="btn ghost" onclick="showRules('${id}')">${hwIcon('play')} 게임 방법 듣고 보기</button></div>
    </div>`;
  }

  /* 첫 판 손가락 안내: 호플이가 말로 알려 주고, 손가락이 눌러야 할 곳을 톡톡 두드린다.
     step={el, text, tap}. tap 단계는 아이가 그 자리를 직접 눌러야 다음으로 넘어간다 (진짜 첫 수를 같이 둔다).
     el은 단계가 시작될 때 찾으므로 게임 화면이 바뀐 뒤의 요소(반짝이는 칸 등)도 가리킬 수 있다. */
  const COACH_VER='hw_guide2_';
  let coachState=null;
  function hwCoach(gameId,steps){
    const key=COACH_VER+gameId;
    if(storageGet(key)||!steps||!steps.length)return;
    if(coachState)hwCoachDone(false);
    coachState={key,steps,index:0,timer:0};
    let layer=document.getElementById('hwCoach');
    if(!layer){
      layer=document.createElement('div');
      layer.id='hwCoach'; layer.className='hw-coach'; layer.setAttribute('role','dialog'); layer.setAttribute('aria-modal','false');
      layer.innerHTML='<div class="hw-coach-ring" aria-hidden="true"></div><div class="hw-coach-finger" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M26 6c3.3 0 6 2.7 6 6v17.5l14.2 3.1c4.3.9 7.1 5.1 6.4 9.4l-2.1 12.6A10 10 0 0 1 40.6 63H30.1a10 10 0 0 1-8-4L9.6 42.3a5.2 5.2 0 0 1 7.5-7.1L20 38V12c0-3.3 2.7-6 6-6z" fill="#fff" stroke="#2b2521" stroke-width="3" stroke-linejoin="round"/></svg></div><div class="hw-coach-bubble"><span class="hw-coach-art" aria-hidden="true"></span><p id="hwCoachText"></p><div class="hw-coach-actions"><button type="button" class="hw-coach-skip" onclick="hwCoachDone()">건너뛰기</button><button type="button" class="hw-coach-next" onclick="hwCoachNext()">다음</button></div></div>';
      document.body.appendChild(layer);
      document.addEventListener('click',coachTap,true);
      window.addEventListener('resize',placeCoach); window.addEventListener('scroll',placeCoach,true);
    }
    layer.querySelector('.hw-coach-art').innerHTML=typeof hwChar==='function'?hwChar('hopple','guide'):'';
    showCoachStep();
  }
  function coachTarget(){ if(!coachState)return null; const step=coachState.steps[coachState.index]; return step?document.querySelector(step.el):null; }
  function placeCoach(){
    const layer=document.getElementById('hwCoach'); if(!layer||!coachState)return;
    const step=coachState.steps[coachState.index], target=coachTarget();
    const ring=layer.querySelector('.hw-coach-ring'), bubble=layer.querySelector('.hw-coach-bubble'), finger=layer.querySelector('.hw-coach-finger');
    if(!target){ ring.style.display='none'; finger.style.display='none'; bubble.style.top='30%'; return; }
    const r=target.getBoundingClientRect();
    Object.assign(ring.style,{display:'block',left:(r.left-6)+'px',top:(r.top-6)+'px',width:(r.width+12)+'px',height:(r.height+12)+'px'});
    finger.style.display=step.tap?'block':'none';
    finger.style.left=(r.left+r.width/2-14)+'px'; finger.style.top=(r.top+Math.min(r.height/2,70)-6)+'px';
    const bh=bubble.offsetHeight||150;
    if(step.tap){
      /* 직접 누르는 단계: 판을 가리지 않게 화면 아래(또는 위) 가장자리에 둔다 */
      const bottomTop=window.innerHeight-bh-16;
      bubble.style.top=(r.bottom+60<bottomTop||r.top<bh+40?bottomTop:12)+'px';
    }else{
      const below=r.bottom+bh+20<window.innerHeight;
      bubble.style.top=(below?r.bottom+14:Math.max(12,r.top-bh-14))+'px';
    }
  }
  function showCoachStep(){
    const layer=document.getElementById('hwCoach'); if(!layer||!coachState)return;
    const step=coachState.steps[coachState.index], target=document.querySelector(step.el);
    if(!target&&step.tap){ hwCoachNext(); return; }
    layer.classList.add('on'); layer.dataset.tap=step.tap?'1':'0';
    layer.querySelector('#hwCoachText').textContent=step.text;
    const next=layer.querySelector('.hw-coach-next');
    next.hidden=Boolean(step.tap);
    next.textContent=coachState.index===coachState.steps.length-1?'해볼게요!':'다음';
    if(target){ const r=target.getBoundingClientRect(); if(r.top<0||r.bottom>window.innerHeight)target.scrollIntoView({block:'center',behavior:'instant'}); }
    placeCoach();
    hwSay(step.text);
    if(!step.tap)requestAnimationFrame(()=>next.focus());
  }
  /* tap 단계: 손가락이 가리키는 자리 안을 누르면 게임이 그 누름을 처리한 뒤 다음 단계로 */
  function coachTap(ev){
    if(!coachState)return;
    const step=coachState.steps[coachState.index]; if(!step||!step.tap)return;
    if(ev.target.closest&&ev.target.closest('.hw-coach-bubble'))return;
    const target=coachTarget(); if(!target)return;
    const r=target.getBoundingClientRect();
    if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)return;
    clearTimeout(coachState.timer);
    const state=coachState;
    state.timer=setTimeout(()=>{ if(coachState===state)hwCoachNext(); },step.wait||250);
  }
  function hwCoachNext(){ if(!coachState)return; coachState.index++; if(coachState.index>=coachState.steps.length)hwCoachDone(); else showCoachStep(); }
  function hwCoachDone(finished=true){ if(coachState){ clearTimeout(coachState.timer); if(finished)storageSet(coachState.key,'1'); } coachState=null; const layer=document.getElementById('hwCoach'); if(layer)layer.classList.remove('on'); hwHush(); }

  /* 놀이 기록: 혼자 하기로 끝까지 한 판만, 이 기기에만 저장한다. 서버로 보내지 않는다. */
  const LOG_KEY='hw_playlog_v1', LOG_KEEP=40;
  function hwLogAll(){ const log=readJSON(LOG_KEY,null); return log&&Array.isArray(log.sessions)?log:{v:1,sessions:[]}; }
  function hwLogSession(game,data){
    if(!game||!data)return;
    const log=hwLogAll();
    log.sessions.push({g:game,t:Date.now(),...data});
    const kept=[], count={};
    for(let i=log.sessions.length-1;i>=0;i--){ const s=log.sessions[i]; count[s.g]=(count[s.g]||0)+1; if(count[s.g]<=LOG_KEEP)kept.unshift(s); }
    log.sessions=kept;
    storageSet(LOG_KEY,JSON.stringify(log));
  }
  function hwLogSessions(game){ return hwLogAll().sessions.filter(s=>!game||s.g===game); }
  function hwLogClear(){ try{ localStorage.removeItem(LOG_KEY); }catch(e){} }

  window.HW_SETTINGS=settings;
  Object.assign(window,{hwSfx,hwSay,hwSayTTS,hwPlainText:plain,hwSaveSettings:saveSettings,hwHush,hwCanSpeak,hwJosa,hwToggleSetting,hwReadJSON:readJSON,hwStore:storageSet,hwSyncSettings:syncSettingButtons,hwIcon,hwSetupMarkup,hwCoach,hwCoachNext,hwCoachDone,hwLogSession,hwLogSessions,hwLogClear,hwVoiceOptions,hwPreviewVoice,hwSetVoice});
  document.addEventListener('DOMContentLoaded',syncSettingButtons);
})();
