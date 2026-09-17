/*
 * 호플우드 배경음악 — 음원 파일 없이 앱이 직접 연주한다 (저작권 걱정 없음, 용량 0).
 * 5음 음계(펜타토닉)만 써서 어떤 음이 겹쳐도 불협이 없고, 아이가 오래 들어도 피곤하지 않게
 * 느린 화음 패드 + 드문드문 떨어지는 멜로디만 쓴다. 말하기(hwSay)가 나오면 자동으로 작아진다.
 *   hwMusic.set('forest'|'play'|'quiet')  화면에 맞는 곡
 *   hwMusic.duck(ms)                      잠깐 작게
 *   HW_SETTINGS.music                     부모님이 끌 수 있음 (헤더 단추)
 */
(function(){
  const TRACKS={
    /* scale: 반음 단위, root: 기준 음(Hz), pad: 화음 자리 */
    forest:{root:220.00,scale:[0,2,4,7,9,12,14,16],bpm:64,pad:[[0,7,12],[ -3,4,9],[-5,2,7],[-1,4,11]],density:.45,color:1400},
    play:{root:261.63,scale:[0,2,4,7,9,12,14],bpm:84,pad:[[0,4,7],[2,5,9],[-3,0,4],[-1,2,7]],density:.6,color:2000},
    quiet:{root:196.00,scale:[0,2,4,7,9,12],bpm:52,pad:[[0,7,12],[-5,2,7]],density:.25,color:1000}
  };
  const BASE_GAIN=.11;

  let ac=null, master=null, verb=null, timer=0, started=false;
  let track='forest', step=0, nextTime=0, duckUntil=0, lastMelody=0;

  function on(){ return !window.HW_SETTINGS||HW_SETTINGS.music!==false; }
  function hz(root,semi){ return root*Math.pow(2,semi/12); }

  /* 짧은 잔향: 잡음을 감쇠시켜 만든 임펄스 */
  function makeVerb(){
    const len=Math.floor(ac.sampleRate*1.9), buf=ac.createBuffer(2,len,ac.sampleRate);
    for(let c=0;c<2;c++){ const d=buf.getChannelData(c);
      for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6)*.55; }
    const conv=ac.createConvolver(); conv.buffer=buf;
    const wet=ac.createGain(); wet.gain.value=.5; conv.connect(wet); wet.connect(master);
    return conv;
  }
  function ensure(){
    if(ac)return true;
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return false;
    try{ ac=new AC(); }catch(e){ return false; }
    master=ac.createGain(); master.gain.value=0; master.connect(ac.destination);
    verb=makeVerb();
    return true;
  }
  function voice(freq,time,dur,gain,type,color){
    const osc=ac.createOscillator(), amp=ac.createGain(), filt=ac.createBiquadFilter();
    osc.type=type; osc.frequency.setValueAtTime(freq,time);
    filt.type='lowpass'; filt.frequency.setValueAtTime(color,time);
    amp.gain.setValueAtTime(.0001,time);
    amp.gain.exponentialRampToValueAtTime(gain,time+dur*.25);
    amp.gain.exponentialRampToValueAtTime(.0001,time+dur);
    osc.connect(filt); filt.connect(amp); amp.connect(master); amp.connect(verb);
    osc.start(time); osc.stop(time+dur+.05);
  }
  /* 한 마디: 화음 패드 하나 + 멜로디 0~2개 */
  function scheduleBar(cfg,time){
    const beat=60/cfg.bpm, bar=beat*4;
    const chord=cfg.pad[step%cfg.pad.length];
    chord.forEach((semi,i)=>voice(hz(cfg.root,semi),time+i*.06,bar*1.15,.055,'sine',cfg.color));
    for(let b=0;b<4;b++){
      if(Math.random()>cfg.density)continue;
      let semi=cfg.scale[(Math.random()*cfg.scale.length)|0];
      if(Math.abs(semi-lastMelody)>9)semi=lastMelody+(semi>lastMelody?5:-5);
      lastMelody=semi;
      voice(hz(cfg.root,semi+12),time+b*beat+(Math.random()*.06),beat*1.6,.05,'triangle',cfg.color*1.4);
    }
    step++;
  }
  function tick(){
    if(!ac)return;
    const cfg=TRACKS[track]||TRACKS.forest, bar=(60/cfg.bpm)*4;
    while(nextTime<ac.currentTime+1.5){
      if(nextTime<ac.currentTime)nextTime=ac.currentTime+.1;
      scheduleBar(cfg,nextTime); nextTime+=bar;
    }
    const want=(!on()||document.hidden)?0:(Date.now()<duckUntil?BASE_GAIN*.25:BASE_GAIN);
    master.gain.setTargetAtTime(want,ac.currentTime,.35);
  }
  function start(){
    if(started||!on())return;
    if(!ensure())return;
    started=true;
    if(ac.state==='suspended')ac.resume().catch(()=>{});
    nextTime=ac.currentTime+.15; step=0;
    tick(); timer=setInterval(tick,700);
  }
  function stop(){
    started=false; clearInterval(timer); timer=0;
    if(master&&ac)master.gain.setTargetAtTime(0,ac.currentTime,.2);
  }
  function set(name){
    if(!TRACKS[name]||track===name)return;
    track=name; step=0;
    if(started&&ac)nextTime=Math.max(nextTime,ac.currentTime+.2);
  }
  function duck(ms){ duckUntil=Math.max(duckUntil,Date.now()+(ms||1800)); if(ac)tick(); }
  function refresh(){ if(on())start(); else stop(); }

  /* 첫 터치 뒤에만 소리를 낼 수 있다 (브라우저 규칙) */
  ['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>{ start(); },{once:true}));
  document.addEventListener('visibilitychange',()=>{ if(ac)tick(); });

  window.hwMusic={set,start,stop,duck,refresh,isOn:on,tracks:Object.keys(TRACKS),
    state:()=>({ctx:ac&&ac.state,gain:master?Math.round(master.gain.value*1000)/1000:0,bars:step,track,started})};
})();
