/*
 * 호플우드 캐릭터 도감 (색연필 그림책 스타일)
 * - 선: 진한 잉크색, 살짝 흔들리는 손그림 느낌(hwWobble 필터)
 * - 면: 채도 높은 단색 + 색연필 결(hwCrayon 필터) + 손으로 그은 음영선
 * - 얼굴: 작은 점 눈, 짧은 입, 볼 터치 / 옷·소품으로 개성
 * 게임마다 서로 다른 친구가 활동한다.
 */
(function(){
  const INK='#2b2521';
  const L=(w=2.6)=>`stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const S=L(2.8);
  const hatch=(d,color,w=2)=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity=".55"/>`;
  const dot=(x,y,r=2.9)=>`<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${(r*1.18).toFixed(2)}" fill="${INK}"/>`;
  const blush=(x,y,rx=5)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${(rx*.6).toFixed(2)}" fill="#f47f95" opacity=".55"/>`;
  const mouth=(d,w=2.3)=>`<path d="${d}" fill="none" ${L(w)}/>`;

  /* 색연필 결과 손떨림을 한 번만 정의해 모든 캐릭터가 같이 쓴다. */
  const DEFS=`<defs>
    <filter id="hwCrayon" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency=".028" numOctaves="3" seed="4" result="warp"/>
      <feDisplacementMap in="SourceGraphic" in2="warp" scale="3.4" xChannelSelector="R" yChannelSelector="G" result="rough"/>
      <feTurbulence type="fractalNoise" baseFrequency=".07 .75" numOctaves="3" seed="11" result="streak"/>
      <feColorMatrix in="streak" type="matrix" values="0 0 0 0 1  0 0 0 0 .98  0 0 0 0 .94  -3 0 0 0 1.42" result="paper"/>
      <feComposite in="paper" in2="rough" operator="in" result="paperIn"/>
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="2" result="grain"/>
      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -2.4 0 0 0 1.05" result="speck"/>
      <feComposite in="speck" in2="rough" operator="in" result="speckIn"/>
      <feMerge><feMergeNode in="rough"/><feMergeNode in="paperIn"/><feMergeNode in="speckIn"/></feMerge>
    </filter>
  </defs>`;
  function ensureDefs(){
    if(document.getElementById('hwCrayon'))return;
    const holder=document.createElement('div');
    holder.setAttribute('aria-hidden','true');
    holder.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
    holder.innerHTML=`<svg width="0" height="0" focusable="false">${DEFS}</svg>`;
    (document.body||document.documentElement).appendChild(holder);
  }
  if(typeof document!=='undefined'){ if(document.body)ensureDefs(); else document.addEventListener('DOMContentLoaded',ensureDefs); }

  const C={ // 팔레트
    orange:'#ee7b2c', orangeD:'#c95a1d', red:'#e3473a', redL:'#f7b3a4', pink:'#f39ac0', pinkD:'#d86f9c',
    yellow:'#f6cf3a', yellowD:'#dca51e', green:'#5aae57', greenD:'#3f8a45', leaf:'#b8d94a', mint:'#72c9a0', mintD:'#4ea57f',
    blue:'#4a7fd6', blueD:'#315fad', sky:'#8cc3f0', cream:'#fbeccd', brown:'#a8643a', brownD:'#7a4323', grey:'#9d9aa6', greyD:'#5f5c69',
    purple:'#9b7fd8', white:'#fffaf0'
  };

  const CAST={
    hopple:{name:'호플이',face:'18 6 84 84',draw:()=>`
      <path d="M40 100h13v7c0 3-2 5-5 5H37c-3 0-4-2-3-4 1-5 3-8 6-8Z" fill="${C.orange}" ${S}/>
      <path d="M80 100H67v7c0 3 2 5 5 5h11c3 0 4-2 3-4-1-5-3-8-6-8Z" fill="${C.orange}" ${S}/>
      <path d="M60 32C85 31 97 50 96 72C95 92 82 103 60 103C38 103 24 92 24 72C24 50 36 33 60 32Z" fill="${C.mint}" ${S}/>
      ${hatch('M80 84l7-7M77 92l9-9M70 97l8-8',C.mintD,2.2)}
      <path d="M31 80Q60 92 89 80L90 89Q60 101 30 89Z" fill="${C.yellow}" ${S}/>
      <path d="M72 88l3 15 7-2-3-14Z" fill="${C.yellow}" ${S}/>
      ${hatch('M40 86l3 3M52 89l3 3M64 90l3 3',C.yellowD,2)}
      <path d="M60 33C60 25 61 19 64 13" fill="none" stroke="${C.greenD}" stroke-width="3" stroke-linecap="round"/>
      <path d="M64 15C70 5 84 5 88 11C82 21 70 22 64 15Z" fill="${C.leaf}" ${S}/>
      <path d="M61 21C54 11 42 11 38 17C44 25 55 26 61 21Z" fill="${C.leaf}" ${S}/>
      ${dot(49,62)}${dot(71,62)}${blush(40,70)}${blush(80,70)}${mouth('M56 71q4 3.5 8 0')}`},

    squirrel:{name:'다람쥐',face:'22 14 72 72',draw:()=>`
      <path d="M72 106C104 104 117 78 109 54C103 36 85 34 83 50C81 62 97 66 93 82C90 94 81 99 72 106Z" fill="${C.orangeD}" ${S}/>
      ${hatch('M99 55c6 8 5 19-1 26M91 88c4-3 7-6 9-10',C.redL,2.4)}
      <path d="M36 106C30 86 38 71 56 71C74 71 81 87 77 106Z" fill="${C.orange}" ${S}/>
      <path d="M46 106C44 91 48 82 56 82C64 82 68 91 66 106Z" fill="${C.cream}"/>
      <path d="M36 41L33 18L50 32Z" fill="${C.orange}" ${S}/><path d="M76 41L79 18L62 32Z" fill="${C.orange}" ${S}/>
      <path d="M56 29C74 29 83 41 83 54C83 68 71 77 56 77C41 77 29 68 29 54C29 41 38 29 56 29Z" fill="${C.orange}" ${S}/>
      ${hatch('M73 38l5 5M76 46l5 5',C.orangeD,2)}
      <ellipse cx="56" cy="63" rx="11" ry="8" fill="${C.cream}"/>
      ${dot(47,53)}${dot(65,53)}
      <path d="M53.5 59h5l-2.5 3Z" fill="${INK}"/>${mouth('M53 64.5q3 2.4 6 0',2)}
      ${blush(40,62,4.4)}${blush(72,62,4.4)}
      <ellipse cx="56" cy="92" rx="6.5" ry="7.5" fill="${C.brown}" ${L(2.4)}/><path d="M48.5 88q7.5-9 15 0Z" fill="${C.brownD}" ${L(2.4)}/>
      <ellipse cx="48" cy="93" rx="4" ry="3.4" fill="${C.cream}" ${L(2)}/><ellipse cx="64" cy="93" rx="4" ry="3.4" fill="${C.cream}" ${L(2)}/>
      <ellipse cx="44" cy="106" rx="9" ry="4" fill="${C.orangeD}" ${L(2.4)}/><ellipse cx="70" cy="106" rx="9" ry="4" fill="${C.orangeD}" ${L(2.4)}/>`},

    hedgehog:{name:'고슴도치',face:'18 20 84 84',draw:()=>{
      const pts=[];
      const radii=[33,45,34,47,33,44,35,48,33,46,34,45,33,47,34,44,33];
      radii.forEach((r,i)=>{ const a=(200-220*i/(radii.length-1))*Math.PI/180; pts.push((60+r*Math.cos(a)).toFixed(1)+' '+(70-r*Math.sin(a)).toFixed(1)); });
      return `
      <path d="M60 70L${pts.join('L')}Z" fill="#6e4a33" ${S}/>
      ${hatch('M40 40l4 8M52 32l2 9M66 32l-1 9M79 40l-4 8M88 54l-7 4M32 54l7 4','#b98a63',2.4)}
      <circle cx="80" cy="30" r="7.5" fill="${C.red}" ${L(2.4)}/><path d="M80 23c1-4 4-6 7-6-1 4-4 6-7 6Z" fill="${C.leaf}" ${L(2)}/>
      <path d="M60 48C79 48 87 62 87 76C87 92 75 101 60 101C45 101 33 92 33 76C33 62 41 48 60 48Z" fill="#f5d6ae" ${S}/>
      <ellipse cx="41" cy="52" rx="5.5" ry="6.5" fill="#f5d6ae" ${L(2.4)}/><ellipse cx="79" cy="52" rx="5.5" ry="6.5" fill="#f5d6ae" ${L(2.4)}/>
      ${dot(51,72)}${dot(69,72)}
      <ellipse cx="60" cy="81" rx="4.4" ry="3.3" fill="${C.pinkD}" ${L(2)}/>${mouth('M56.5 87q3.5 2.6 7 0',2)}
      ${blush(43,82,4.4)}${blush(77,82,4.4)}
      <path d="M44 100c-2 4 0 7 5 7h6c2 0 3-2 2-4" fill="#6e4a33" ${L(2.4)}/><path d="M76 100c2 4 0 7-5 7h-6c-2 0-3-2-2-4" fill="#6e4a33" ${L(2.4)}/>`;}},

    raccoon:{name:'너구리',face:'22 18 76 72',draw:()=>`
      <path d="M76 98C99 97 112 82 107 66C104 56 95 57 95 65C96 77 88 87 73 91Z" fill="${C.grey}" ${S}/>
      <path d="M99 66l9-2M101 77l9 1M96 87l7 5" stroke="${C.greyD}" stroke-width="5" stroke-linecap="round"/>
      <path d="M38 106C34 88 42 77 58 77C74 77 81 90 77 106Z" fill="${C.blue}" ${S}/>
      ${hatch('M45 86v16M52 82v22M64 82v22M71 86v16',C.blueD,2)}
      <path d="M50 78l8 8 8-8" fill="none" ${L(2.4)}/>
      <path d="M33 43C28 30 33 21 42 25C46 27 47 33 47 36Z" fill="${C.grey}" ${S}/><path d="M83 43C88 30 83 21 74 25C70 27 69 33 69 36Z" fill="${C.grey}" ${S}/>
      <path d="M35 38c-2-6 0-10 4-9" fill="none" stroke="${C.greyD}" stroke-width="3" stroke-linecap="round"/><path d="M81 38c2-6 0-10-4-9" fill="none" stroke="${C.greyD}" stroke-width="3" stroke-linecap="round"/>
      <path d="M58 29C80 29 90 43 90 57C90 71 76 80 58 80C40 80 26 71 26 57C26 43 36 29 58 29Z" fill="${C.grey}" ${S}/>
      <path d="M29 55C35 45 49 47 58 53C67 47 81 45 87 55C83 65 71 66 58 61C45 66 33 65 29 55Z" fill="#3b3942"/>
      <circle cx="45" cy="55" r="4.4" fill="${C.white}"/><circle cx="71" cy="55" r="4.4" fill="${C.white}"/>
      ${dot(45.5,55.5,2.2)}${dot(70.5,55.5,2.2)}
      <path d="M47 66C49 60 67 60 69 66C69 74 47 74 47 66Z" fill="${C.white}"/>
      <ellipse cx="58" cy="64.5" rx="3.6" ry="2.7" fill="${INK}"/>${mouth('M55 69.5q3 2.2 6 0',2)}`},

    owl:{name:'부엉이',face:'22 8 76 76',draw:()=>`
      <path d="M33 31L27 10L46 22Z" fill="${C.brownD}" ${S}/><path d="M87 31L93 10L74 22Z" fill="${C.brownD}" ${S}/>
      <path d="M60 16C86 16 98 40 96 68C94 96 80 108 60 108C40 108 26 96 24 68C22 40 34 16 60 16Z" fill="${C.brown}" ${S}/>
      ${hatch('M32 40l6 5M30 50l7 4M88 40l-6 5M90 50l-7 4',C.brownD,2.2)}
      <path d="M60 58C77 58 84 74 82 88C80 100 70 105 60 105C50 105 40 100 38 88C36 74 43 58 60 58Z" fill="${C.cream}"/>
      <path d="M51 73q3 3 6 0M63 73q3 3 6 0M57 84q3 3 6 0M47 93q3 3 6 0M67 93q3 3 6 0" fill="none" stroke="${C.brown}" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M26 60C16 78 22 96 34 100C34 86 32 72 26 60Z" fill="${C.brownD}" ${S}/><path d="M94 60C104 78 98 96 86 100C86 86 88 72 94 60Z" fill="${C.brownD}" ${S}/>
      <circle cx="46" cy="44" r="11" fill="#fff4d6" stroke="${C.red}" stroke-width="3.4"/><circle cx="74" cy="44" r="11" fill="#fff4d6" stroke="${C.red}" stroke-width="3.4"/>
      <path d="M57 43q3-3 6 0" fill="none" stroke="${C.red}" stroke-width="3"/>
      ${dot(46,45,3.2)}${dot(74,45,3.2)}
      <path d="M56 54L64 54L60 62Z" fill="${C.yellow}" ${L(2.2)}/>
      <path d="M49 107l-2 5M54 108v5M66 108v5M71 107l2 5" stroke="${C.orange}" stroke-width="3" stroke-linecap="round"/>`},

    bluebird:{name:'파랑새',face:'16 16 80 80',draw:()=>`
      <path d="M84 80L111 66L106 80L113 90L86 94Z" fill="${C.blueD}" ${S}/>
      <path d="M58 36C84 36 96 52 95 72C94 92 80 104 58 104C36 104 22 92 22 72C22 52 34 36 58 36Z" fill="${C.blue}" ${S}/>
      <path d="M58 70C74 70 80 82 78 92C76 100 68 103 58 103C46 103 38 98 37 90C36 80 44 70 58 70Z" fill="#f6b47c"/>
      ${hatch('M46 82l5 5M52 78l7 7M60 88l5 5',C.orangeD,2)}
      <path d="M72 66C92 62 99 82 86 94C77 92 70 82 72 66Z" fill="${C.blueD}" ${S}/>
      ${hatch('M78 74l8 6M78 82l7 6',C.sky,2.2)}
      <circle cx="44" cy="36" r="5" fill="${C.yellow}" ${L(2.2)}/><circle cx="37" cy="34" r="5" fill="${C.yellow}" ${L(2.2)}/><circle cx="41" cy="28" r="5" fill="${C.yellow}" ${L(2.2)}/><circle cx="41" cy="33" r="3" fill="${C.orange}"/>
      ${dot(47,60)}${dot(65,60)}
      <path d="M50 67L62 67L56 75Z" fill="${C.yellow}" ${L(2.2)}/>
      ${blush(39,70,4.2)}${blush(73,70,4.2)}
      <path d="M50 103v8M64 103v8" stroke="${C.orange}" stroke-width="3.2" stroke-linecap="round"/>`},

    frog:{name:'개구리',face:'16 18 88 76',draw:()=>`
      <path d="M36 106c-7 0-11 3-9 6h19ZM84 106c7 0 11 3 9 6H74Z" fill="${C.green}" ${L(2.4)}/>
      <path d="M33 107C29 87 40 74 60 74C80 74 91 87 87 107Z" fill="${C.red}" ${S}/>
      <path d="M42 80L40 104M51 76L50 105M60 75V105M69 76L70 105M78 80L80 104" stroke="#fde3d2" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M44 76Q60 86 76 76L78 82Q60 94 42 82Z" fill="${C.pink}" ${L(2.4)}/>
      <circle cx="36" cy="98" r="6" fill="${C.green}" ${L(2.4)}/><circle cx="84" cy="98" r="6" fill="${C.green}" ${L(2.4)}/>
      <circle cx="40" cy="38" r="12.5" fill="${C.green}" ${S}/><circle cx="80" cy="38" r="12.5" fill="${C.green}" ${S}/>
      <path d="M60 36C84 36 97 49 97 61C97 75 81 81 60 81C39 81 23 75 23 61C23 49 36 36 60 36Z" fill="${C.green}" ${S}/>
      <path d="M31 40C34 32 46 32 49 40M71 40C74 32 86 32 89 40" fill="${C.green}"/>
      ${hatch('M80 66l7-5M76 72l9-6M30 60l6 4',C.greenD,2.2)}
      <path d="M34 39q6 4 12 0M74 39q6 4 12 0" fill="none" ${L(2.6)}/>
      ${mouth('M47 63Q60 71 73 63',2.5)}
      ${blush(33,62,5)}${blush(87,62,5)}`},

    duck:{name:'오리',face:'22 16 76 76',draw:()=>`
      <path d="M50 108h10M68 108h12" stroke="${C.orange}" stroke-width="4.4" stroke-linecap="round"/>
      <path d="M30 90C30 72 44 64 62 66C84 68 96 80 94 94C92 106 76 110 60 110C42 110 30 104 30 90Z" fill="${C.yellow}" ${S}/>
      <path d="M66 84C80 80 89 90 83 100C75 103 66 96 66 84Z" fill="${C.yellowD}" ${L(2.4)}/>
      ${hatch('M38 96l6 5M46 100l6 5',C.yellowD,2.2)}
      <path d="M56 26C74 26 82 38 82 50C82 62 72 70 56 70C40 70 30 62 30 50C30 38 38 26 56 26Z" fill="${C.yellow}" ${S}/>
      <path d="M33 38C35 21 77 21 79 38Z" fill="${C.blue}" ${S}/>
      <path d="M27 39Q56 32 85 39Q88 45 81 45Q56 40 31 45Q24 45 27 39Z" fill="${C.blueD}" ${S}/>
      ${hatch('M44 30l4 6M56 27v8M68 30l-4 6',C.sky,2.2)}
      ${dot(47,51)}${dot(65,51)}
      <path d="M44 60C44 54 68 54 68 60C68 66 60 68 56 68C52 68 44 66 44 60Z" fill="${C.orange}" ${L(2.4)}/>
      <path d="M47 61H65" stroke="${C.orangeD}" stroke-width="2" stroke-linecap="round"/>
      ${blush(38,59,4.2)}${blush(74,59,4.2)}`},

    butterfly:{name:'나비',face:'36 22 48 48',draw:()=>`
      <path d="M57 58C42 18 7 20 10 48C12 66 34 72 57 64Z" fill="${C.orange}" ${S}/>
      <path d="M63 58C78 18 113 20 110 48C108 66 86 72 63 64Z" fill="${C.orange}" ${S}/>
      <path d="M57 67C35 70 19 90 33 101C46 109 58 88 57 72Z" fill="${C.pink}" ${S}/>
      <path d="M63 67C85 70 101 90 87 101C74 109 62 88 63 72Z" fill="${C.pink}" ${S}/>
      <circle cx="29" cy="43" r="7" fill="${C.yellow}" ${L(2.2)}/><circle cx="91" cy="43" r="7" fill="${C.yellow}" ${L(2.2)}/>
      <circle cx="40" cy="89" r="4.5" fill="${C.white}" ${L(2)}/><circle cx="80" cy="89" r="4.5" fill="${C.white}" ${L(2)}/>
      ${hatch('M20 52l8 6M26 60l9 5M100 52l-8 6M94 60l-9 5',C.orangeD,2.2)}
      <path d="M58 40C55 80 56 98 60 104C64 98 65 80 62 40Z" fill="#4a3a5e" ${L(2.4)}/>
      <path d="M55 38C52 27 46 22 41 23c-4 1-3 6 1 5M65 38C68 27 74 22 79 23c4 1 3 6-1 5" fill="none" ${L(2.4)}/>
      <circle cx="60" cy="47" r="12" fill="#ffd6a6" ${S}/>
      ${dot(55.5,46,2.2)}${dot(64.5,46,2.2)}${mouth('M57.5 51q2.5 2 5 0',1.9)}${blush(51,51,2.8)}${blush(69,51,2.8)}`},

    ladybug:{name:'무당벌레',face:'32 18 56 56',draw:()=>`
      <path d="M28 70h-10M30 86l-10 7M92 70h10M90 86l10 7" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M60 42C84 42 96 58 96 76C96 96 80 107 60 107C40 107 24 96 24 76C24 58 36 42 60 42Z" fill="${C.red}" ${S}/>
      <path d="M60 48V106" stroke="${INK}" stroke-width="3"/>
      <circle cx="43" cy="66" r="6.5" fill="${INK}"/><circle cx="77" cy="66" r="6.5" fill="${INK}"/>
      <circle cx="40" cy="89" r="5" fill="${INK}"/><circle cx="80" cy="89" r="5" fill="${INK}"/><circle cx="60" cy="97" r="3.4" fill="${INK}"/>
      ${hatch('M78 50l9 9M84 56l7 8',C.redL,2.6)}
      <path d="M50 29C46 20 42 17 37 18c-3 1-2 5 1 4M70 29C74 20 78 17 83 18c3 1 2 5-1 4" fill="none" ${L(2.4)}/>
      <path d="M60 28C74 28 82 36 82 45C82 54 72 58 60 58C48 58 38 54 38 45C38 36 46 28 60 28Z" fill="#3a3140" ${S}/>
      <ellipse cx="52" cy="43" rx="4.4" ry="4.8" fill="${C.white}"/><ellipse cx="68" cy="43" rx="4.4" ry="4.8" fill="${C.white}"/>
      ${dot(52.5,43.5,2.2)}${dot(67.5,43.5,2.2)}
      ${mouth('M56 50.5q4 3 8 0',2)}`.replace('M56 50.5q4 3 8 0" fill="none" stroke="'+INK,'M56 50.5q4 3 8 0" fill="none" stroke="#fffaf0')},

    bee:{name:'꿀벌',face:'24 22 72 72',draw:()=>`
      <path d="M34 50C20 36 26 20 40 26C48 30 50 40 48 50Z" fill="#e6f4ff" ${L(2.4)}/>
      <path d="M86 50C100 36 94 20 80 26C72 30 70 40 72 50Z" fill="#e6f4ff" ${L(2.4)}/>
      ${hatch('M36 32l6 6M84 32l-6 6',C.sky,2)}
      <path d="M52 36C50 26 46 22 41 22M68 36C70 26 74 22 79 22" fill="none" ${L(2.4)}/>
      <circle cx="41" cy="21" r="3.4" fill="${INK}"/><circle cx="79" cy="21" r="3.4" fill="${INK}"/>
      <path d="M60 104L55 112L65 112Z" fill="${INK}"/>
      <path d="M60 36C82 36 94 52 94 70C94 90 80 105 60 105C40 105 26 90 26 70C26 52 38 36 60 36Z" fill="${C.yellow}" ${S}/>
      <path d="M28 80Q60 72 92 80L91 89Q60 81 29 89ZM34 96Q60 89 86 96L80 102Q60 97 40 102Z" fill="${INK}"/>
      ${hatch('M78 46l7 7M82 56l6 6',C.yellowD,2.4)}
      ${dot(50,60)}${dot(70,60)}${mouth('M56 67q4 3 8 0')}${blush(41,67,4.6)}${blush(79,67,4.6)}`},

    ant:{name:'개미',face:'20 34 56 56',draw:()=>`
      <path d="M60 92l-10 16M66 92l4 16M84 94l10 14M58 88l-16 8" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <path d="M92 72C104 74 110 84 108 94C106 102 96 106 88 104C78 102 72 94 74 84C76 76 83 71 92 72Z" fill="${C.red}" ${S}/>
      ${hatch('M96 80l6 6M92 88l8 8',C.redL,2.4)}
      <ellipse cx="66" cy="86" rx="10" ry="9" fill="#c93f33" ${L(2.6)}/>
      <path d="M40 46C36 34 30 30 24 32M54 44C58 32 64 28 70 30" fill="none" ${L(2.4)}/>
      <circle cx="24" cy="32" r="3" fill="${INK}"/><circle cx="70" cy="30" r="3" fill="${INK}"/>
      <path d="M72 28C86 16 104 22 106 34C96 40 82 40 72 28Z" fill="${C.leaf}" ${L(2.4)}/><path d="M76 30Q90 30 104 34" fill="none" stroke="${C.greenD}" stroke-width="2"/>
      <path d="M46 42C60 42 70 52 70 64C70 77 60 86 46 86C32 86 22 77 22 64C22 52 32 42 46 42Z" fill="${C.red}" ${S}/>
      ${dot(38,62)}${dot(54,62)}${mouth('M42 70q4 3 8 0')}${blush(30,70,4)}${blush(62,70,4)}`},

    beaver:{name:'비버',face:'22 18 72 72',draw:()=>`
      <path d="M80 80C98 78 110 90 106 104C102 114 88 112 80 104C74 98 74 86 80 80Z" fill="#6b4a33" ${S}/>
      <path d="M84 86l16 14M82 96l12 10M92 84l12 10M86 104l10-12M96 106l8-10" stroke="#9c7657" stroke-width="2" stroke-linecap="round"/>
      <path d="M34 108C30 88 40 76 56 76C72 76 82 88 78 108Z" fill="${C.brown}" ${S}/>
      <path d="M44 108C42 94 48 86 56 86C64 86 70 94 68 108Z" fill="${C.cream}"/>
      <rect x="30" y="88" width="52" height="12" rx="6" fill="#c98d52" ${L(2.6)}/>
      <ellipse cx="81" cy="94" rx="4" ry="6" fill="#e9c38f" ${L(2)}/>${hatch('M40 92h14M58 96h16',C.brownD,2)}
      <circle cx="36" cy="36" r="7.5" fill="${C.brownD}" ${S}/><circle cx="78" cy="36" r="7.5" fill="${C.brownD}" ${S}/>
      <path d="M57 28C75 28 85 40 85 55C85 70 73 80 57 80C41 80 29 70 29 55C29 40 39 28 57 28Z" fill="${C.brown}" ${S}/>
      ${hatch('M74 36l5 5M78 45l5 5',C.brownD,2)}
      <path d="M44 66C46 58 68 58 70 66C70 74 44 74 44 66Z" fill="${C.cream}"/>
      ${dot(47,52)}${dot(67,52)}
      <ellipse cx="57" cy="61" rx="5" ry="3.6" fill="${INK}"/>
      <path d="M52 68H62V77H52Z" fill="${C.white}" ${L(2.2)}/><path d="M57 68V77" stroke="${INK}" stroke-width="1.8"/>
      ${blush(38,64,4.4)}${blush(76,64,4.4)}`}
  };

  /* 납품받은 그림(assets/art/char)이 있는 캐릭터는 PNG를 쓰고, 없으면 SVG 임시 그림을 쓴다.
     얼굴 보기는 납품된 얼굴 아이콘(테두리 없음)을 쓴다. */
  const ART_BASE='assets/art/char/';
  const ART_IDS=new Set(['hopple','squirrel','hedgehog','raccoon','owl','bluebird','frog','duck','butterfly','ladybug','bee','ant','beaver']);
  /* AI 스타일 테스트(assets/art/style-test-v1)를 앱에서 확인하는 스위치.
     true: 호플이·개구리를 테스트 그림으로 보여준다. 기쁨·안내 포즈가 아직 없어 전신 그림으로 대신한다.
     false: 기존 납품 그림으로 되돌린다. */
  const ART_TEST_ON=false;
  const ART_TEST_BASE='assets/art/char-test/';
  const ART_TEST_IDS=new Set(['hopple','frog']);
  function artMarkup(id,view){
    const test=ART_TEST_ON&&ART_TEST_IDS.has(id);
    const base=test?ART_TEST_BASE:ART_BASE;
    if(view==='face')return `<span class="hw-char face hw-art hw-${id}" aria-hidden="true"><img src="${base}char_${id}_face.png" alt="" draggable="false" decoding="async"></span>`;
    const file=test?'full':(view==='happy'?'happy':(view==='guide'&&id==='hopple'?'guide':'full'));
    return `<span class="hw-char full hw-art hw-${id}" aria-hidden="true"><img src="${base}char_${id}_${file}.png" alt="" draggable="false" decoding="async"></span>`;
  }
  function hwChar(id,view,opts){
    if(!CAST[id])id='hopple';
    const c=CAST[id], standalone=opts&&opts.standalone;
    if(!standalone&&ART_IDS.has(id)&&typeof document!=='undefined')return artMarkup(id,view);
    const box=view==='face'?c.face:'0 0 120 120';
    if(!standalone&&typeof document!=='undefined')ensureDefs();
    return `<svg class="hw-char ${view==='face'?'face':'full'} hw-${id}" viewBox="${box}" aria-hidden="true" focusable="false"${standalone?' xmlns="http://www.w3.org/2000/svg"':''}>${standalone?DEFS:''}<g filter="url(#hwCrayon)">${c.draw()}</g></svg>`;
  }
  function hwCharName(id){ return (CAST[id]||CAST.hopple).name; }

  window.HW_CAST=CAST;
  window.HW_CRAYON_DEFS=DEFS;
  window.hwChar=hwChar;
  window.hwCharName=hwCharName;
})();
