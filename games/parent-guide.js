/*
 * 부모님 게임 안내 — 한눈에 보는 표 + 게임별 한 페이지
 * 아이 화면에는 보이지 않고, 부모님 리포트(parentOverlay) 안에서만 쓴다.
 * 표현 원칙: "길러 준다"가 아니라 "게임 규칙 안에서 이런 생각을 쓴다"로 쓴다. 점수·또래 비교 없음.
 * 의존 전역: hwChar, hwIcon, g3_faceSVG(있으면), openSetup, hideParent, hwSay
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
     levels:[['쉬움','곧은 길, 2점 먼저'],['보통','꺾이는 길, 컴퓨터가 두 수 앞을 봐요'],['어려움','여러 번 엇갈리는 길, 세 수 앞까지']],
     signs:['움직이기 전에 상대 친구를 눌러 두 길을 비교해요.','“여기 가면 잡혀” 처럼 다음 차례를 말로 설명해요.','잡을 기회보다 안전한 길을 고르는 순간이 있어요.'],
     talk:'“다음 차례에 너구리는 어디로 올 것 같아?” 하고 한 수 앞을 같이 짚어 보세요.'},
    {id:'g2',title:'모양 만들기',art:'owl',
     line:'내 목표 순서를 기억하면서, 내 줄은 잇고 상대 줄은 막는 게임이에요.',
     areas:{obs:2,space:1,plan:2,self:2},
     steps:[['eye','목표 기억하기','부엉이·파랑새 순서를 머릿속에 담아요.'],['swap','두 줄 번갈아 보기','내 줄과 상대 줄을 모두 살펴요.'],['shield','놓을까 참을까','상대 줄이 완성되는 자리는 피하고 막아요.']],
     levels:[['쉬움','5×5 판, 3칸 줄'],['보통','6×6 판, 4칸 줄, 컴퓨터가 막아요'],['어려움','7×7 판, 적극적으로 막아요']],
     signs:['놓기 전에 상대 목표 줄을 한 번 확인해요.','실수로 상대 줄을 만든 뒤, 다음 판에서 같은 실수가 줄어요.','내 줄보다 막는 게 급한 순간을 알아채요.'],
     talk:'“상대는 어떤 순서를 만들고 있을까?” 상대 입장에서 보게 하는 질문이 좋아요.'},
    {id:'g3',title:'얼굴 짝꿍',art:'face',
     line:'반쪽 얼굴을 머리부터 입까지 하나씩 비교해, 딱 한 곳 다른 가짜를 찾아내는 게임이에요.',
     areas:{obs:2,space:1,self:2},
     steps:[['eye','반쪽 살펴보기','큰 카드의 머리·귀·눈·코·입을 봐요.'],['puzzle','한 곳씩 비교','후보와 부위를 차례로 맞춰 봐요.'],['sparkles','짝 고르기','틀리면 어느 부위가 달랐는지 듣고 다시 봐요.']],
     levels:[['쉬움','후보 3개, 머리·귀·입'],['보통','후보 4개, 눈·코 추가'],['어려움','후보 6개, 볼 무늬까지']],
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
     levels:[['쉬움','작은 집터, 돌리지 않아요'],['보통','4×4 집터, 돌리기'],['어려움','5×5 집터, 큰 조각 5–6개']],
     signs:['놓기 전에 조각을 먼저 돌려 모양을 맞춰요.','좁은 구석부터 채우는 순서를 스스로 찾아요.','힌트 없이 지은 집이 늘어요.'],
     talk:'블록이나 퍼즐 조각을 들고 “이걸 돌리면 어떤 모양이 될까?” 하고 같이 돌려 보세요.'}
  ];

  const LIMIT='게임이 이 능력을 길러 준다고 보장하지는 않아요. 게임 규칙 안에서 이런 생각을 자주 쓰게 된다는 뜻이에요.';

  function art(g){
    if(g.art==='face'&&typeof g3_faceSVG==='function')return g3_faceSVG({species:'bear',head:'sprout',ears:'pink',eyes:'round',nose:'oval',mouth:'w',cheeks:'blush'},'full');
    return hwChar(g.art==='face'?'hopple':g.art,'face');
  }
  const mark=v=>v===2?'<i class="pg-dot main" aria-hidden="true"></i><span class="sr-only">주로 써요</span>':(v===1?'<i class="pg-dot sub" aria-hidden="true"></i><span class="sr-only">함께 써요</span>':'<span class="sr-only">거의 쓰지 않아요</span>');

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
    const g=GUIDE.find(x=>x.id===id);
    root.innerHTML=g?detailMarkup(g):overviewMarkup();
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
  Object.assign(window,{pgOpen,pgPlay,pgInit});
})();
