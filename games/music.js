/*
 * 호플우드 오리지널 배경음악
 * 외부 음원·샘플·루프 파일을 쓰지 않고 Web Audio로 실시간 연주한다.
 * 화면마다 다른 8개 테마를 쓰며, 읽어주기가 시작되면 자동으로 작아진다.
 */
(function(){
  /* melody는 8분음표 한 칸 단위다. null은 쉼표. 모든 음형은 이 프로젝트를 위해 작성했다. */
  const TRACKS={
    forest:{name:'새싹 산책',root:220.00,bpm:64,color:1450,volume:.95,chords:[[0,4,7],[-3,4,9],[-5,2,7],[-1,4,11]],melody:[12,null,16,19,16,null,14,null,12,14,16,null,19,16,14,null]},
    hub:{name:'숲 놀이터',root:246.94,bpm:76,color:1850,volume:.9,chords:[[0,4,7],[2,5,9],[-3,0,4],[-1,2,7]],melody:[12,16,19,null,21,19,16,null,14,16,19,16,14,null,12,null]},
    route:{name:'도토리 길',root:261.63,bpm:86,color:2050,volume:.88,chords:[[0,4,7],[-3,0,5],[2,5,9],[-1,4,7]],melody:[12,null,16,14,19,null,16,14,12,14,16,19,21,19,16,null]},
    pattern:{name:'부엉이의 생각',root:220.00,bpm:72,color:1300,volume:.84,chords:[[0,3,7],[-2,3,7],[-5,0,4],[-3,2,7]],melody:[12,null,15,null,19,17,15,null,14,17,null,19,17,14,12,null]},
    face:{name:'꼭 닮은 친구',root:293.66,bpm:78,color:2300,volume:.82,chords:[[0,4,7],[-5,0,4],[-3,2,7],[-1,4,7]],melody:[12,16,null,19,16,null,12,null,14,17,21,null,19,17,14,null]},
    number:{name:'징검다리 하나 둘',root:261.63,bpm:92,color:2150,volume:.84,chords:[[0,4,7],[2,5,9],[-3,0,4],[-5,0,7]],melody:[12,null,14,16,null,19,16,14,12,14,null,17,16,14,12,null]},
    beaver:{name:'비버의 작업실',root:196.00,bpm:74,color:1250,volume:.9,chords:[[0,4,7],[-5,0,4],[-3,4,9],[-1,4,7]],melody:[12,null,16,null,19,16,14,null,12,14,16,null,14,12,9,null]},
    quiet:{name:'나무 그늘',root:196.00,bpm:54,color:950,volume:.72,chords:[[0,7,12],[-5,2,7]],melody:[12,null,null,14,null,null,16,null,14,null,null,12,null,null,9,null]}
  };
  const BASE_GAIN=.12;

  let ac=null, master=null, verb=null, timer=0, started=false;
  let track='forest', step=0, nextTime=0, duckUntil=0;
  const scheduled=new Set();

  function on(){ return !window.HW_SETTINGS||window.HW_SETTINGS.music!==false; }
  function hz(root,semi){ return root*Math.pow(2,semi/12); }
  function mark(state){
    if(document.documentElement){ document.documentElement.dataset.musicTrack=track; document.documentElement.dataset.musicState=state; }
  }

  /* 짧고 부드러운 방 울림도 코드로 직접 만든다. */
  function makeVerb(){
    const len=Math.floor(ac.sampleRate*1.65), buf=ac.createBuffer(2,len,ac.sampleRate);
    for(let c=0;c<2;c++){
      const data=buf.getChannelData(c);
      for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/len,3)*.42;
    }
    const conv=ac.createConvolver(); conv.buffer=buf;
    const wet=ac.createGain(); wet.gain.value=.34; conv.connect(wet); wet.connect(master);
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
  function note(freq,time,dur,gain,type,color,wet=.35){
    const osc=ac.createOscillator(), amp=ac.createGain(), filt=ac.createBiquadFilter();
    osc.type=type; osc.frequency.setValueAtTime(freq,time);
    filt.type='lowpass'; filt.frequency.setValueAtTime(color,time); filt.Q.value=.4;
    amp.gain.setValueAtTime(.0001,time);
    amp.gain.exponentialRampToValueAtTime(gain,time+Math.min(.14,dur*.22));
    amp.gain.exponentialRampToValueAtTime(.0001,time+dur);
    osc.connect(filt); filt.connect(amp); amp.connect(master); if(wet)amp.connect(verb);
    scheduled.add(osc); osc.onended=()=>scheduled.delete(osc);
    osc.start(time); osc.stop(time+dur+.04);
  }
  function scheduleBar(cfg,time){
    const beat=60/cfg.bpm, bar=beat*4, chord=cfg.chords[step%cfg.chords.length];
    chord.forEach((semi,i)=>note(hz(cfg.root,semi),time+i*.045,bar*1.08,.042,'sine',cfg.color,.45));
    /* 낮은 음은 첫째·셋째 박에만 두어 아이의 말과 효과음을 가리지 않는다. */
    note(hz(cfg.root,chord[0]-12),time,beat*1.45,.035,'sine',Math.min(900,cfg.color),.18);
    note(hz(cfg.root,chord[0]-12),time+beat*2,beat*1.25,.027,'sine',Math.min(900,cfg.color),.16);
    const start=(step*8)%cfg.melody.length;
    for(let i=0;i<8;i++){
      const semi=cfg.melody[(start+i)%cfg.melody.length]; if(semi===null)continue;
      const long=(i===3||i===7)?beat*.9:beat*.58;
      note(hz(cfg.root,semi),time+i*(beat/2),long,.038,'triangle',cfg.color*1.25,.38);
    }
    step++;
  }
  function wantedGain(){
    const cfg=TRACKS[track]||TRACKS.forest;
    if(!on()||document.hidden)return 0;
    return BASE_GAIN*cfg.volume*(Date.now()<duckUntil ? .2 : 1);
  }
  function tick(){
    if(!ac||!started)return;
    const cfg=TRACKS[track]||TRACKS.forest, bar=(60/cfg.bpm)*4;
    while(nextTime<ac.currentTime+1.25){
      if(nextTime<ac.currentTime)nextTime=ac.currentTime+.08;
      scheduleBar(cfg,nextTime); nextTime+=bar;
    }
    master.gain.setTargetAtTime(wantedGain(),ac.currentTime,.28);
  }
  function start(){
    if(!on()){ mark('off'); return; }
    if(!ensure()){ mark('unavailable'); return; }
    if(ac.state==='suspended')ac.resume().catch(()=>{});
    if(started)return;
    started=true; nextTime=ac.currentTime+.12; step=0;
    mark('playing');
    tick(); timer=setInterval(tick,600);
  }
  function clearScheduled(when){
    scheduled.forEach(osc=>{ try{ osc.stop(when||0); }catch(e){} });
    scheduled.clear();
  }
  function stop(){
    started=false; clearInterval(timer); timer=0;
    mark('off');
    if(master&&ac)master.gain.setTargetAtTime(0,ac.currentTime,.16);
    if(ac)clearScheduled(ac.currentTime+.2);
  }
  function set(name){
    if(!TRACKS[name]||track===name)return;
    track=name; step=0;
    mark(started?'playing':(on()?'ready':'off'));
    if(started&&ac){
      master.gain.setTargetAtTime(0,ac.currentTime,.035);
      clearScheduled(ac.currentTime+.08);
      nextTime=ac.currentTime+.12; tick();
    }
  }
  function duck(ms){
    duckUntil=Math.max(duckUntil,Date.now()+(ms||1800));
    if(ac&&master)master.gain.setTargetAtTime(wantedGain(),ac.currentTime,.08);
  }
  function refresh(){ if(on())start(); else stop(); }
  function unlock(){
    if(on())start();
    else if(ac&&ac.state==='suspended')ac.resume().catch(()=>{});
  }

  /* 브라우저의 자동재생 규칙 때문에 첫 사용자 동작 뒤에 연주한다. */
  document.addEventListener('pointerdown',unlock,{passive:true});
  document.addEventListener('keydown',unlock);
  document.addEventListener('visibilitychange',()=>{ if(ac&&started){ if(!document.hidden&&ac.state==='suspended')ac.resume().catch(()=>{}); tick(); } });

  window.hwMusic={set,start,stop,duck,refresh,isOn:on,tracks:Object.keys(TRACKS),
    catalog:()=>Object.entries(TRACKS).map(([id,cfg])=>({id,name:cfg.name})),
    state:()=>({ctx:ac&&ac.state,gain:master?Math.round(master.gain.value*1000)/1000:0,bars:step,track,name:TRACKS[track].name,started})};
  mark(on()?'ready':'off');
})();
