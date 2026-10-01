/*
 * 우리 가족 목소리 — 엄마·아빠가 아이에게 들려줄 문장을 직접 녹음한다.
 * - 녹음은 이 기기의 IndexedDB에만 저장하고 어디에도 보내지 않는다.
 * - hwSay가 읽을 문장을 문장 단위로 나눠, 녹음이 있는 부분은 녹음으로, 없는 부분은 기계 목소리로 읽는다 (platform.js).
 * - 문장 목록: 숲 이야기·첫 판 안내·게임 속 말(고정 목록) + 아이가 실제로 들은 다른 문장(숫자 없는 것만).
 *   게임 문구를 바꾸면 예전 녹음은 목록에서 "지금은 쓰지 않는 녹음"으로 남는다.
 */
(function(){
  const DB_NAME='hopplewood-voice', STORE='clips', HEARD_KEY='hw_voice_heard_v1', MAX_SEC=15;
  const STUDIO=/[?&]narration-studio=1(?:&|$)/.test(location.search);
  const clips=new Map();           /* key(문장) → {url, blob, t} */
  let db=null, ready=false;

  function norm(text){ return (typeof hwPlainText==='function'?hwPlainText(text):String(text)).replace(/\s+/g,' ').trim(); }
  function sentences(text){ return norm(text).split(/(?<=[.!?])\s+/).filter(Boolean); }
  function enabled(){ return !window.HW_SETTINGS||HW_SETTINGS.familyVoice!==false; }

  /* ---------- 저장소 ---------- */
  function openDB(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)){ reject(new Error('no idb')); return; }
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{ req.result.createObjectStore(STORE,{keyPath:'key'}); };
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    });
  }
  function tx(mode){ return db.transaction(STORE,mode).objectStore(STORE); }
  function loadAll(){
    return new Promise(resolve=>{
      const req=tx('readonly').getAll();
      req.onsuccess=()=>{ (req.result||[]).forEach(r=>{ if(r&&r.blob)clips.set(r.key,{blob:r.blob,t:r.t,url:URL.createObjectURL(r.blob)}); }); resolve(); };
      req.onerror=()=>resolve();
    });
  }
  function putClip(key,blob){
    return new Promise((resolve,reject)=>{
      const rec={key,blob,t:Date.now()}, req=tx('readwrite').put(rec);
      req.onsuccess=()=>{ const old=clips.get(key); if(old)URL.revokeObjectURL(old.url); clips.set(key,{blob,t:rec.t,url:URL.createObjectURL(blob)}); resolve(); };
      req.onerror=()=>reject(req.error);
    });
  }
  function deleteClip(key){
    return new Promise(resolve=>{
      const req=tx('readwrite').delete(key);
      req.onsuccess=req.onerror=()=>{ const old=clips.get(key); if(old)URL.revokeObjectURL(old.url); clips.delete(key); resolve(); };
    });
  }
  openDB().then(d=>{ db=d; return loadAll(); }).then(()=>{ ready=true; }).catch(()=>{ ready=false; });

  /* ---------- 읽기 계획: 앞에서부터 녹음된 가장 긴 문장 묶음을 찾는다 ---------- */
  window.hwMomVoicePlan=function(text){
    const parts=sentences(text);
    rememberHeard(parts);
    if(!ready||!clips.size||!enabled()||recording)return null;
    if(typeof hwFeatureOpen==='function'&&!hwFeatureOpen('voice'))return null;
    const plan=[]; let used=false, i=0;
    while(i<parts.length){
      let hit=0;
      for(let k=parts.length;k>i;k--){ if(clips.has(parts.slice(i,k).join(' '))){ hit=k; break; } }
      if(hit){ const key=parts.slice(i,hit).join(' '); plan.push({url:clips.get(key).url,text:key}); used=true; i=hit; }
      else{ const last=plan[plan.length-1]; if(last&&!last.url)last.text+=' '+parts[i]; else plan.push({text:parts[i]}); i++; }
    }
    return used?plan:null;
  };

  /* 아이가 들은 문장 (숫자가 들어간 문장은 매번 달라서 빼 둔다) */
  let heardCache=null;
  function heardAll(){ if(!heardCache)heardCache=(typeof hwReadJSON==='function'?hwReadJSON(HEARD_KEY,{}):{})||{}; return heardCache; }
  let heardSaveTimer=0;
  function rememberHeard(parts){
    const h=heardAll();
    parts.forEach(p=>{ if(/\d/.test(p)||p.length<3)return; h[p]=(h[p]||0)+1; });
    const keys=Object.keys(h); if(keys.length>200){ keys.sort((a,b)=>h[a]-h[b]).slice(0,keys.length-200).forEach(k=>delete h[k]); }
    clearTimeout(heardSaveTimer); heardSaveTimer=setTimeout(()=>{ if(typeof hwStore==='function')hwStore(HEARD_KEY,JSON.stringify(h)); },500);
  }

  /* ---------- 문장 목록 ---------- */
  function catalog(){
    const groups=[];
    const forest=[
      {text:'안녕! 나는 호플이야. 숲 친구들이 도움이 필요해. 부탁을 들어줄래?',note:'처음 인사'},
      {text:'새 퀘스트가 생겼어! 숲에서 느낌표를 눌러 봐!',note:'새 퀘스트'},
      {text:'부모님과 함께하는 퀘스트가 생겼어! 숲에서 느낌표를 눌러 봐!',note:'함께 퀘스트'},
      {text:'엄마 아빠와 번갈아 한 번씩 해요. 아이가 먼저 시작해요!',note:'함께 퀘스트 시작'},
      {text:'아깝다! 거의 다 됐어. 한 번만 더 해 볼까?',note:'한 번 더'},
      {text:'같이 힘을 모아서 해냈어!',note:'두 번째 도전 끝'},
      {text:'우와! 숲이 바뀌었어!',note:'숲이 바뀔 때'},
      {text:'선물을 하나 골라 숲에 놓아 줘.',note:'선물 고르기'},
      {text:'선물을 놓고 싶은 곳을 눌러요.',note:'선물 놓기'}
    ];
    if(window.hwForest){
      const name=id=>id==='hopple'?'호플이':(typeof hwCharName==='function'?hwCharName(id):id);
      (hwForest.QUESTS||[]).forEach(q=>{ forest.push({text:q.ask,note:name(q.who)+' · '+q.title+' 부탁'}); forest.push({text:q.thanks,note:name(q.who)+' · '+q.title+' 고마워'}); });
      (hwForest.REPEATS||[]).forEach(q=>{ forest.push({text:q.ask,note:name(q.who)+' · '+(q.title||'다시 부탁')}); forest.push({text:q.thanks,note:name(q.who)+' · 고마워'}); });
    }
    groups.push({id:'forest',title:'숲 이야기',desc:'호플이와 숲 친구들의 부탁과 고마워하는 말이에요.',lines:forest});
    groups.push({id:'guide',title:'첫 판 손가락 안내',desc:'게임을 처음 할 때 한 번 들려줘요.',lines:[
      {text:'파란 테두리 친구가 내 친구예요. 눌러 보면 갈 길에 숫자가 나와요.',note:'길따라 쪼르르'},
      {text:'이번엔 빨간 친구를 눌러요. 두 길이 어디서 만나는지 볼 수 있어요.',note:'길따라 쪼르르'},
      {text:'반짝이는 1번 칸을 누르면 한 칸 가요! 상대를 잡거나 집에 먼저 가면 점수!',note:'길따라 쪼르르'},
      {text:'이게 내 목표 모양이에요. 친구들을 이 순서대로 한 줄로 놓으면 이겨요.',note:'모양 만들기'},
      {text:'목표 모양의 첫 친구를 눌러 골라요.',note:'모양 만들기'},
      {text:'이제 빈 칸을 눌러 놓아요. 가로, 세로, 비스듬히 모두 돼요!',note:'모양 만들기'},
      {text:'큰 카드에 얼굴 반쪽이 있어요. 머리, 귀, 눈, 코, 입을 잘 봐요.',note:'얼굴 짝꿍'},
      {text:'아래 반쪽들은 딱 한 곳씩 달라요. 똑같은 짝을 찾아 눌러요.',note:'얼굴 짝꿍'},
      {text:'주사위 단추를 눌러 굴려 봐요!',note:'숫자 징검다리'},
      {text:'두 수를 더한 답, 큰 수에서 작은 수를 뺀 답을 스스로 구해요.',note:'숫자 징검다리'},
      {text:'두 답 중 하나가 적힌 빈 칸을 찾아 눌러요. 내 친구로 양쪽 끝을 먼저 이으면 이겨요!',note:'숫자 징검다리'},
      {text:'이 통나무 조각을 눌러 골라 봐요.',note:'비버 집짓기'},
      {text:'이제 모래색 집터 칸을 눌러요. 그 칸에 맞춰 조각이 놓여요!',note:'비버 집짓기'},
      {text:'잘했어요! 남은 조각도 골라서 빈틈 없이 채워요.',note:'비버 집짓기'},
      {text:'모양이 안 맞으면 조각을 한 번 더 눌러 돌려요.',note:'비버 집짓기 · 보통 이상'}
    ]});
    const play=[
      {text:'큰 카드의 반쪽 얼굴을 잘 보고, 꼭 맞는 오른쪽 반쪽을 찾아요.',note:'얼굴 짝꿍 시작'},
      {text:'큰 카드의 반쪽 얼굴을 잘 보고, 꼭 맞는 왼쪽 반쪽을 찾아요.',note:'얼굴 짝꿍 시작'},
      {text:'반짝! 한 번에 찾았어요.',note:'얼굴 짝꿍 칭찬'},
      {text:'딱 맞았어요!',note:'얼굴 짝꿍 칭찬'},
      {text:'조금 달라요. 다시 비교해 봐요.',note:'얼굴 짝꿍 도움'}
    ];
    ['머리','귀','눈','코','입','볼'].forEach(z=>play.push({text:z+' 쪽을 자세히 봐요.',note:'얼굴 짝꿍 도움'}));
    if(typeof G4_THEMES!=='undefined'&&typeof hwCharName==='function'&&typeof hwJosa==='function'){
      Object.values(G4_THEMES).forEach(t=>{ if(!t||!t.A||!t.B)return; play.push({text:hwJosa(hwCharName(t.A),'은/는')+' 왼쪽과 오른쪽을, '+hwJosa(hwCharName(t.B),'은/는')+' 위와 아래를 이어요. 주사위를 굴려 볼까요?',note:'숫자 징검다리 시작'}); });
    }
    play.push(
      {text:'답이 적힌 칸을 찾아봐요.',note:'숫자 징검다리'},
      {text:'맞아요!',note:'숫자 징검다리 칭찬'},
      {text:'점을 하나씩 세어 봐요.',note:'숫자 징검다리 도움'},
      {text:'점을 세어 봐요.',note:'숫자 징검다리 도움'},
      {text:'반짝이는 줄을 찾아봐요.',note:'숫자 징검다리 도움'},
      {text:'다시 계산해 봐요.',note:'숫자 징검다리 도움'},
      {text:'여기 놓으면 상대 모양이 돼요.',note:'모양 만들기 도움'},
      {text:'통나무 조각으로 집터를 빈틈 없이 꽉 채워요.',note:'비버 집짓기 시작'},
      {text:'여기에는 안 들어가요.',note:'비버 집짓기 도움'},
      {text:'반짝이는 칸을 봐요.',note:'비버 집짓기 힌트'},
      {text:'이 자리에 들어가요. 돌려서 맞춰 봐요.',note:'비버 집짓기 힌트'},
      {text:'이 조각을 다른 자리에 놓아 봐요.',note:'비버 집짓기 힌트'},
      {text:'빈틈 없이 꽉 채웠어요!',note:'비버 집짓기 칭찬'}
    );
    groups.push({id:'play',title:'게임 속 칭찬과 도움말',desc:'게임하는 중간에 자주 나와요.',lines:play});

    /* 목록에 없는데 아이가 들은 문장 */
    const known=new Set(); groups.forEach(g=>g.lines.forEach(l=>{ l.text=norm(l.text); known.add(l.text); sentences(l.text).forEach(s=>known.add(s)); }));
    /* 기본 목소리 파일이 있는 나머지 문장 (새 게임·숲 문장). 목록을 게임마다 손으로 적지 않는다 */
    /* 숫자가 든 문장(계산·칸 수 조합 900여 개)은 녹음 목록에 넣지 않는다 */
    const more=Object.keys(window.HW_NARRATION_FILES||{}).map(norm).filter(k=>!known.has(k)&&!/\d/.test(k)).map(k=>({text:k,note:'기본 목소리 문장'}));
    if(more.length)groups.push({id:'more',title:'새 놀이와 숲 이야기',desc:'기본 목소리로 읽어 주는 다른 문장이에요.',lines:more});
    more.forEach(l=>known.add(l.text));
    const h=heardAll();
    const extra=Object.keys(h).filter(k=>!known.has(k)).sort((a,b)=>h[b]-h[a]).slice(0,60).map(k=>({text:k,note:h[k]+'번 들음'}));
    if(extra.length)groups.push({id:'heard',title:'아이가 들은 다른 말',desc:'게임에서 실제로 나온 문장이에요. 자주 들은 순서예요.',lines:extra});
    extra.forEach(l=>known.add(l.text));
    const orphan=[...clips.keys()].filter(k=>!known.has(k)).map(k=>({text:k,note:'지금은 쓰지 않는 녹음'}));
    if(orphan.length)groups.push({id:'old',title:'지금은 쓰지 않는 녹음',desc:'게임 문장이 바뀌어서 더 이상 나오지 않아요. 지워도 괜찮아요.',lines:orphan});
    return groups;
  }

  /* ---------- 녹음 ---------- */
  let stream=null, recorder=null, recording=null, recTimer=0, recTick=0, recStart=0, lines=[];
  function pickMime(){
    if(typeof MediaRecorder==='undefined')return '';
    return ['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||'';
  }
  function canRecord(){ return !!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&typeof MediaRecorder!=='undefined'&&window.indexedDB); }
  async function ensureStream(){
    if(stream&&stream.getAudioTracks().some(t=>t.readyState==='live'))return stream;
    stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    return stream;
  }
  async function startRec(i){
    if(recording!==null){ if(recording===i)stopRec(); return; }
    const line=lines[i]; if(!line)return;
    if(typeof hwHush==='function')hwHush();
    let s;
    try{ s=await ensureStream(); }
    catch(e){ notice('마이크를 쓸 수 없어요. 브라우저 주소창의 마이크 권한을 허용한 뒤 다시 눌러 주세요.'); return; }
    if(!db){ notice('이 브라우저에서는 녹음을 저장할 수 없어요.'); return; }
    const mime=pickMime(), chunks=[];
    try{ recorder=mime?new MediaRecorder(s,{mimeType:mime}):new MediaRecorder(s); }catch(e){ notice('이 브라우저에서는 녹음이 안 돼요.'); return; }
    recorder.ondataavailable=e=>{ if(e.data&&e.data.size)chunks.push(e.data); };
    recorder.onstop=async()=>{
      const idx=recording; recording=null; clearTimeout(recTimer); clearInterval(recTick);
      const blob=new Blob(chunks,{type:recorder.mimeType||mime||'audio/webm'});
      const tooShort=Date.now()-recStart<500||blob.size<800;
      if(tooShort){ renderAll(); notice('너무 짧게 녹음됐어요. 단추를 누르고 문장을 다 읽은 뒤 다시 눌러 주세요.'); return; }
      try{ await putClip(lines[idx].text,blob); if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{}); }
      catch(e){ notice('저장하지 못했어요. 기기 저장 공간을 확인해 주세요.'); }
      renderAll(); listen(idx);
    };
    recording=i; recStart=Date.now();
    recorder.start();
    recTimer=setTimeout(()=>stopRec(),MAX_SEC*1000);
    recTick=setInterval(()=>{ const t=document.getElementById('mvTime'+i); if(t)t.textContent=Math.floor((Date.now()-recStart)/1000)+'초'; },250);
    renderAll();
  }
  function stopRec(){ if(recorder&&recorder.state==='recording')recorder.stop(); }
  function listen(i){
    const line=lines[i], c=line&&clips.get(line.text); if(!c)return;
    if(typeof hwHush==='function')hwHush();
    const a=new Audio(c.url); a.play().catch(()=>{});
  }
  async function remove(i){
    const line=lines[i]; if(!line)return;
    const btn=document.getElementById('mvDel'+i);
    if(btn&&btn.dataset.confirm!=='1'){ btn.dataset.confirm='1'; btn.textContent='정말 지울까요?'; return; }
    await deleteClip(line.text); renderAll();
  }
  function sample(i){ const line=lines[i]; if(line&&typeof hwSayTTS==='function')hwSayTTS(line.text); }
  function audioExt(type){
    type=String(type||'').toLowerCase();
    if(type.includes('mp4')||type.includes('aac'))return 'm4a';
    if(type.includes('ogg'))return 'ogg';
    if(type.includes('mpeg'))return 'mp3';
    return 'webm';
  }
  function phraseId(text){
    let h=2166136261;
    for(const ch of norm(text)){ h^=ch.codePointAt(0); h=Math.imul(h,16777619); }
    return 'line-'+(h>>>0).toString(16).padStart(8,'0');
  }
  function le16(n){ return new Uint8Array([n&255,(n>>>8)&255]); }
  function le32(n){ return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]); }
  const CRC_TABLE=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
  function crc32(bytes){ let c=0xffffffff; for(const b of bytes)c=CRC_TABLE[(c^b)&255]^(c>>>8); return (c^0xffffffff)>>>0; }
  async function zipBlob(files){
    const enc=new TextEncoder(), locals=[], centers=[]; let offset=0;
    for(const file of files){
      const name=enc.encode(file.name), data=file.data instanceof Uint8Array?file.data:new Uint8Array(await file.data.arrayBuffer());
      const crc=crc32(data), size=data.byteLength;
      const local=new Uint8Array([80,75,3,4,...le16(20),...le16(0x0800),...le16(0),...le16(0),...le16(0),...le32(crc),...le32(size),...le32(size),...le16(name.length),...le16(0)]);
      locals.push(local,name,data);
      const center=new Uint8Array([80,75,1,2,...le16(20),...le16(20),...le16(0x0800),...le16(0),...le16(0),...le16(0),...le32(crc),...le32(size),...le32(size),...le16(name.length),...le16(0),...le16(0),...le16(0),...le16(0),...le32(0),...le32(offset)]);
      centers.push(center,name); offset+=local.length+name.length+size;
    }
    const centerSize=centers.reduce((n,p)=>n+p.length,0);
    const end=new Uint8Array([80,75,5,6,...le16(0),...le16(0),...le16(files.length),...le16(files.length),...le32(centerSize),...le32(offset),...le16(0)]);
    return new Blob([...locals,...centers,end],{type:'application/zip'});
  }
  async function exportNarration(){
    if(!STUDIO)return;
    const groups=catalog().filter(g=>g.id!=='old'), unique=new Map();
    groups.forEach(g=>g.lines.forEach(line=>{ const text=norm(line.text); if(clips.has(text))unique.set(text,clips.get(text).blob); }));
    if(!unique.size){ notice('먼저 한 문장 이상 녹음해 주세요.'); return; }
    const manifest={}, files=[];
    for(const [text,blob] of unique){
      const filename=phraseId(text)+'.'+audioExt(blob.type), path='assets/audio/narration/'+filename;
      manifest[text]=path; files.push({name:path,data:blob});
    }
    const manifestText='/* 제작자 녹음 화면에서 생성한 호플우드 기본 내레이션 */\n'+
      'globalThis.HW_NARRATION_FILES = '+JSON.stringify(manifest,null,2)+';\n';
    const aiCatalog={
      version:1,
      generatedAt:new Date().toISOString(),
      referenceGroup:'guide',
      lines:groups.filter(g=>g.id!=='heard').flatMap(g=>g.lines.map(line=>{
        const text=norm(line.text);
        return {text,note:line.note||'',group:g.id,reference:g.id==='guide',recording:manifest[text]||null};
      }))
    };
    files.push({name:'games/narration-manifest.js',data:new TextEncoder().encode(manifestText)});
    files.push({name:'narration-catalog.json',data:new TextEncoder().encode(JSON.stringify(aiCatalog,null,2)+'\n')});
    files.push({name:'NARRATION-README.txt',data:new TextEncoder().encode('직접 녹음을 앱에 넣을 때는 assets와 games 폴더를 프로젝트 최상위 폴더에 합칩니다.\nAI 보이스 생성에는 이 ZIP 파일 자체를 npm run voice:generate 명령에 넣습니다.\n녹음 문장 수: '+unique.size+'\n')});
    const blob=await zipBlob(files), a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='hopplewood-narration.zip'; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),30000);
    notice(unique.size+'개 문장을 내보냈어요. hopplewood-narration.zip 파일을 보관해 주세요.');
  }
  function release(){
    if(recorder&&recorder.state==='recording'){ recorder.onstop=null; try{ recorder.stop(); }catch(e){} }
    recording=null; clearTimeout(recTimer); clearInterval(recTick);
    if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
  }
  function toggleUse(){
    if(!window.HW_SETTINGS)return;
    HW_SETTINGS.familyVoice=!enabled();
    if(typeof hwSaveSettings==='function')hwSaveSettings();
    renderAll();
  }

  /* ---------- 화면 ---------- */
  function notice(text){ const n=document.getElementById('mvNotice'); if(n){ n.textContent=text; n.hidden=false; } }
  function esc(t){ return String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function rowMarkup(line,i){
    const has=clips.has(line.text), rec=recording===i, busy=recording!==null&&!rec;
    return `<li class="mv-row${has?' done':''}${rec?' rec':''}">
      <div class="mv-text"><small>${esc(line.note||'')}</small><p>${esc(line.text)}</p></div>
      <div class="mv-actions">
        <button type="button" class="mv-rec" onclick="hwMomVoice.record(${i})" ${busy?'disabled':''} aria-label="${rec?'녹음 끝내기':(has?'다시 녹음':'녹음하기')}">${rec?`<i class="mv-stop"></i>끝 <b id="mvTime${i}">0초</b>`:`<i class="mv-dot"></i>${has?'다시':'녹음'}`}</button>
        ${has&&!rec?`<button type="button" class="mv-play" onclick="hwMomVoice.listen(${i})">${hwIcon('play')} 듣기</button><button type="button" class="mv-del" id="mvDel${i}" onclick="hwMomVoice.remove(${i})">지우기</button>`:''}
        ${!has&&!rec?`<button type="button" class="mv-sample" onclick="hwMomVoice.sample(${i})" ${busy?'disabled':''}>${hwIcon('sound')} 예시</button>`:''}
      </div></li>`;
  }
  function panelMarkup(){
    let groups=catalog(); lines=[];
    if(STUDIO){ const order={guide:0,play:1,forest:2,heard:3,old:4}; groups=groups.slice().sort((a,b)=>(order[a.id]??9)-(order[b.id]??9)); }
    const main=groups.filter(g=>g.id!=='old'&&g.id!=='heard');
    const total=main.reduce((n,g)=>n+g.lines.length,0), done=main.reduce((n,g)=>n+g.lines.filter(l=>clips.has(l.text)).length,0);
    const body=groups.map((g,gi)=>{
      const rows=g.lines.map(l=>{ lines.push(l); return rowMarkup(l,lines.length-1); }).join('');
      const got=g.lines.filter(l=>clips.has(l.text)).length;
      const title=STUDIO&&g.id==='guide'?'AI 보이스 클론 샘플 · 첫 판 안내':g.title;
      const desc=STUDIO&&g.id==='guide'?'이 15개를 같은 거리와 따뜻한 말투로 녹음하면 약 1–2분의 복제용 샘플이 됩니다. 먼저 이 묶음만 완성해도 돼요.':g.desc;
      return `<details class="mv-group"${gi===0?' open':''}><summary><b>${title}</b><span>${got} / ${g.lines.length}</span></summary><p class="pg-lead">${desc}</p><ul class="mv-list">${rows}</ul></details>`;
    }).join('');
    const unsupported=!canRecord();
    return `<section class="mv-panel" aria-labelledby="mvTitle">
      <div class="pg-nav"><button type="button" class="pg-back" onclick="pgOpen(null)">${hwIcon('chevron-left')} 전체 보기</button></div>
      <h3 id="mvTitle">${STUDIO?'호플우드 기본 내레이션 녹음':'우리 가족 목소리'}</h3>
      <p class="pg-lead">${STUDIO?'여기서 녹음한 문장을 내보내 앱에 넣으면 모든 아이에게 이 목소리가 들려요. 녹음하지 않은 문장만 기기 음성으로 읽습니다.':'엄마·아빠가 녹음한 문장은 게임에서 기계 목소리 대신 나와요. 녹음하지 않은 문장은 지금처럼 기계 목소리로 읽어요. 녹음은 이 기기에만 저장돼요.'}</p>
      <div class="mv-summary">
        <div class="mv-meter"><i style="width:${total?Math.round(done*100/total):0}%"></i></div>
        <span><b>${done}</b> / ${total} 문장 녹음</span>
      </div>
      ${STUDIO?`<button type="button" class="btn blue" onclick="hwMomVoice.exportNarration()"${done?'':' disabled'}>${hwIcon('download')} 녹음 파일 ${done}개 내보내기</button>`:`<button type="button" class="mv-toggle" aria-pressed="${enabled()?'true':'false'}" onclick="hwMomVoice.toggleUse()"><span class="mv-switch" data-on="${enabled()?1:0}"></span>${enabled()?'녹음한 목소리 쓰는 중':'녹음한 목소리 끔 (기계 목소리만)'}</button>`}
      <ul class="mv-tips">${STUDIO?'<li><b>AI 복제 테스트는 첫 묶음 15개만</b> 녹음하면 됩니다. 결과가 마음에 들면 AI로 나머지 문장을 만들어요.</li>':''}<li>조용한 곳에서 폰을 입에서 한 뼘쯤 떨어뜨려요.</li><li>녹음 단추를 누르고 1초 쉬었다가 아이에게 말하듯 천천히 읽고, 끝을 눌러요.</li><li>어떻게 읽을지 모르겠으면 <b>예시</b>를 눌러 들어 보세요.</li></ul>
      <p class="mv-notice" id="mvNotice" role="status"${unsupported?'':' hidden'}>${unsupported?'이 브라우저에서는 녹음을 할 수 없어요. 아이폰은 사파리, 안드로이드는 크롬에서 열어 주세요.':''}</p>
      ${body}
      <p class="pg-limit">${STUDIO?'녹음을 마치면 반드시 위 단추로 압축 파일을 내보내 주세요. 브라우저 데이터를 지우면 내보내지 않은 녹음은 사라져요.':'기기를 바꾸거나 브라우저 데이터를 지우면 녹음도 함께 사라져요.'}</p>
    </section>`;
  }
  function renderAll(){
    const panel=document.querySelector('#parentGuide .mv-panel'); if(!panel)return;
    const openIds=[...panel.querySelectorAll('.mv-group')].map(d=>d.open);
    const sheet=panel.closest('.parent-sheet'), top=sheet?sheet.scrollTop:0;
    panel.outerHTML=panelMarkup();
    const next=document.querySelectorAll('#parentGuide .mv-group'); next.forEach((d,i)=>{ if(i<openIds.length)d.open=openIds[i]; });
    if(sheet)sheet.scrollTop=top;
  }
  function entryMarkup(){
    const n=clips.size;
    if(typeof hwFeatureOpen==='function'&&!hwFeatureOpen('voice'))return `<section class="mv-entry"><div><h3>우리 가족 목소리</h3><p class="pg-lead">호플이와 숲 친구들의 말을 엄마·아빠 목소리로 녹음해 들려줄 수 있어요. 기본 놀이팩에 들어 있어요.</p></div><button type="button" class="btn ghost" onclick="hwPackScroll()">${hwIcon('lock')} 기본 놀이팩 보기</button></section>`;
    return `<section class="mv-entry"><div><h3>우리 가족 목소리</h3><p class="pg-lead">호플이와 숲 친구들의 말을 엄마·아빠 목소리로 녹음해 들려줄 수 있어요.${n?` 지금 ${n}개 녹음됨.`:''}</p></div><button type="button" class="btn blue" onclick="pgOpen('familyVoice')">${hwIcon('speak')} 녹음하러 가기</button></section>`;
  }

  window.hwMomVoice={panelMarkup,entryMarkup,record:startRec,listen,remove,sample,release,toggleUse,exportNarration,
    count:()=>clips.size, has:t=>clips.has(norm(t))};
})();
