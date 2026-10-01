/* 부모용 페이지(소개·선택 가이드·구매 안내) 전용 방문 통계 — Google Analytics 4.
 * 아이가 노는 게임 화면(index.html)에는 넣지 않는다 (scripts/check-release.cjs가 검사).
 * 쿠키를 남기지 않는다: GA4는 쿠키 없는 모드가 따로 없어서(client_storage:'none'은 GA4에서 듣지 않는다, 2026-10-02 확인)
 *   세션 쿠키로만 만들게 하고, 첫 기록을 보낸 직후와 페이지를 떠날 때 지운다. 광고 맞춤·구글 신호 수집도 끈다.
 * 그래서 '사용자 수'는 실제보다 많게 나오고, 방문 횟수·유입 채널·버튼 클릭 수만 믿는다.
 * 유입 채널은 주소의 utm_* 값으로 자동 구분된다 (docs/CAMPAIGN_LINKS.md).
 */
(()=>{
  const ID='G-XM2EW4X7X9';
  if(location.hostname==='localhost'||location.hostname==='127.0.0.1')return;   // 개발 중 방문은 세지 않는다
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
  /* 버튼 클릭: App Store / 웹 무료판 / 인스타그램 / 공유 */
  document.addEventListener('click',e=>{
    const link=e.target.closest('[data-store-link],[data-app-link]');
    if(link){ gtag('event','store_click',{link_type:link.dataset.storeLink||'ios',link_url:link.getAttribute('href')||''}); return; }
    if(e.target.closest('#shareBtn'))gtag('event','share_click',{});
  },{capture:true});
})();
