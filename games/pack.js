/*
 * 호플우드 공개 모드 / 무료판 / 기본 놀이팩(1회 구매, 비소모성)
 * - 현재 RELEASE_MODE은 beta: 모든 놀이를 열고 결제 UI를 숨긴다.
 * - 유료 검증을 시작할 때 RELEASE_MODE만 freemium으로 바꾸면 아래 잠금·결제 구조를 다시 쓴다.
 * - 무료: 얼굴 짝꿍·비버 집짓기(쉬움·보통), 숲 퀘스트 첫 2개, 두 게임 리포트
 * - 기본 놀이팩: 나머지 게임 3개, 모든 난이도, 숲 퀘스트 전체와 반복 퀘스트, 전체 부모 리포트, 가족 목소리
 * - 아이 화면에는 가격·구매 버튼을 보여 주지 않는다. 구매·복원은 부모 메뉴 안에서, 보호자 질문을 통과한 뒤에만.
 * 결제 연결 (hwPurchase.channel)
 *   native : Capacitor/Cordova 앱 + cordova-plugin-purchase(CdvPurchase) — App Store / Google Play 비소모성 상품
 *   mock   : 개발용 가짜 결제 (?store=mock | mock-fail | mock-cancel, 또는 localStorage hw_store_mode)
 *   web    : 웹 브라우저. 구매 불가 → 앱에서 구매하도록 안내
 */
