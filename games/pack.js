/*
 * 호플우드 무료판 / 기본 놀이팩(이용권 코드 또는 앱스토어 1회 구매)
 * - 현재 RELEASE_MODE은 voucher: 웹에서 이용권 코드를 입력하면 기본 놀이팩을 연다.
 * - App Store / Google Play로 전환할 때 RELEASE_MODE만 freemium으로 바꾸면 기존 결제 구조를 쓴다.
 * - 무료: 얼굴 짝꿍·비버 집짓기(쉬움·보통), 숲 퀘스트 첫 2개, 두 게임 리포트
 * - 기본 놀이팩: 나머지 게임 3개, 모든 난이도, 숲 퀘스트 전체와 반복 퀘스트, 전체 부모 리포트, 가족 목소리
 * - 아이 화면에는 가격·구매 버튼을 보여 주지 않는다. 구매·복원은 부모 메뉴 안에서, 보호자 질문을 통과한 뒤에만.
 * 결제 연결 (hwPurchase.channel)
 *   native : Capacitor/Cordova 앱 + cordova-plugin-purchase(CdvPurchase) — App Store / Google Play 비소모성 상품
 *   mock   : 개발용 가짜 결제 (?store=mock | mock-fail | mock-cancel, 또는 localStorage hw_store_mode)
 *   web    : 웹 브라우저. 구매 불가 → 앱에서 구매하도록 안내
 */
