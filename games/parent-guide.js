/*
 * 부모님 게임 안내 — 한눈에 보는 표 + 게임별 한 페이지
 * 아이 화면에는 보이지 않고, 부모님 리포트(parentOverlay) 안에서만 쓴다.
 * 표현 원칙: "길러 준다"가 아니라 "게임 규칙 안에서 이런 생각을 쓴다"로 쓴다. 점수·또래 비교 없음.
 * 의존 전역: hwChar, hwIcon, hwJosa, hwLogSessions, hwLogClear, g3_faceSVG(있으면), openSetup, hideParent
 */
(function(){
  const AREAS=[
    {id:'obs',  label:'관찰·주의', short:'관찰', icon:'eye',     desc:'필요한 곳에 눈을 모으고 작은 차이를 알아차리는 힘'},
    {id:'num',  label:'수·논리',   short:'수', icon:'grid',    desc:'수를 더하고 빼며 규칙에 따라 따져 보는 힘'},
    {id:'space',label:'공간 감각', short:'공간', icon:'puzzle',  desc:'위치·방향·모양을 머릿속에 그리고 돌려 보는 힘'},
    {id:'plan', label:'계획·전략', short:'계획', icon:'route',   desc:'몇 수 앞을 내다보고 더 좋은 선택을 고르는 힘'},
    {id:'self', label:'조절·끈기', short:'끈기', icon:'shield',  desc:'바로 누르고 싶은 마음을 참고, 틀려도 다시 해 보는 힘'}
  ];

  /* 2 = 주로 쓰는 영역, 1 = 함께 쓰는 영역 */
  const GUIDE=[
    {id:'g1',title:'길따라 쪼르르',art:'squirrel',
     line:'정해진 길을 읽고, 몇 차례 뒤 친구들이 어디서 만날지 미리 따져 보는 게임이에요.',
     areas:{obs:1,space:2,plan:2,self:1},
     steps:[['route','길 읽기','내 친구가 갈 칸을 1→2→3 순서로 봐요.'],['eye','두 길 겹쳐 보기','상대 친구 길도 눌러 만나는 칸을 찾아요.'],['target','한 칸 고르기','잡을지 피할지 정하고 움직여요.']],
     levels:[['쉬움','곧은 길, 2점 먼저 · 컴퓨터가 자주 실수'],['보통','네 번 겹치는 길 · 컴퓨터가 종종 실수'],['어려움','다섯 번 겹치는 길 · 첫 수부터 중요, 컴퓨터 실수 없음']],
     signs:['움직이기 전에 상대 친구를 눌러 두 길을 비교해요.','“여기 가면 잡혀” 처럼 다음 차례를 말로 설명해요.','잡을 기회보다 안전한 길을 고르는 순간이 있어요.'],
     talk:'“다음 차례에 너구리는 어디로 올 것 같아?” 하고 한 수 앞을 같이 짚어 보세요.'},
    {id:'g2',title:'모양 만들기',art:'owl',
     line:'내 목표 순서를 기억하면서, 내 줄은 잇고 상대 줄은 막는 게임이에요.',
     areas:{obs:2,space:1,plan:2,self:2},
     steps:[['eye','목표 기억하기','부엉이·파랑새 순서를 머릿속에 담아요.'],['swap','두 줄 번갈아 보기','내 줄과 상대 줄을 모두 살펴요.'],['shield','놓을까 참을까','상대 줄이 완성되는 자리는 피하고 막아요.']],
     levels:[['쉬움','5×5 판, 3칸 줄, 컴퓨터가 막기를 자주 놓쳐요'],['보통','6×6 판, 4칸 줄, 컴퓨터가 막기를 가끔 놓쳐요'],['어려움','7×7 판, 빠짐없이 막고 함정을 자주 노려요']],
     signs:['놓기 전에 상대 목표 줄을 한 번 확인해요.','실수로 상대 줄을 만든 뒤, 다음 판에서 같은 실수가 줄어요.','내 줄보다 막는 게 급한 순간을 알아채요.'],
     talk:'“상대는 어떤 순서를 만들고 있을까?” 상대 입장에서 보게 하는 질문이 좋아요.'},
    {id:'g3',title:'얼굴 짝꿍',art:'face',
     line:'반쪽 얼굴을 머리부터 입까지 하나씩 비교해, 딱 한 곳 다른 가짜를 찾아내는 게임이에요.',
     areas:{obs:2,space:1,self:2},
     steps:[['eye','반쪽 살펴보기','큰 카드의 머리·귀·눈·코·입을 봐요.'],['puzzle','한 곳씩 비교','후보와 부위를 차례로 맞춰 봐요.'],['sparkles','짝 고르기','틀리면 어느 부위가 달랐는지 듣고 다시 봐요.']],
     levels:[['쉬움','후보 3개, 확 다른 가짜'],['보통','후보 4개, 눈·코까지 비교'],['어려움','후보 6개, 아주 닮은 가짜']],
     signs:['한눈에 누르기보다 부위를 손가락으로 짚어 가며 비교해요.','힌트로 들은 부위를 다음 판에서 먼저 확인해요.','한 번에 찾는 판(반짝 별)이 점점 늘어요.'],
     talk:'“어디가 달랐어?” 하고 아이가 찾은 방법을 말로 설명하게 해 보세요.'},
    {id:'g4',title:'숫자 징검다리',art:'frog',
     line:'주사위 두 수로 더하기와 빼기를 직접 해 보고, 그 답으로 길을 잇는 수 게임이에요.',
     areas:{obs:1,num:2,space:2,plan:2},
     steps:[['grid','두 답 구하기','더한 답과 뺀 답을 스스로 계산해요.'],['eye','숫자 칸 찾기','판에서 그 수가 적힌 칸을 찾아요.'],['route','좋은 칸 고르기','내 길을 잇거나 상대 길을 막는 칸을 골라요.']],
     levels:[['쉬움','5×5 판, 주사위 1–4'],['보통','6×6 판, 주사위 1–6'],['어려움','7×7 판, 컴퓨터가 길을 막아요']],
     signs:['점 세기 도움 없이 바로 답하는 수가 늘어요.','합과 차를 둘 다 구한 뒤 길에 더 좋은 쪽을 골라요.','“놓을 칸이 없어요”를 정확히 판단해요.'],
     talk:'“4랑 2로 만들 수 있는 수는 뭐가 있을까?” 한 쌍의 수로 여러 답을 떠올려 보세요.'},
    {id:'g5',title:'비버 집짓기',art:'beaver',
     line:'조각을 머릿속으로 돌려 보며 빈틈 없이 채우는 공간 퍼즐이에요.',
     areas:{space:2,plan:1,self:2},
     steps:[['rotate','모양 떠올리기','돌리면 어떤 모양이 될지 생각해요.'],['puzzle','빈틈 읽기','남은 자리의 모양을 살펴요.'],['swap','넣고 바꿔 보기','안 맞으면 빼고 다시 놓아요.']],
     levels:[['쉬움','작은 집터, 돌리지 않아요'],['보통','4×4 집터, 돌리기'],['어려움','5×5 집터, 맞는 배치 1–2가지뿐']],
     signs:['놓기 전에 조각을 먼저 돌려 모양을 맞춰요.','좁은 구석부터 채우는 순서를 스스로 찾아요.','힌트 없이 지은 집이 늘어요.'],
     talk:'블록이나 퍼즐 조각을 들고 “이걸 돌리면 어떤 모양이 될까?” 하고 같이 돌려 보세요.'}
  ];

  const LIMIT='게임이 이 능력을 길러 준다고 보장하지는 않아요. 게임 규칙 안에서 이런 생각을 자주 쓰게 된다는 뜻이에요.';

  function art(g){
    if(g.art==='face'&&typeof g3_faceSVG==='function')return g3_faceSVG({species:'bear',head:'sprout',ears:'pink',eyes:'round',nose:'oval',mouth:'w',cheeks:'blush'},'full');
    return hwChar(g.art==='face'?'hopple':g.art,'face');
  }
  const mark=v=>v===2?'<i class="pg-dot main" aria-hidden="true"></i><span class="sr-only">주로 써요</span>':(v===1?'<i class="pg-dot sub" aria-hidden="true"></i><span class="sr-only">함께 써요</span>':'<span class="sr-only">거의 쓰지 않아요</span>');

  /* ---------- 우리 아이 놀이 기록 ---------- */
  const MIN_SESSIONS=3;
  const ZONE_LABEL={head:'머리',ears:'귀',eyes:'눈',nose:'코',mouth:'입',cheeks:'볼'};
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

  const INSIGHT={
    g1(list){
      const moves=add(list,'moves'), compared=add(list,'compared');
      const lines=[`움직이기 전에 상대 길을 먼저 눌러 본 차례가 <b>${moves}번 중 ${compared}번</b>이에요.`,
        `상대 친구를 <b>${add(list,'captures')}번</b> 잡고, <b>${add(list,'lost')}번</b> 잡혔어요.`];
      const rate=ratio(compared,moves);
      return {lines,metric:l=>ratio(add(l,'compared'),add(l,'moves')),metricName:'미리 비교한 차례',
        tip:rate!==null&&rate<.3?'움직이기 전에 “상대 친구 길도 눌러 볼까?” 하고 권해 보세요.':'“왜 그 친구를 움직였어?” 하고 고른 이유를 물어보세요.'};
    },
    g2(list){
      const threats=add(list,'threats'), blocks=add(list,'blocks'), acc=add(list,'accidental');
      const lines=[];
      lines.push(threats?`상대 줄이 완성되기 직전인 순간 <b>${threats}번 중 ${blocks}번</b>을 막았어요.`:'아직 상대 줄이 완성되기 직전까지 간 적이 없어요.');
      lines.push(acc?`실수로 상대 줄을 만들어 끝난 판은 <b>${acc}판</b>이에요.`:'실수로 상대 줄을 만든 판은 없어요.');
      return {lines,metric:l=>ratio(add(l,'blocks'),add(l,'threats')),metricName:'막은 비율',
        tip:threats&&blocks/threats<.5?'놓기 전에 “상대는 뭘 만들고 있을까?” 하고 상대 줄을 같이 봐 주세요.':'상대 줄을 막았을 때 “어떻게 알았어?” 하고 물어보세요.'};
    },
    g3(list){
      const rounds=add(list,'rounds'), first=add(list,'first'), zones={};
      list.forEach(x=>Object.entries(x.wrongZones||{}).forEach(([z,n])=>{ zones[z]=(zones[z]||0)+n; }));
      const top=Object.keys(zones).sort((a,b)=>zones[b]-zones[a])[0];
      const lines=[`찾은 얼굴 <b>${rounds}개 중 ${first}개</b>를 한 번에 찾았어요.`];
      if(top)lines.push(`가장 자주 헷갈린 곳은 <b>${hwJosa(ZONE_LABEL[top],'이에요/예요')}</b>.`);
      else lines.push('틀린 적 없이 모두 한 번에 찾았어요.');
      return {lines,metric:l=>ratio(add(l,'first'),add(l,'rounds')),metricName:'한 번에 찾은 비율',
        tip:top?`“${ZONE_LABEL[top]} 쪽을 먼저 볼까?” 하고 비교하는 순서를 같이 정해 보세요.`:'더 어려운 난이도에 도전해 봐도 좋아요.'};
    },
    g4(list){
      const turns=add(list,'turns'), clean=add(list,'clean'), sum=add(list,'sum'), diff=add(list,'diff'), help=add(list,'helpTurns');
      const lines=[`직접 놓은 칸 <b>${turns}개 중 ${clean}개</b>는 틀리거나 도움 없이 바로 찾았어요.`,
        `더하기 답으로 <b>${sum}칸</b>, 빼기 답으로 <b>${diff}칸</b>을 차지했어요.`];
      if(help)lines.push(`점 세기 도움은 <b>${help}번</b> 열어 봤어요.`);
      return {lines,metric:l=>ratio(add(l,'clean'),add(l,'turns')),metricName:'바로 찾은 비율',
        tip:turns&&diff<sum*.4?'빼기 답도 같이 찾아보면 고를 수 있는 칸이 늘어나요. “빼면 몇이지?” 하고 물어보세요.':'“다른 답으로는 어디에 놓을 수 있었을까?” 하고 물어보세요.'};
    },
    g5(list){
      const puzzles=add(list,'puzzles'), clean=add(list,'clean'), place=add(list,'placements'), rot=add(list,'rotations'), miss=add(list,'misses');
      const lines=[`지은 집 <b>${puzzles}채 중 ${clean}채</b>를 힌트 없이 지었어요.`];
      const rotList=list.filter(x=>x.level>1);
      if(rotList.length&&add(rotList,'placements'))lines.push(`조각 하나를 놓기 전에 평균 <b>${(add(rotList,'rotations')/add(rotList,'placements')).toFixed(1)}번</b> 돌려 봤어요.`);
      if(puzzles)lines.push(`안 맞는 자리에 놓아 본 건 집 한 채에 평균 <b>${(miss/puzzles).toFixed(1)}번</b>이에요.`);
      return {lines,metric:l=>ratio(add(l,'clean'),add(l,'puzzles')),metricName:'힌트 없이 지은 비율',
        tip:puzzles&&clean/puzzles<.5?'블록을 들고 “이걸 돌리면 어떻게 될까?” 하고 같이 돌려 보세요.':'좁은 구석부터 채우는 순서를 아이가 설명해 보게 해 주세요.'};
    }
  };

  function reportCard(g){
    const list=hwLogSessions(g.id);
    const head=`<header><span class="pg-mini-art" aria-hidden="true">${art(g)}</span><b>${g.title}</b>`;
    if(typeof hwGameOpen==='function'&&!hwGameOpen(g.id))return `<article class="pr-card waiting locked">${head}<small>${hwIcon('lock')}</small></header><p>기본 놀이팩에서 볼 수 있어요.</p></article>`;
    if(list.length<MIN_SESSIONS){
      const left=MIN_SESSIONS-list.length;
      return `<article class="pr-card waiting">${head}<small>${list.length}판 기록</small></header><p>혼자 하기로 <b>${left}판</b> 더 하면 보여 드려요.</p><i class="pr-bar" aria-hidden="true"><span style="width:${list.length/MIN_SESSIONS*100}%"></span></i></article>`;
    }
    const info=INSIGHT[g.id](list), trend=trendOf(list,info.metric);
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
  /* ---------- 읽어주기 목소리 고르기 ---------- */
  function voiceMarkup(){
    if(typeof hwVoiceOptions!=='function')return '';
    const opts=hwVoiceOptions();
    if(!opts.length)return `<section class="pv-voice"><h3>읽어주기 목소리</h3><p class="pg-lead">이 기기에는 한국어 읽어주기 목소리가 없어요. 기기 설정의 ‘음성 콘텐츠’에서 한국어 목소리를 내려받으면 쓸 수 있어요.</p></section>`;
    const rec=opts.filter(o=>o.score>0), rest=opts.filter(o=>o.score<=0);
    const row=o=>`<li class="${o.current?'on':''}"><button type="button" class="pv-pick" aria-pressed="${o.current?'true':'false'}" onclick="pgPickVoice(${JSON.stringify(o.name).replace(/"/g,'&quot;')})"><span class="pv-radio" aria-hidden="true"></span>${o.nick}</button><button type="button" class="pv-listen" onclick="hwPreviewVoice(${JSON.stringify(o.name).replace(/"/g,'&quot;')})" aria-label="${o.nick} 들어보기">${hwIcon('sound')} 들어보기</button></li>`;
    return `<section class="pv-voice" aria-labelledby="pvTitle">
      <h3 id="pvTitle">읽어주기 목소리</h3>
      <p class="pg-lead">아이가 듣기 편한 목소리를 골라 주세요. 기기마다 들어 있는 목소리가 달라요.</p>
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
    hwLogClear(); pgOpen(undefined);
  }

  function overviewMarkup(){
    const head=AREAS.map(a=>`<th scope="col" abbr="${a.label}"><span class="pg-area-ic">${hwIcon(a.icon)}</span><span aria-hidden="true">${a.short}</span><span class="sr-only">${a.label}</span></th>`).join('');
    const rows=GUIDE.map(g=>`<tr><th scope="row"><button type="button" class="pg-row-btn" onclick="pgOpen('${g.id}')"><span class="pg-mini-art" aria-hidden="true">${art(g)}</span><span class="pg-row-name">${g.title}</span></button></th>${AREAS.map(a=>`<td>${mark(g.areas[a.id]||0)}</td>`).join('')}</tr>`).join('');
    const legend=AREAS.map(a=>`<li><span class="pg-area-ic">${hwIcon(a.icon)}</span><b>${a.label}</b><span>${a.desc}</span></li>`).join('');
    return `
      <section class="pg-overview" aria-labelledby="pgOverviewTitle">
        <h3 id="pgOverviewTitle">게임마다 쓰는 생각, 한눈에 보기</h3>
        <p class="pg-lead">게임 이름을 누르면 그 게임 한 페이지 설명이 열려요.</p>
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
        <div class="pg-nav"><button type="button" class="pg-back" onclick="pgOpen(null)">${hwIcon('chevron-left')} 전체 보기</button><span>${i+1} / ${GUIDE.length}</span></div>
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

  function pgOpen(id){
    const root=document.getElementById('parentGuide'); if(!root)return;
    const g=GUIDE.find(x=>x.id===id), mv=window.hwMomVoice;
    if(mv&&id!=='familyVoice')mv.release();
    if(id==='familyVoice'&&mv&&typeof hwFeatureOpen==='function'&&!hwFeatureOpen('voice'))id=undefined;
    if(id==='familyVoice'&&mv){ root.innerHTML=mv.panelMarkup(); const sheet=root.closest('.parent-sheet'); if(sheet)sheet.scrollTop=root.offsetTop-8; const b=root.querySelector('.pg-back'); if(b)b.focus({preventScroll:true}); return; }
    root.innerHTML=g?detailMarkup(g):(typeof hwPackMarkup==='function'?hwPackMarkup():'')+reportMarkup()+overviewMarkup()+(mv?mv.entryMarkup():'')+voiceMarkup();
    const plan=document.getElementById('parentPlanStatus'); if(plan&&typeof hwPlanLabel==='function')plan.textContent=hwPlanLabel();
    const sheet=root.closest('.parent-sheet');
    if(sheet){
      if(g){ sheet.scrollTop=root.offsetTop-8; }
      else if(id===null){ sheet.scrollTop=root.offsetTop-8; }
    }
    const focus=root.querySelector(g?'.pg-back':'.pg-row-btn'); if(focus&&id!==undefined)focus.focus({preventScroll:true});
  }
  function pgPlay(id){
    if(typeof hideParent==='function')hideParent();
    if(typeof openSetup==='function')openSetup(id);
  }
  function pgInit(){ pgOpen(undefined); }

  window.PARENT_GUIDE=GUIDE;
  window.PARENT_AREAS=AREAS;
  Object.assign(window,{pgOpen,pgPlay,pgInit,pgClearLog,pgPickVoice});
})();
