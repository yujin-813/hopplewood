/* 방문·이용 통계 — Google Analytics 4. 웹에서만 동작한다.
 * - 부모용 페이지(소개·선택 가이드·구매 안내)와 웹 무료판 게임 화면에서, 스토어 앱(Capacitor)에서는 절대 동작하지 않는다.
 * - 보내는 것: 페이지 조회, 그리고 games/funnel.js가 넘겨 주는 이용 단계(어떤 게임을 열고 끝냈는지, 앱 받기 안내·스토어 버튼을 눌렀는지).
 *   아이가 입력한 내용, 이름, 목소리, 기기 식별값은 보내지 않는다.
 * - 쿠키를 남기지 않는다: GA4는 쿠키 없는 모드가 따로 없어서(client_storage:'none'은 GA4에서 듣지 않는다, 2026-10-02 확인)
 *   세션 쿠키로만 만들게 하고, 첫 기록을 보낸 직후와 페이지를 떠날 때 지운다. 광고 맞춤·구글 신호 수집도 끈다.
 *   그래서 '사용자 수'는 실제보다 많게 나오고, 조회 수·유입 채널·이벤트 수만 믿는다.
 * - 유입 채널은 주소의 utm_* 값으로 자동 구분된다 (docs/CAMPAIGN_LINKS.md).
 */
(()=>{
  const ID='G-XM2EW4X7X9';
  const native=Boolean(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
  if(native||location.protocol==='capacitor:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')return;   // 스토어 앱·개발 중에는 세지 않는다
  window.dataLayer=window.dataLayer||[];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag=gtag;
  gtag('js',new Date());
  gtag('config',ID,{cookie_expires:0,cookie_update:false,allow_google_signals:false,allow_ad_personalization_signals:false});
  /* GA가 만든 쿠키(_ga, _ga_<ID>)를 지운다. 방문자 식별값은 이 페이지가 열려 있는 동안 메모리에만 있다 */
  const clearCookies=()=>{
    document.cookie.split(';').map(c=>c.trim().split('=')[0]).filter(n=>/^_ga/.test(n)).forEach(n=>{
      ['',';domain='+location.hostname,';domain=.'+location.hostname].forEach(d=>{ document.cookie=n+'=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'+d; });
    });
  };
  [1500,4000,9000].forEach(ms=>setTimeout(clearCookies,ms));
  addEventListener('pagehide',clearCookies);
  const s=document.createElement('script'); s.async=true; s.src='https://www.googletagmanager.com/gtag/js?id='+ID;
  document.head.appendChild(s);
  /* funnel.js가 넘겨 주는 이용 단계. ga.js보다 먼저 생긴 것은 대기열에서 꺼낸다 */
  window.hwGA=(name,params)=>gtag('event',name,params||{});
  (window.hwGAQueue||[]).splice(0).forEach(([name,params])=>window.hwGA(name,params));
})();
