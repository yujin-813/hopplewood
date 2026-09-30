/*
 * 부모님 게임 안내 — 한눈에 보는 표 + 게임별 한 페이지
 * 아이 화면에는 보이지 않고, 부모님 리포트(parentOverlay) 안에서만 쓴다.
 * 표현 원칙: "길러 준다"가 아니라 "게임 규칙 안에서 이런 생각을 쓴다"로 쓴다. 점수·또래 비교 없음.
 * 의존 전역: HW_GAMES(게임별 guide·insight), hwChar, hwIcon, hwJosa, hwLogSessions, hwLogClear, openSetup, hideParent
 */
(function(){
  const AREAS=[
    {id:'obs',  label:'관찰·주의', short:'관찰', icon:'eye',     desc:'필요한 곳에 눈을 모으고 작은 차이를 알아차리는 힘'},
    {id:'num',  label:'수·논리',   short:'수', icon:'grid',    desc:'수를 더하고 빼며 규칙에 따라 따져 보는 힘'},
    {id:'space',label:'공간 감각', short:'공간', icon:'puzzle',  desc:'위치·방향·모양을 머릿속에 그리고 돌려 보는 힘'},
    {id:'plan', label:'계획·전략', short:'계획', icon:'route',   desc:'몇 수 앞을 내다보고 더 좋은 선택을 고르는 힘'},
    {id:'self', label:'조절·끈기', short:'끈기', icon:'shield',  desc:'바로 누르고 싶은 마음을 참고, 틀려도 다시 해 보는 힘'}
  ];

  /* 게임별 안내는 각 게임의 guide(games/<id>-<name>/game.js)에서 온다. areas: 2 = 주로 쓰는 영역, 1 = 함께 쓰는 영역 */
  const GUIDE=HW_GAMES.list().map(g=>({id:g.id,title:g.title,...g.guide,insight:g.insight}));


  const LIMIT='게임이 이 능력을 길러 준다고 보장하지는 않아요. 게임 규칙 안에서 이런 생각을 자주 쓰게 된다는 뜻이에요.';

  function art(g){
    if(typeof g.art==='function'){ try{ return g.art(); }catch(e){ return hwChar('hopple','face'); } }
    return hwChar(g.art||'hopple','face');
  }
  const mark=v=>v===2?'<i class="pg-dot main" aria-hidden="true"></i><span class="sr-only">주로 써요</span>':(v===1?'<i class="pg-dot sub" aria-hidden="true"></i><span class="sr-only">함께 써요</span>':'<span class="sr-only">거의 쓰지 않아요</span>');

  /* ---------- 우리 아이 놀이 기록 ---------- */
  const MIN_SESSIONS=3;
  const LEVEL_NAME={1:'쉬움',2:'보통',3:'어려움'};
  const add=(list,k)=>list.reduce((n,x)=>n+(Number(x[k])||0),0);
  const ratio=(a,b)=>b?a/b:null;
  /* 최근 3판과 그 전 3판을 비교해 15%p 이상 달라졌을 때만 변화로 말한다. */
  function trendOf(list,fn){
    if(list.length<6)return null;
    const r=fn(list.slice(-3)), p=fn(list.slice(-6,-3));
    if(r==null||p==null)return null;
    return r-p>=.15?'up':(p-r>=.15?'down':'same');
  }
  const TREND_TEXT={up:'최근 3판에서 늘었어요',same:'꾸준해요',down:'최근 판에서는 조금 줄었어요'};
  function levelNote(list){
    const c={}; list.forEach(x=>{ if(x.level)c[x.level]=(c[x.level]||0)+1; });
    const top=Object.keys(c).sort((a,b)=>c[b]-c[a])[0];
    return top?'주로 '+LEVEL_NAME[top]+' 난이도':'';
  }



  function reportCard(g){
    const list=hwLogSessions(g.id);
    const head=`<header><span class="pg-mini-art" aria-hidden="true">${art(g)}</span><b>${g.title}</b>`;
    if(typeof hwGameOpen==='function'&&!hwGameOpen(g.id))return `<article class="pr-card waiting locked">${head}<small>${hwIcon('lock')}</small></header><p>기본 놀이팩에서 볼 수 있어요.</p></article>`;
    if(list.length<MIN_SESSIONS){
      const left=MIN_SESSIONS-list.length;
      return `<article class="pr-card waiting">${head}<small>${list.length}판 기록</small></header><p>혼자 하기로 <b>${left}판</b> 더 하면 보여 드려요.</p><i class="pr-bar" aria-hidden="true"><span style="width:${list.length/MIN_SESSIONS*100}%"></span></i></article>`;
    }
    const info=g.insight(list,{add,ratio}), trend=trendOf(list,info.metric);
    const badge=trend?`<span class="pr-trend ${trend}">${info.metricName} · ${TREND_TEXT[trend]}</span>`:'';
    return `<article class="pr-card">${head}<small>${list.length}판 · ${levelNote(list)}</small></header>
      ${badge}
      <ul>${info.lines.map(l=>`<li>${l}</li>`).join('')}</ul>
      <p class="pr-tip">${info.tip}</p></article>`;
  }

  function reportMarkup(){
    const all=hwLogSessions();
    const last=all.length?new Date(all[all.length-1].t):null;
    const when=last?`${last.getMonth()+1}월 ${last.getDate()}일`:'';
    return `
      <section class="pr-report" aria-labelledby="prTitle">
        <h3 id="prTitle">최근 놀이에서 보인 모습</h3>
        <p class="pg-lead">${all.length?`혼자 하기로 끝까지 한 판 <b>${all.length}판</b>을 모았어요. 마지막 기록 ${when}.`:'아직 기록이 없어요. 아이가 혼자 하기로 한 판을 끝내면 여기에 모여요.'}</p>
        <div class="pr-cards">${GUIDE.map(reportCard).join('')}</div>
        <p class="pr-note">점수나 또래 비교가 아니라, 지난 판의 우리 아이와 비교한 관찰 기록이에요. 둘이 하기 판은 누구의 기록인지 알 수 없어 모으지 않아요. 기록은 이 기기에만 저장돼요.</p>
        ${all.length?`<button type="button" class="pr-clear" id="prClearBtn" onclick="pgClearLog()">놀이 기록 지우기</button>`:''}
      </section>`;
  }
  /* ---------- 설치·체험·스토어 구매 흐름 (이 기기 안에서만) ---------- */
  const FUNNEL_LABEL={landing_view:'소개 페이지 열기',install_click:'설치 버튼 누름',install_complete:'설치 완료',app_open:'게임 열기',game_open:'게임 시작',game_complete:'게임 완료',paywall_view:'잠긴 콘텐츠 확인',checkout_guide_click:'구매 안내 열기',store_purchase_info_view:'앱 구매 방식 확인',purchase_start:'스토어 결제 시작',purchase_result:'스토어 결제 결과',restore_result:'구매 복원 결과',pack_unlock:'놀이팩 열림'};
  function funnelMarkup(){
    if(typeof hwFunnelSummary!=='function')return '';
    const data=hwFunnelSummary(),counts=data.counts||{},events=data.events||[];
    const items=Object.entries(FUNNEL_LABEL).filter(([key])=>counts[key]).map(([key,label])=>`<li><span>${label}</span><b>${counts[key]}회</b></li>`).join('');
    const a=data.attribution&&data.attribution.last;
    const source=a?[a.utm_source,a.utm_campaign,a.ref,a.from].filter(Boolean).join(' · '):'';
    return `<section class="pf-data" aria-labelledby="pfTitle">
      <h3 id="pfTitle">이 기기의 설치·이용 흐름</h3>
      <p class="pg-lead">개인정보나 아이 식별값 없이 이 기기에서 일어난 단계만 저장해요. 운영자 서버로 자동 전송하지 않아요.</p>
      ${source?`<p class="pf-source">처음 들어온 경로: <b>${source}</b></p>`:''}
      ${items?`<ul class="pf-counts">${items}</ul>`:'<p class="pf-empty">아직 기록된 공개 흐름이 없어요.</p>'}
      <div class="pf-actions">${events.length?'<button type="button" onclick="hwFunnelExport()">CSV로 내보내기</button><button type="button" class="danger" id="pfClearBtn" onclick="pgClearFunnel()">이 흐름 기록 지우기</button>':''}</div>
    </section>`;
  }
  /* ---------- 읽어주기 목소리 고르기 ---------- */
  function voiceMarkup(){
    if(typeof hwVoiceOptions!=='function')return '';
    const opts=hwVoiceOptions();
    if(!opts.length)return `<section class="pv-voice"><h3>읽어주기 목소리</h3><p class="pg-lead">이 기기에는 한국어 읽어주기 목소리가 없어요. 기기 설정의 ‘음성 콘텐츠’에서 한국어 목소리를 내려받으면 쓸 수 있어요.</p></section>`;
    const rec=opts.filter(o=>o.score>0), rest=opts.filter(o=>o.score<=0);
    const row=o=>`<li class="${o.current?'on':''}"><button type="button" class="pv-pick" aria-pressed="${o.current?'true':'false'}" onclick="pgPickVoice(${JSON.stringify(o.name).replace(/"/g,'&quot;')})"><span class="pv-radio" aria-hidden="true"></span><span>${o.nick}${o.recommended?'<small class="pv-rec">자동 추천</small>':''}</span></button><button type="button" class="pv-listen" onclick="hwPreviewVoice(${JSON.stringify(o.name).replace(/"/g,'&quot;')})" aria-label="${o.nick} 들어보기">${hwIcon('sound')} 들어보기</button></li>`;
    return `<section class="pv-voice" aria-labelledby="pvTitle">
      <h3 id="pvTitle">읽어주기 목소리</h3>
      <p class="pg-lead">또렷하고 자연스러운 한국어 음성을 자동으로 골랐어요. 재생 파일을 앱에 넣지 않고, 이 기기에 있는 목소리만 사용해요.</p>
      <ul class="pv-list">${rec.map(row).join('')}</ul>
      ${rest.length?`<details class="pv-more"><summary>다른 목소리 ${rest.length}개</summary><ul class="pv-list">${rest.map(row).join('')}</ul></details>`:''}
    </section>`;
  }
  function pgPickVoice(name){
    hwSetVoice(name); hwPreviewVoice(name);
    const root=document.getElementById('parentGuide'), sec=root&&root.querySelector('.pv-voice');
    if(sec){ const wasOpen=!!sec.querySelector('details[open]'); sec.outerHTML=voiceMarkup(); if(wasOpen){ const d=root.querySelector('.pv-voice details'); if(d)d.open=true; } }
  }
  if('speechSynthesis' in window&&speechSynthesis.addEventListener){
    speechSynthesis.addEventListener('voiceschanged',()=>{ const root=document.getElementById('parentGuide'), sec=root&&root.querySelector('.pv-voice'); if(sec)sec.outerHTML=voiceMarkup(); });
  }

  function pgClearLog(){
    const btn=document.getElementById('prClearBtn'); if(!btn)return;
    if(btn.dataset.confirm!=='1'){ btn.dataset.confirm='1'; btn.textContent='정말 지울까요? 한 번 더 누르면 지워져요'; return; }
    hwLogClear(); pgOpen('report');
  }
  function pgClearFunnel(){
    const btn=document.getElementById('pfClearBtn'); if(!btn)return;
    if(btn.dataset.confirm!=='1'){ btn.dataset.confirm='1'; btn.textContent='한 번 더 누르면 지워져요'; return; }
    hwFunnelClear(); pgOpen('pack');
  }

  function overviewMarkup(){
    const head=AREAS.map(a=>`<th scope="col" abbr="${a.label}"><span class="pg-area-ic">${hwIcon(a.icon)}</span><span aria-hidden="true">${a.short}</span><span class="sr-only">${a.label}</span></th>`).join('');
    const rows=GUIDE.map(g=>`<tr><th scope="row"><button type="button" class="pg-row-btn" onclick="pgOpen('${g.id}')"><span class="pg-mini-art" aria-hidden="true">${art(g)}</span><span class="pg-row-name">${g.title}</span></button></th>${AREAS.map(a=>`<td>${mark(g.areas[a.id]||0)}</td>`).join('')}</tr>`).join('');
    const legend=AREAS.map(a=>`<li><span class="pg-area-ic">${hwIcon(a.icon)}</span><b>${a.label}</b><span>${a.desc}</span></li>`).join('');
    return `
      <section class="pg-overview" aria-labelledby="pgOverviewTitle">
        <h3 id="pgOverviewTitle">게임마다 쓰는 생각, 한눈에 보기</h3>
        <p class="pg-lead">게임 이름을 누르면 그 게임 한 페이지 설명이 열려요.</p>
        <button type="button" class="btn ghost pg-story-replay" onclick="pgReplayStory()">호플우드 처음 이야기 다시 보기</button>
        <div class="pg-key" aria-hidden="true"><span><i class="pg-dot main"></i>주로 써요</span><span><i class="pg-dot sub"></i>함께 써요</span></div>
        <div class="pg-table-wrap"><table class="pg-table"><colgroup><col class="pg-col-game">${AREAS.map(()=>'<col>').join('')}</colgroup><thead><tr><th scope="col"><span class="sr-only">게임</span></th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
        <ul class="pg-legend">${legend}</ul>
      </section>`;
  }

  function detailMarkup(g){
    const i=GUIDE.indexOf(g), prev=GUIDE[(i+GUIDE.length-1)%GUIDE.length], next=GUIDE[(i+1)%GUIDE.length];
    const chips=AREAS.filter(a=>g.areas[a.id]).sort((a,b)=>g.areas[b.id]-g.areas[a.id])
      .map(a=>`<span class="pg-chip ${g.areas[a.id]===2?'main':'sub'}">${hwIcon(a.icon)}${a.label}<small>${g.areas[a.id]===2?'주로':'함께'}</small></span>`).join('');
    const steps=g.steps.map(([ic,t,d],n)=>`<li><span class="pg-step-ic">${hwIcon(ic)}</span><b>${t}</b><span>${d}</span></li>${n<g.steps.length-1?'<li class="pg-arrow" aria-hidden="true">'+hwIcon('chevron-right')+'</li>':''}`).join('');
    const levels=g.levels.map(([name,d],n)=>`<li data-lv="${n+1}"><b>${name}</b><span>${d}</span></li>`).join('');
    const signs=g.signs.map(s=>`<li>${hwIcon('sparkles')}<span>${s}</span></li>`).join('');
    return `
      <section class="pg-detail" aria-labelledby="pgDetailTitle">
        <div class="pg-nav"><button type="button" class="pg-back" onclick="pgOpen(null)">${hwIcon('chevron-left')} 게임 전체 보기</button><span>${i+1} / ${GUIDE.length}</span></div>
        <header class="pg-hero">
          <span class="pg-hero-art" aria-hidden="true">${art(g)}</span>
          <div><h3 id="pgDetailTitle">${g.title}</h3><p>${g.line}</p></div>
        </header>
        <div class="pg-chips">${chips}</div>

        <h4>아이 머릿속에서 일어나는 일</h4>
        <ol class="pg-steps">${steps}</ol>

        <h4>난이도가 오르면 이렇게 달라져요</h4>
        <ol class="pg-levels">${levels}</ol>

        <h4>이런 모습이 보이면 잘하고 있는 거예요</h4>
        <ul class="pg-signs">${signs}</ul>

        <h4>집에서 같이 해 보기</h4>
        <p class="pg-talk">${g.talk}</p>

        <p class="pg-limit">${LIMIT}</p>

        <div class="pg-actions">
          <button type="button" class="btn ghost" onclick="pgOpen('${prev.id}')">${hwIcon('chevron-left')} ${prev.title}</button>
          <button type="button" class="btn ghost" onclick="pgOpen('${next.id}')">${next.title} ${hwIcon('chevron-right')}</button>
        </div>
        <button type="button" class="btn blue big pg-play" onclick="pgPlay('${g.id}')">${hwIcon('play')} 아이와 이 게임 시작하기</button>
      </section>`;
  }

  /* ---------- 탭 ----------
     리포트 · 게임 안내 · 목소리 · 놀이팩·안내. 처음 열면 놀이팩을 샀으면 리포트, 안 샀으면 놀이팩·안내를 보인다
     (스토어 심사 안내: 부모님 화면에서 바로 기본 놀이팩을 찾을 수 있게). */
  const TABS=[['report','리포트','parent'],['guide','게임 안내','grid'],['voice','목소리','speak'],['pack','놀이팩·안내','star']];
  const TAB_IDS=TABS.map(t=>t[0]);
  let tab='report';
  function defaultTab(){ return (typeof hwFullAccess==='function'&&!hwFullAccess())?'pack':'report'; }
  function renderTabs(){
    const bar=document.getElementById('parentTabs'); if(!bar)return;
    bar.innerHTML=TABS.map(([id,label,ic])=>`<button type="button" role="tab" id="pgTab-${id}" aria-controls="parentGuide" aria-selected="${id===tab?'true':'false'}" data-on="${id===tab?'1':'0'}" onclick="pgTab('${id}')">${hwIcon(ic)}<span>${label}</span></button>`).join('');
    const panel=document.getElementById('parentGuide'); if(panel)panel.setAttribute('aria-labelledby','pgTab-'+tab);
  }
  /* 놀이팩·안내 탭의 고정 안내(index.html #parentInfo)는 탭 안으로 옮겨 보이고, 다른 탭에서는 제자리로 돌려 숨긴다 */
  function parkInfo(){
    const info=document.getElementById('parentInfo'), root=document.getElementById('parentGuide');
    if(info&&root&&root.contains(info)){ root.parentNode.insertBefore(info,root.nextSibling); }
    if(info)info.hidden=true;
  }
  function tabMarkup(){
    const mv=window.hwMomVoice;
    if(tab==='guide')return overviewMarkup();
    if(tab==='voice')return (mv?mv.entryMarkup():'')+voiceMarkup();
    if(tab==='pack')return (typeof hwPackMarkup==='function'?hwPackMarkup():'')+'<div id="pgInfoSlot"></div>'+funnelMarkup();
    return reportMarkup();
  }
  /* pgOpen(undefined): 새로 열기(기본 탭) · pgOpen(null): 지금 탭으로 돌아가기 · pgOpen('report'|'guide'|'voice'|'pack'): 탭
     pgOpen('g3' 같은 게임 id): 게임 안내 탭의 한 페이지 설명 · pgOpen('familyVoice'): 목소리 탭의 가족 목소리 녹음 */
  function pgOpen(id){
    const root=document.getElementById('parentGuide'); if(!root)return;
    const g=GUIDE.find(x=>x.id===id), mv=window.hwMomVoice;
    if(mv&&id!=='familyVoice')mv.release();
    const narrationStudio=/[?&]narration-studio=1(?:&|$)/.test(location.search);
    if(id==='familyVoice'&&mv&&!narrationStudio&&typeof hwFeatureOpen==='function'&&!hwFeatureOpen('voice'))id='voice';
    if(id===undefined)tab=defaultTab();
    else if(TAB_IDS.includes(id))tab=id;
    else if(g)tab='guide';
    else if(id==='familyVoice')tab='voice';
    parkInfo(); renderTabs();
    const plan=document.getElementById('parentPlanStatus'); if(plan&&typeof hwPlanLabel==='function')plan.textContent=hwPlanLabel();
    const sheet=root.closest('.parent-sheet');
    if(id==='familyVoice'&&mv){ root.innerHTML=mv.panelMarkup(); if(sheet)sheet.scrollTop=root.offsetTop-60; const b=root.querySelector('.pg-back'); if(b)b.focus({preventScroll:true}); return; }
    root.innerHTML=g?detailMarkup(g):tabMarkup();
    const slot=document.getElementById('pgInfoSlot'), info=document.getElementById('parentInfo');
    if(slot&&info){ slot.replaceWith(info); info.hidden=false; }
    if(sheet&&(g||id===null))sheet.scrollTop=root.offsetTop-60;
    const focus=root.querySelector(g?'.pg-back':(id===null?'.pg-row-btn':null)); if(focus)focus.focus({preventScroll:true});
  }
  /* 탭 누르기: 탭 줄이 보이는 자리로 올려 준다 */
  function pgTab(id){
    pgOpen(id);
    const bar=document.getElementById('parentTabs'), sheet=bar&&bar.closest('.parent-sheet');
    if(bar&&sheet&&sheet.scrollTop>bar.offsetTop)sheet.scrollTop=bar.offsetTop-8;
  }
  function pgPlay(id){
    if(typeof hideParent==='function')hideParent();
    if(typeof openSetup==='function')openSetup(id);
  }
  function pgReplayStory(){
    if(typeof hideParent==='function')hideParent();
    if(window.hwForest){ hwForest.showForest(false); hwForest.showIntro(0,true); }
  }
  function pgInit(){ pgOpen(undefined); }

  window.PARENT_GUIDE=GUIDE;
  window.PARENT_AREAS=AREAS;
  Object.assign(window,{pgOpen,pgTab,pgPlay,pgReplayStory,pgInit,pgClearLog,pgClearFunnel,pgPickVoice});
})();