(function(){
  const RELEASE_MODE='beta';
  const BETA_OPEN=RELEASE_MODE==='beta';
  const PRODUCT_ID='hopplewood_basic_pack';
  const OWN_KEY='hw_pack_v1', MOCK_OWNED_KEY='hw_store_mock_owned';
  const FREE={games:['g3','g5'],maxLevel:2,quests:['beaver','festival']};
  const PACK_PRICE='6,600원';

  const own=Object.assign({owned:false,source:null,t:0},hwReadJSON(OWN_KEY,{}));
  const listeners=[];
  function hwPackOwned(){ return own.owned===true; }
  function hwFullAccess(){ return BETA_OPEN||hwPackOwned(); }
  function hwPlanLabel(){ return BETA_OPEN?'무료 베타':(hwPackOwned()?'기본 놀이팩':'무료판'); }
  function setOwned(source){
    if(own.owned)return;
    Object.assign(own,{owned:true,source,t:Date.now()});
    hwStore(OWN_KEY,JSON.stringify(own));
    listeners.forEach(fn=>{ try{ fn(); }catch(e){} });
  }
  function onPackChange(fn){ listeners.push(fn); }

  function hwGameOpen(g){ return hwFullAccess()||FREE.games.includes(g); }
  function hwLevelOpen(g,lv){ return hwGameOpen(g)&&(hwFullAccess()||Number(lv)<=FREE.maxLevel); }
  function hwQuestOpen(id){ return hwFullAccess()||FREE.quests.includes(id); }
  function hwFeatureOpen(name){ return hwFullAccess(); }

  /* 아이 화면: 가격·구매 없이 부드럽게만 알린다 */
  function hwLockedNotice(kind){
    const text=kind==='level'?'어려움 단계는 아직 잠겨 있어요. 어른과 함께 열 수 있어요.':'이 놀이는 아직 잠겨 있어요. 어른과 함께 열 수 있어요.';
    let t=document.getElementById('hwLockToast');
    if(!t){ t=document.createElement('div'); t.id='hwLockToast'; t.className='hw-lock-toast'; t.setAttribute('role','status'); document.body.appendChild(t); }
    t.innerHTML=`${hwIcon('lock')}<span>${text}</span>`;
    t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
    clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.remove('on'),2600);
    hwSfx('tap'); hwSay(text);
  }

  /* ---------- 보호자 질문 게이트 ---------- */
  const KO=['영','일','이','삼','사','오','육','칠','팔','구'];
  let gate=null;
  function newQuestion(){
    let a,b; do{ a=3+((Math.random()*7)|0); b=3+((Math.random()*7)|0); }while(a*b<12);
    return {text:`${KO[a]} 곱하기 ${hwJosa(KO[b],'은/는')}?`,answer:String(a*b)};
  }
  function hwParentGate(onPass,purpose){
    const o=document.getElementById('parentGateOverlay'); if(!o){ onPass(); return; }
    gate={onPass,q:newQuestion(),typed:'',tries:0};
    const card=o.querySelector('.gate-card');
    card.innerHTML=`
      <div class="gate-icon" aria-hidden="true">${hwIcon('parent')}</div>
      <h2 id="parentGateTitle">보호자 확인</h2>
      <p>${purpose||'부모님 메뉴로 들어가려면'} 아래 질문에 답해 주세요.</p>
      <div class="gate-q" id="gateQ" aria-live="polite">${gate.q.text}</div>
      <div class="gate-answer" id="gateAnswer" aria-label="입력한 답"></div>
      <p class="gate-msg" id="gateMsg" role="status"></p>
      <div class="gate-pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button type="button" onclick="hwGateKey('${n}')">${n}</button>`).join('')}<button type="button" class="gate-del" onclick="hwGateKey('del')" aria-label="지우기">←</button><button type="button" onclick="hwGateKey('0')">0</button><button type="button" class="gate-ok" onclick="hwGateKey('ok')">확인</button></div>
      <button class="cancel-gate" onclick="hideParentGate()">아이 화면으로 돌아가기</button>`;
    renderGate();
    openOverlay('parentGateOverlay');
  }
  function renderGate(){
    const a=document.getElementById('gateAnswer'); if(!a||!gate)return;
    a.innerHTML=[0,1].map(i=>`<i>${gate.typed[i]||''}</i>`).join('');
  }
  function hwGateKey(k){
    if(!gate)return;
    const msg=document.getElementById('gateMsg');
    if(k==='del'){ gate.typed=gate.typed.slice(0,-1); renderGate(); return; }
    if(k!=='ok'){ if(gate.typed.length<2)gate.typed+=k; renderGate(); if(gate.typed.length<2)return; }
    if(!gate.typed)return;
    if(gate.typed===gate.q.answer){
      const done=gate.onPass; gate=null;
      closeOverlay('parentGateOverlay',false);
      done();
      return;
    }
    gate.tries++; gate.typed=''; gate.q=newQuestion();
    const q=document.getElementById('gateQ'); if(q)q.textContent=gate.q.text;
    if(msg)msg.textContent='답이 달라요. 새 질문이에요.';
    renderGate();
  }

  /* ---------- 결제 연결 ---------- */
  function mockMode(){
    /* 가짜 결제는 내 컴퓨터(localhost)에서만 켤 수 있다 */
    if(!/^(localhost|127\.0\.0\.1)$/.test(location.hostname))return null;
    let m=null;
    try{ m=new URLSearchParams(location.search).get('store'); if(m)localStorage.setItem('hw_store_mode',m); else m=localStorage.getItem('hw_store_mode'); }catch(e){}
    return m&&/^mock/.test(m)?m:null;
  }
  const purchase={channel:'web',ready:false,price:PACK_PRICE,busy:false};

  function nativeStore(){ return window.CdvPurchase&&CdvPurchase.store; }
  function initNative(){
    const {store,ProductType,Platform}=CdvPurchase;
    const platforms=[];
    const cap=window.Capacitor&&Capacitor.getPlatform&&Capacitor.getPlatform();
    if(cap==='ios'||(!cap&&/iPhone|iPad/.test(navigator.userAgent)))platforms.push(Platform.APPLE_APPSTORE);
    else platforms.push(Platform.GOOGLE_PLAY);
    store.register(platforms.map(platform=>({id:PRODUCT_ID,type:ProductType.NON_CONSUMABLE,platform})));
    store.when()
      .productUpdated(p=>{ if(p.id!==PRODUCT_ID)return; if(p.pricing&&p.pricing.price)purchase.price=p.pricing.price; if(store.owned(PRODUCT_ID))setOwned('store'); refreshParent(); })
      .approved(tr=>tr.verify())
      .verified(receipt=>receipt.finish())
      .finished(()=>{ if(store.owned(PRODUCT_ID))setOwned('store'); purchase.busy=false; refreshParent(); });
    store.error(err=>{ purchase.busy=false; purchase.lastError=err&&err.message; refreshParent(); });
    store.initialize(platforms).then(()=>{ purchase.ready=true; if(store.owned(PRODUCT_ID))setOwned('store'); refreshParent(); });
  }
  function init(){
    if(BETA_OPEN){ purchase.channel='beta'; purchase.ready=true; return; }
    if(nativeStore()){ purchase.channel='native'; try{ initNative(); }catch(e){ purchase.channel='web'; } return; }
    /* 앱 안: Cordova 플러그인(CdvPurchase)은 deviceready 뒤에 준비된다 */
    const native=window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform();
    if(native){
      purchase.channel='native';
      const start=()=>{ if(purchase.started)return; if(!nativeStore()){ purchase.channel='web'; refreshParent(); return; } purchase.started=true; try{ initNative(); }catch(e){ purchase.channel='web'; refreshParent(); } };
      document.addEventListener('deviceready',start,false);
      if(!window.cordova){ const s=document.createElement('script'); s.src='cordova.js'; document.head.appendChild(s); }
      setTimeout(start,4000);
      return;
    }
    const m=mockMode();
    if(m){ purchase.channel='mock'; purchase.mode=m; purchase.ready=true; return; }
    purchase.channel='web';
  }

  /* 결과: 'ok' | 'cancel' | 'fail' | 'unavailable' | 'none'(복원할 구매 없음) */
  function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
  async function buy(){
    if(BETA_OPEN)return 'beta';
    if(hwPackOwned())return 'ok';
    if(purchase.channel==='web')return 'unavailable';
    if(purchase.channel==='mock'){
      await wait(700);
      if(purchase.mode==='mock-cancel')return 'cancel';
      if(purchase.mode==='mock-fail')return 'fail';
      try{ localStorage.setItem(MOCK_OWNED_KEY,'1'); }catch(e){}
      setOwned('mock'); return 'ok';
    }
    const store=nativeStore(), product=store&&store.get(PRODUCT_ID), offer=product&&product.getOffer();
    if(!offer)return 'fail';
    const err=await offer.order();
    if(err){ return err.code===CdvPurchase.ErrorCode.PAYMENT_CANCELLED?'cancel':'fail'; }
    /* 승인 → verified → finished 이벤트에서 setOwned. 스토어 창이 닫힐 때까지 잠깐 기다린다 */
    for(let i=0;i<40&&!hwPackOwned();i++)await wait(250);
    return hwPackOwned()?'ok':'pending';
  }
  async function restore(){
    if(purchase.channel==='web')return 'unavailable';
    if(purchase.channel==='mock'){
      await wait(600);
      let had=false; try{ had=localStorage.getItem(MOCK_OWNED_KEY)==='1'; }catch(e){}
      if(had){ setOwned('mock'); return 'ok'; }
      return 'none';
    }
    const store=nativeStore();
    try{ await store.restorePurchases(); }catch(e){ return 'fail'; }
    await wait(800);
    if(store.owned(PRODUCT_ID)){ setOwned('store'); return 'ok'; }
    return 'none';
  }

  /* ---------- 부모 메뉴: 기본 놀이팩 ---------- */
  const PACK_ITEMS=[
    ['route','게임 3개 더','길따라 쪼르르 · 모양 만들기 · 숫자 징검다리'],
    ['star','모든 난이도','다섯 게임 모두 어려움 단계까지'],
    ['sprout','숲 퀘스트 전체','퀘스트 8개, 부모님과 함께 퀘스트, 반복 퀘스트'],
    ['parent','전체 부모 리포트','다섯 게임의 놀이 모습과 대화 팁'],
    ['speak','우리 가족 목소리','엄마·아빠 목소리로 녹음해서 들려주기']
  ];
  let packMsg='';
  function packMarkup(){
    if(BETA_OPEN){
      return `<section class="pk-card beta" id="pkCard" aria-labelledby="pkTitle">
        <div class="pk-head"><span class="pk-badge beta">${hwIcon('sparkles')} 무료 베타</span><h3 id="pkTitle">지금은 모든 놀이를 열어 두었어요</h3></div>
        <p class="pg-lead">아이들이 어떤 놀이를 즐기고 다시 찾는지 보는 공개 베타 기간이에요. 게임 5개·난이도 3단계·숲 퀘스트·부모 리포트·가족 목소리를 모두 무료로 쓸 수 있어요.</p>
        <p class="pk-msg">정식 출시에서는 일부 새 놀이가 유료로 제공될 수 있어요. 구독·광고·계정은 없어요.</p>
      </section>`;
    }
    if(hwPackOwned()){
      return `<section class="pk-card owned" id="pkCard" aria-labelledby="pkTitle">
        <div class="pk-head"><span class="pk-badge">${hwIcon('star')} 이용 중</span><h3 id="pkTitle">호플우드 기본 놀이팩</h3></div>
        <p class="pg-lead">모든 게임과 난이도, 숲 퀘스트 전체, 부모 리포트, 가족 목소리를 쓸 수 있어요. 고마워요!</p>
        ${purchase.channel!=='web'?`<button type="button" class="pk-restore" onclick="hwPackRestore()">구매 복원</button>`:''}
        ${packMsg?`<p class="pk-msg" role="status">${packMsg}</p>`:''}
      </section>`;
    }
    const web=purchase.channel==='web';
    return `<section class="pk-card" id="pkCard" aria-labelledby="pkTitle">
      <div class="pk-head"><span class="pk-badge free">지금은 무료판</span><h3 id="pkTitle">호플우드 기본 놀이팩</h3></div>
      <p class="pg-lead">무료판에서는 얼굴 짝꿍·비버 집짓기(쉬움·보통)와 숲 퀘스트 2개를 할 수 있어요. 한 번 구매하면 계속 쓸 수 있어요. 광고와 계정은 없어요.</p>
      <ul class="pk-items">${PACK_ITEMS.map(([ic,t,d])=>`<li><span>${hwIcon(ic)}</span><b>${t}</b><small>${d}</small></li>`).join('')}</ul>
      <div class="pk-buy">
        <div><b>${purchase.price}</b><small>1회 구매 · 구독 아님</small></div>
        <button type="button" class="btn blue big" onclick="hwPackBuy()" ${purchase.busy||web?'disabled':''}>${purchase.busy?'확인 중…':'구매하기'}</button>
      </div>
      ${web?`<p class="pk-msg" role="status">구매는 App Store · Google Play 앱에서 할 수 있어요.</p>`:''}
      ${purchase.channel==='mock'?`<p class="pk-msg mock">개발용 가짜 결제 모드 (${purchase.mode})</p>`:''}
      ${packMsg?`<p class="pk-msg" role="status">${packMsg}</p>`:''}
      ${!web?`<button type="button" class="pk-restore" onclick="hwPackRestore()" ${purchase.busy?'disabled':''}>이미 구매했어요 · 구매 복원</button>`:''}
    </section>`;
  }
  function refreshParent(){
    const card=document.getElementById('pkCard'); if(card)card.outerHTML=packMarkup();
    const prog=document.getElementById('parentPlanStatus'); if(prog)prog.textContent=hwPlanLabel();
  }
  const RESULT_TEXT={ok:'기본 놀이팩이 열렸어요!',beta:'무료 베타 기간에는 모든 놀이가 열려 있어요.',cancel:'구매를 취소했어요.',fail:'구매하지 못했어요. 잠시 뒤 다시 해 주세요.',unavailable:'구매는 App Store · Google Play 앱에서 할 수 있어요.',none:'이 계정에서 복원할 구매를 찾지 못했어요.',pending:'결제를 확인하고 있어요. 잠시 뒤 구매 복원을 눌러 주세요.'};
  function hwPackBuy(){
    if(BETA_OPEN||purchase.busy||hwPackOwned())return;
    closeOverlay('parentOverlay',false);
    hwParentGate(async()=>{
      openOverlay('parentOverlay'); refreshParent();
      purchase.busy=true; packMsg=''; refreshParent();
      const r=await buy();
      purchase.busy=false; packMsg=RESULT_TEXT[r]||''; refreshParent();
      if(r==='ok'&&typeof pgOpen==='function'){ pgOpen(undefined); scrollToPack(); }
    },'구매하려면');
  }
  async function hwPackRestore(){
    if(purchase.busy)return;
    purchase.busy=true; packMsg='구매 기록을 확인하고 있어요…'; refreshParent();
    const r=await restore();
    purchase.busy=false; packMsg=RESULT_TEXT[r]||''; refreshParent();
    if(r==='ok'&&typeof pgOpen==='function'){ pgOpen(undefined); scrollToPack(); }
  }
  function scrollToPack(){ const c=document.getElementById('pkCard'), sheet=c&&c.closest('.parent-sheet'); if(c&&sheet)sheet.scrollTop=c.offsetTop-12; }

  init();
  window.HW_PACK={RELEASE_MODE,BETA_OPEN,PRODUCT_ID,FREE,purchase,buy,restore};
  Object.assign(window,{hwPackOwned,hwFullAccess,hwPlanLabel,hwGameOpen,hwLevelOpen,hwQuestOpen,hwFeatureOpen,hwLockedNotice,hwParentGate,hwGateKey,hwPackMarkup:packMarkup,hwPackBuy,hwPackRestore,hwOnPackChange:onPackChange,hwPackScroll:scrollToPack});
})();
