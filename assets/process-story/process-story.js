/* PROCESS STORY — one active scene, one presentation stage, one gesture per scene. */
(function(){
  const section=document.getElementById('process'); if(!section) return;
  const root=document.documentElement, track=section.querySelector('.pst-track'), stage=section.querySelector('.pst-stage');
  const scenes=[...section.querySelectorAll('.pst-scene')], imgs=scenes.map(s=>s.querySelector('img'));
  const ticks=[...section.querySelectorAll('.pst-progress a')], bars=ticks.map(a=>a.querySelector('.pst-tick'));
  const count=section.querySelector('.pst-progress-num'), N=scenes.length, reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let DURATION=680, EXIT=1150;
  // One slide = the scroll distance the layout really gives it: (track height − pinned stage height) / (slides − 1). It must come from the layout (100svh),
  // never from innerHeight: on phones innerHeight grows when the browser's address bar collapses, which would put the last slides out of the pinned range.
  const STEP=()=>Math.max(1,(track.offsetHeight-stage.offsetHeight)/Math.max(1,scenes.length-1));
  // Visitor memory: a first visit gets the full step-by-step story; from the second visit (or once someone has read it to the end)
  // the story runs in a faster mode. ?story=fast / ?story=slow overrides it for testing.
  const MEM='om-story-v1'; let fast=false, seen=false;
  try{const v=JSON.parse(localStorage.getItem(MEM)||'{}');if(!sessionStorage.getItem(MEM)){v.visits=(v.visits||0)+1;sessionStorage.setItem(MEM,'1');localStorage.setItem(MEM,JSON.stringify(v))}fast=(v.visits||0)>=2||!!v.seen;seen=!!v.seen}catch(e){}
  const force=new URLSearchParams(location.search).get('story');if(force==='fast')fast=true;if(force==='slow')fast=false;
  if(fast){DURATION=460;EXIT=850;root.classList.add('pst-fast')}
  const markSeen=()=>{if(seen)return;seen=true;try{const v=JSON.parse(localStorage.getItem(MEM)||'{}');v.seen=true;localStorage.setItem(MEM,JSON.stringify(v))}catch(e){}};
  let curFrom=-1, nav=false, navT=0, settleT=0, navHash='', adv=[];
  let active=0, transition=false, timer=0, wheelAccum=0, wheelDir=0, lastWheel=0, lastAbs=0, lastGo=0, wheelArmed=true, touchStart=null, touchUsed=false,interacted=false;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), pad=n=>String(n+1).padStart(2,'0');
  const sceneY=k=>track.getBoundingClientRect().top+window.scrollY+k*STEP();
  const jump=y=>{if(window.omScrollJump){window.omScrollJump(y);return}const old=root.style.scrollBehavior;root.style.scrollBehavior='auto';window.scrollTo(0,y);root.style.scrollBehavior=old};
  // glide (smooth scrolling on) or native smooth scroll (off): used for exits and link navigation, never for scene steps
  const glide=y=>{if(window.omScrollTo)window.omScrollTo(y);else window.scrollTo({top:y,behavior:'smooth'})};
  window.omStoryOwns=n=>!reduce.matches&&inPresentation()&&stage.contains(n);
  const inPresentation=()=>{const top=track.getBoundingClientRect().top,bottom=top+track.offsetHeight;return top<=1&&bottom-stage.offsetHeight>=-24};
  function reconcile(){scenes.forEach((s,i)=>{if(i===active||i===curFrom)return;s.classList.remove('is-active','is-leaving','is-entering','is-live')})}
  function mark(k){active=clamp(k,0,N-1);count.textContent=pad(active);scenes.forEach((s,i)=>s.classList.toggle('is-active',i===active));ticks.forEach((a,i)=>{a.toggleAttribute('aria-current',i===active);bars[i].style.setProperty('--p',i<=active?'1':'0')});section.dataset.activeScene=String(active+1);reconcile()}
  function warm(k){[k,k+1,k+2,k-1].forEach((i,n)=>{if(i<0||i>=N)return;const im=imgs[i];im.loading='eager';im.decoding='async';if(n===0)im.fetchPriority='high';if(im.decode)im.decode().catch(()=>{})})}
  const preload=warm;
  // fetch every slide image ahead of the viewer (one after another, so the first ones are not starved) once the section is near
  function warmAll(){let i=0;const next=()=>{if(i>=N)return;const im=imgs[i++];im.loading='eager';const done=()=>next();im.decode?im.decode().then(done,done):(im.complete?done():(im.onload=im.onerror=done))};next()}
  function finish(from,to){curFrom=-1;
    // the slide that left is done: clear every transition class so nothing can replay its fade-in later
    scenes[from].classList.remove('is-active','is-leaving','is-entering','is-live');
    // the new slide keeps its entrance animation running for 1.1 s, but only while it is still the active one
    setTimeout(()=>{const c=scenes[to].classList;if(c.contains('is-active')&&!c.contains('is-leaving')){c.remove('is-entering','is-live')}reconcile()},EXIT)}
  
  function go(delta){if(transition||!delta)return false;const next=clamp(active+delta,0,N-1);if(next===active)return false;
    if(fast){const n=performance.now();adv=adv.filter(a=>n-a.t<2600&&a.d===delta);adv.push({t:n,d:delta});if(adv.length>=3){adv=[];skipOut(delta);return true}}
    if(next===N-1)markSeen();const from=active;curFrom=from;transition=true;wheelArmed=false;lastGo=performance.now();warm(next);const run=()=>{scenes[from].classList.add('is-leaving');scenes[next].classList.add('is-live','is-entering');mark(next);clearTimeout(timer);timer=setTimeout(()=>{finish(from,next);transition=false},DURATION);jump(sceneY(next))};const im=imgs[next];
    // the fade only reads if the picture is there: hold the swap until the next image is decoded (at most 600 ms), so it never pops in after the fade
    if(im.complete&&im.naturalWidth)run();else Promise.race([im.decode?im.decode().catch(()=>{}):Promise.resolve(),new Promise(r=>setTimeout(r,600))]).then(run);return true}
  // ---- navigation intent: a link, the logo, the menu, a hash change or history navigation sends the page somewhere on purpose.
  // The story must not pull it back, so while such a scroll runs we only follow along, and settle on the right slide at rest.
  function cleanScenes(){clearTimeout(timer);transition=false;curFrom=-1;scenes.forEach((s,i)=>{if(i!==active)s.classList.remove('is-active','is-leaving','is-entering','is-live')})}
  function restPos(){const r=track.getBoundingClientRect();if(r.top>1){if(active!==0){mark(0);cleanScenes()}}else if(r.bottom-window.innerHeight<-24){if(active!==N-1){mark(N-1);cleanScenes()}}}
  function settle(){if(inPresentation()){const k=clamp(Math.round(-track.getBoundingClientRect().top/STEP()),0,N-1);mark(k);cleanScenes();jump(sceneY(k))}else restPos()}
  function endNav(){nav=false;clearTimeout(navT);clearTimeout(settleT);settle();
    // a long trip can shift the layout a little: land exactly on the section the link pointed to
    if(navHash){const t=document.querySelector(navHash);navHash='';if(t){const y=t.getBoundingClientRect().top+window.scrollY-60;if(Math.abs(y-window.scrollY)>6&&!inPresentation())glide(y)}}}
  function startNav(){nav=true;touchStart=null;clearTimeout(navT);navT=setTimeout(endNav,6000);clearTimeout(settleT);settleT=setTimeout(endNav,450)}
  window.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('a[href],button,[role=button]');if(t&&!t.closest('.pst-progress')){startNav();const h=t.getAttribute&&t.getAttribute('href');navHash=h&&h.length>1&&h[0]==='#'?h:''}},true);
  window.addEventListener('hashchange',startNav);window.addEventListener('popstate',startNav);
  // a returning visitor who keeps flicking through gets out of the section instead of stepping through every slide
  function skipOut(dir){startNav();const r=track.getBoundingClientRect(),y=dir>0?r.top+window.scrollY+track.offsetHeight:section.getBoundingClientRect().top+window.scrollY-8;glide(y)}
  function boundary(dir){if((dir<0&&active===0)||(dir>0&&active===N-1)){touchStart=null;return true}return false}
  function wheel(e){interacted=true;if(nav&&e.isTrusted){nav=false;clearTimeout(settleT)}if(e.ctrlKey||!inPresentation()||!stage.contains(e.target))return;const dy=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?window.innerHeight:1);if(!dy||Math.abs(dy)<Math.abs(e.deltaX))return;const dir=Math.sign(dy),abs=Math.abs(dy),now=performance.now(),gap=now-lastWheel;lastWheel=now;const stream=gap<=90&&now-lastGo<1400;if(boundary(dir)){if(stream){e.preventDefault();lastAbs=abs;return}return}e.preventDefault();if(transition){lastAbs=abs;wheelDir=dir;return}if(!wheelArmed&&(gap>90||dir!==wheelDir||abs>lastAbs*1.6+8)){wheelArmed=true;wheelAccum=0}lastAbs=abs;wheelDir=dir;if(!wheelArmed)return;if(gap>180)wheelAccum=0;wheelAccum+=dy;const threshold=Math.max(36,Math.min(90,window.innerHeight*.06));if(Math.abs(wheelAccum)>=threshold){wheelAccum=0;go(dir)}}
  function touchStartHandler(e){interacted=true;if(nav){nav=false;clearTimeout(settleT)}if(!inPresentation()||!stage.contains(e.target)||e.touches.length!==1)return;touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};touchUsed=false}
  function touchMove(e){if(!touchStart)return;
    // A swipe that has already changed the slide belongs to the story until the finger lifts. If it were handed to the browser once the new slide is the
    // first or last one, the rest of the same swipe (and its momentum) would scroll the page out of the section and skip slide 1 / slide 11.
    if(touchUsed){if(e.cancelable)e.preventDefault();return}
    if(!inPresentation())return;
    const dx=e.touches[0].clientX-touchStart.x,dy=e.touches[0].clientY-touchStart.y;if(Math.abs(dy)<2)return;const d=dy<0?1:-1;
    // only a fresh swipe that starts on the first/last slide and points out of the story is left to normal page scrolling
    if(boundary(d))return;
    if(e.cancelable)e.preventDefault();
    if(!transition&&Math.abs(dy)>=34&&Math.abs(dy)>=Math.abs(dx)){touchUsed=true;go(d)}}
  function touchEnd(e){if(!touchStart)return;const dy=e.changedTouches[0].clientY-touchStart.y;touchStart=null;if(touchUsed||Math.abs(dy)<42||transition)return;const dir=dy<0?1:-1;if(boundary(dir))return;go(dir)}
  function key(e){interacted=true;if(!inPresentation()||e.altKey||e.ctrlKey||e.metaKey)return;const dir=e.key==='ArrowDown'||e.key==='PageDown'||e.key===' '?1:e.key==='ArrowUp'||e.key==='PageUp'?-1:0;if(!dir)return;if(boundary(dir))return;e.preventDefault();go(dir)}
  function sync(){if(nav){clearTimeout(settleT);settleT=setTimeout(endNav,160)}if(transition||touchStart||(!nav&&performance.now()-lastGo<700))return;const top=track.getBoundingClientRect().top,step=STEP();if(inPresentation()){const k=clamp(Math.round(-top/step),0,N-1);if(k!==active){if(interacted&&!nav)jump(sceneY(active));else mark(k)}}else restPos()}
  ticks.forEach((a,i)=>a.addEventListener('click',e=>{e.preventDefault();if(i===active||transition)return;const from=active;curFrom=from;jump(sceneY(i));preload(i);scenes[from].classList.add('is-leaving');scenes[i].classList.add('is-entering','is-live');mark(i);setTimeout(()=>finish(from,i),DURATION)}));
  scenes.forEach((s,i)=>s.addEventListener('focusin',()=>{if(inPresentation()&&i!==active&&!transition){jump(sceneY(i));mark(i)}}));
  imgs.forEach((img,i)=>{img.loading=i<2?'eager':'lazy';img.decoding='async'});
  root.classList.add('pst-js','pst-pin');mark(0);preload(0);
  if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect();warmAll()}},{rootMargin:'250% 0px'});io.observe(section)}else warmAll();
  if(!reduce.matches){window.addEventListener('wheel',wheel,{passive:false});window.addEventListener('touchstart',touchStartHandler,{passive:true});window.addEventListener('touchmove',touchMove,{passive:false});window.addEventListener('touchend',touchEnd,{passive:true});window.addEventListener('touchcancel',()=>{touchStart=null},{passive:true});window.addEventListener('keydown',key)}else root.classList.add('pst-reduced');
  window.addEventListener('scroll',sync,{passive:true});window.addEventListener('resize',()=>{if(inPresentation())jump(sceneY(active))});
})();
