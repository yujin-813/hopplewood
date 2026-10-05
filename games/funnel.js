/*
 * 호플우드 공개 흐름 기록
 *
 * 아이를 식별하거나 서버로 보내는 분석 도구가 아니다. 소개 페이지 방문, 설치 시도,
 * 무료 게임 시작, 잠긴 콘텐츠 확인, 이용권 등록처럼 제품 흐름을 이해하는 데 필요한
 * 최소 이벤트만 이 기기의 localStorage에 저장한다. 부모 메뉴에서 CSV로 내보낼 수 있다.
 */
(function(){
  const EVENT_KEY='hw_funnel_v1';
  const ATTR_KEY='hw_attribution_v1';
  const KEEP=240;
  const ATTR_FIELDS=['utm_source','utm_medium','utm_campaign','ref','from'];

  function read(key,fallback){
    try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):fallback; }catch(e){ return fallback; }
  }
  function write(key,value){
    try{ localStorage.setItem(key,JSON.stringify(value)); return true; }catch(e){ return false; }
  }
  function clean(value,max=64){
    return String(value||'').replace(/[^0-9A-Za-z가-힣._~-]/g,'').slice(0,max);
  }
  function queryAttribution(){
    const out={};
    try{
      const q=new URLSearchParams(location.search);
      ATTR_FIELDS.forEach(k=>{ const v=clean(q.get(k)); if(v)out[k]=v; });
    }catch(e){}
    return out;
  }
  function attribution(){
    const current=queryAttribution();
    const saved=read(ATTR_KEY,{first:null,last:null});
    if(Object.keys(current).length){
      if(!saved.first)saved.first={...current,t:Date.now()};
      saved.last={...current,t:Date.now()};
      write(ATTR_KEY,saved);
    }
    return saved.last||saved.first||{};
  }
  function safeData(data){
    const out={};
    if(!data||typeof data!=='object')return out;
    ['game','level','result','detail','channel'].forEach(k=>{ if(data[k]!==undefined&&data[k]!==null)out[k]=clean(data[k],48); });
    return out;
  }
  function hwFunnel(name,data){
    const event=clean(name,40); if(!event)return;
    const a=attribution();
    const list=read(EVENT_KEY,[]);
    const row={t:Date.now(),event};
    if(a.utm_source)row.source=a.utm_source;
    if(a.utm_medium)row.medium=a.utm_medium;
    if(a.utm_campaign)row.campaign=a.utm_campaign;
    if(a.ref)row.ref=a.ref;
    if(a.from)row.from=a.from;
    Object.assign(row,safeData(data));
    list.push(row);
    write(EVENT_KEY,list.slice(-KEEP));
    forward(event,safeData(data));
  }
  /* 웹에서만: 이용 단계를 익명 통계(ga.js)로도 넘긴다. 스토어 앱에서는 ga.js가 동작하지 않아 아무 데도 가지 않는다.
     넘기는 것은 아래 단계 이름과 게임 번호·난이도·결과·버튼 종류뿐이다 */
  const SHARED=new Set(['landing_view','parent_guide_view','store_purchase_info_view','share_click','app_open','game_open','game_complete','paywall_view','getapp_card_view','getapp_open','store_click','checkout_guide_click','install_click','install_complete']);
  function forward(event,data){
    if(!SHARED.has(event))return;
    if(typeof window.hwGA==='function'){ window.hwGA(event,data); return; }
    const q=window.hwGAQueue=window.hwGAQueue||[]; if(q.length<40)q.push([event,data]);
  }
  function hwFunnelEvents(){ const list=read(EVENT_KEY,[]); return Array.isArray(list)?list:[]; }
  function hwFunnelSummary(){
    const events=hwFunnelEvents(),counts={};
    events.forEach(x=>{ counts[x.event]=(counts[x.event]||0)+1; });
    return {events,counts,attribution:read(ATTR_KEY,{first:null,last:null})};
  }
  function csvCell(value){
    let s=value===undefined||value===null?'':String(value);
    if(/^[=+\-@]/.test(s))s="'"+s;
    return '"'+s.replace(/"/g,'""')+'"';
  }
  function hwFunnelExport(){
    const cols=['time','event','source','medium','campaign','ref','from','game','level','result','detail','channel'];
    const rows=[cols.join(',')];
    hwFunnelEvents().forEach(x=>rows.push(cols.map(k=>csvCell(k==='time'?new Date(x.t).toISOString():x[k])).join(',')));
    const blob=new Blob(['\ufeff'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='hopplewood-device-events-'+new Date().toISOString().slice(0,10)+'.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  function hwFunnelClear(){
    try{ localStorage.removeItem(EVENT_KEY); localStorage.removeItem(ATTR_KEY); }catch(e){}
  }
  function hwTrackedLink(url,event,data){ hwFunnel(event,data); location.href=url; }

  attribution();
  Object.assign(window,{hwFunnel,hwFunnelEvents,hwFunnelSummary,hwFunnelExport,hwFunnelClear,hwTrackedLink});
})();