(function(){
  const RELEASE_MODE='voucher';
  const BETA_OPEN=RELEASE_MODE==='beta';
  const VOUCHER_MODE=RELEASE_MODE==='voucher';
  const PRODUCT_ID='hopplewood_basic_pack';
  const OWN_KEY='hw_pack_v1', MOCK_OWNED_KEY='hw_store_mock_owned';
  const FREE={games:['g3','g5'],maxLevel:2,quests:['beaver','festival']};
  const PACK_PRICE='6,600원';
  /* 실제 코드는 private/voucher-codes.csv에만 보관한다. 공개 파일에는 단방향 해시만 싣는다. */
  const VOUCHER_HASHES=new Set([
    '027e871c0923809189e88574303923ab28f171896b9a841b1f9798b2cd30c494','59de4b967d6409f693601a072acc9690a8ea94f1c43a0437367fbafbd0747eec',
    '01acd4c3cc559839865424c1d0057f961239b7e1ecec02a9097719ede5e7295c','b68dc75e3b192a8b698ad34e69bf96e819169fb6e73556b36331a2f8e52e1347',
    '9eceb45eafa757d5eee4548d377bd68df02b33c8f235d076056105f47f64ef58','e1565d06e40b9364c50237f3736fb4389c201dc5840f7246aa442d1255635a7f',
    'c880a5d60165b9bd18ae6b5135bcd6bf0578d87797bc729c0f03943a5bc2ab62','15f5ca98ea773455ec20b4751580e52721ad465c05b15b85dc665a91cb09f3f9',
    '25fb16140db538808e52502d289d547d6990aefdfe66b24af0a602bf70bb2254','d1ba2c9198efbe1de37fe8ab2f86c565963e3da56d68ede5a01786e7f534cc93',
    '80c5b6b284a0c7bf058c28d61490545097fb14df2de6ad7b12520fcac9398410','7e82a2c8971bcda8236a68f3a89a6cc418bdf17881d619372be0199b5bd3b42f',
    'f251b63ddcba67879c9ef44791f3853efeb8fc47b690154d77d592598f7414e2','0ec7cd8fb31870f113114ba47c7dd6226d0437a8c22b3f56039c364de6c80ce2',
    'bee1e15c6d5a50be026648ce0d00115ebc7758a5e343a547fa2810c0560472f9','d3d25328b48e08f263d6440359f086426fc13c7336c228834d3f6939ee2f3c2e',
    '6ab9100d763a5f748792fbb39f53adc33ce1ac673b43574fcfdc70858e396d5e','8b440f8e01dea1ba449ccc857dc36b481e6fd331342027be972d0cbdab4230b0',
    '28a90386a2d12d2cd30f7b74bb485dad586495ff8796b789efc841b81acd4093','b1ce16e0f5e67eb19dd4adc2bc55d5c9674cf80d78888474224df1dcf85cf4a0',
    '67f3db10da9bb2d998d68900cf638abd8f7a4cd561e8e401f03af28e662da7e5','413df79b62bd0d32d5d7259b2c021fbd20b9f224b65b773819972bb492c2a363',
    '00bbba82ba6b81d9fa63da18188e4c4150fccd60842a2b3fe79877152cd14aac','99558e90afeae3fa4fc2442e8ac2e849b5cc5f431bd3289675d00f52ccd90be4',
    'db2178d29de735ca51aaff1c5141f489fb85f4fcaca2f36d8bb68b73d09157a6','cc306cd62807f63191d2df8935376ea37c7d7f632c5df24292e8cf792ffc85ed',
    '32d043c648127f8ed8470db781a3368ca37b8c0bcbf805a9de1139a6912bba3e','f9ca48b9c85c98f43c92bdf62bb47ecdc10abf12eb8c105f91431455a615ccd9',
    '53900be3ca64d5c23e65d93ba4700c5b7f4d9ea62ba103517733454060601bd4','df8679aa54db48e5d43f9ff4b24f8d668330f07a507108c0f06c1b3748121d47'
  ]);

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
    if(VOUCHER_MODE){ purchase.channel='voucher'; purchase.ready=true; return; }
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

  /* ---------- 웹 이용권 코드 ---------- */
  function normalizeVoucher(value){ return String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }
  async function voucherDigest(value){
    if(!window.crypto||!crypto.subtle||!window.TextEncoder)throw new Error('crypto unavailable');
    const bytes=new TextEncoder().encode('hopplewood-voucher-v1:'+normalizeVoucher(value));
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function redeemVoucher(value){
    const normalized=normalizeVoucher(value);
    if(!/^HOPP[A-Z2-9]{15}$/.test(normalized))return 'invalid';
    try{
      const hash=await voucherDigest(normalized);
      if(!VOUCHER_HASHES.has(hash))return 'invalid';
      setOwned('voucher');
      return 'ok';
    }catch(e){ return 'code-error'; }
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
        ${purchase.channel==='native'||purchase.channel==='mock'?`<button type="button" class="pk-restore" onclick="hwPackRestore()">구매 복원</button>`:''}
        ${packMsg?`<p class="pk-msg" role="status">${packMsg}</p>`:''}
      </section>`;
    }
    if(VOUCHER_MODE){
      return `<section class="pk-card" id="pkCard" aria-labelledby="pkTitle">
        <div class="pk-head"><span class="pk-badge free">게임 2개 무료</span><h3 id="pkTitle">호플우드 기본 놀이팩</h3></div>
        <p class="pg-lead">얼굴 짝꿍·비버 집짓기는 무료예요. 기본 놀이팩 이용권을 구매하면 나머지 게임 3개와 전체 콘텐츠가 열려요.</p>
        <ul class="pk-items">${PACK_ITEMS.map(([ic,t,d])=>`<li><span>${hwIcon(ic)}</span><b>${t}</b><small>${d}</small></li>`).join('')}</ul>
        <div class="pk-price"><b>${PACK_PRICE}</b><small>1회 이용권 · 구독 아님</small></div>
        <div class="pk-code-box">
          <label for="pkCode">구매 후 받은 이용권 코드</label>
          <div><input id="pkCode" type="text" inputmode="text" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" maxlength="24" placeholder="HOPP-XXXXX-XXXXX-XXXXX" onkeydown="hwVoucherKey(event)"><button type="button" class="btn blue" onclick="hwVoucherRedeem()" ${purchase.busy?'disabled':''}>${purchase.busy?'확인 중…':'코드 열기'}</button></div>
        </div>
        <p class="pk-msg">초기 공개 기간에는 소수 테스트 가정에 이용권 코드를 직접 전달하고 있어요. 정식 결제 링크는 준비 중이에요.</p>
        <p class="pk-code-help">코드는 이 기기에 저장돼요. 브라우저 데이터를 지우거나 기기를 바꾸면 같은 코드를 다시 입력하세요.</p>
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
  const RESULT_TEXT={ok:'기본 놀이팩이 열렸어요!',beta:'무료 베타 기간에는 모든 놀이가 열려 있어요.',invalid:'코드가 맞지 않아요. 문자와 숫자를 다시 확인해 주세요.','code-error':'이 브라우저에서는 코드를 확인할 수 없어요. 최신 브라우저에서 다시 시도해 주세요.',cancel:'구매를 취소했어요.',fail:'구매하지 못했어요. 잠시 뒤 다시 해 주세요.',unavailable:'구매는 App Store · Google Play 앱에서 할 수 있어요.',none:'이 계정에서 복원할 구매를 찾지 못했어요.',pending:'결제를 확인하고 있어요. 잠시 뒤 구매 복원을 눌러 주세요.'};
  async function hwVoucherRedeem(){
    if(!VOUCHER_MODE||purchase.busy||hwPackOwned())return;
    const input=document.getElementById('pkCode');
    const value=input&&input.value;
    purchase.busy=true; packMsg='코드를 확인하고 있어요…'; refreshParent();
    const r=await redeemVoucher(value);
    purchase.busy=false; packMsg=RESULT_TEXT[r]||''; refreshParent();
    if(r==='ok'&&typeof pgOpen==='function'){ pgOpen(undefined); scrollToPack(); }
  }
  function hwVoucherKey(event){ if(event.key==='Enter'){ event.preventDefault(); hwVoucherRedeem(); } }
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
  window.HW_PACK={RELEASE_MODE,BETA_OPEN,VOUCHER_MODE,PRODUCT_ID,FREE,purchase,buy,restore,redeemVoucher};
  Object.assign(window,{hwPackOwned,hwFullAccess,hwPlanLabel,hwGameOpen,hwLevelOpen,hwQuestOpen,hwFeatureOpen,hwLockedNotice,hwParentGate,hwGateKey,hwPackMarkup:packMarkup,hwPackBuy,hwPackRestore,hwVoucherRedeem,hwVoucherKey,hwOnPackChange:onPackChange,hwPackScroll:scrollToPack});
})();
