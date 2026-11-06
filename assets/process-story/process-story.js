/* PROCESS STORY — one active scene, one presentation stage, one gesture per scene. */
(function(){
  const section=document.getElementById('process'); if(!section) return;
  const root=document.documentElement, track=section.querySelector('.pst-track'), stage=section.querySelector('.pst-stage');
  const scenes=[...section.querySelectorAll('.pst-scene')], imgs=scenes.map(s=>s.querySelector('img'));
  const ticks=[...section.querySelectorAll('.pst-progress a')], bars=ticks.map(a=>a.querySelector('.pst-tick'));
  const count=section.querySelector('.pst-progress-num'), N=scenes.length, reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const DURATION=720, STEP=()=>Math.max(1,window.innerHeight-(parseFloat(getComputedStyle(section).getPropertyValue('--pst-nav'))||0));
  let active=0, transition=false, timer=0, wheelAccum=0, wheelDir=0, lastWheel=0, lastAbs=0, lastGo=0, wheelArmed=true, touchStart=null, touchUsed=false,interacted=false;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), pad=n=>String(n+1).padStart(2,'0');
  const sceneY=k=>track.getBoundingClientRect().top+window.scrollY+k*STEP();
  const jump=y=>{const old=root.style.scrollBehavior;root.style.scrollBehavior='auto';window.scrollTo(0,y);root.style.scrollBehavior=old};
  const inPresentation=()=>{const top=track.getBoundingClientRect().top,bottom=top+track.offsetHeight;return top<=1&&bottom-window.innerHeight>=-24};
  function mark(k){active=clamp(k,0,N-1);count.textContent=pad(active);scenes.forEach((s,i)=>s.classList.toggle('is-active',i===active));ticks.forEach((a,i)=>{a.toggleAttribute('aria-current',i===active);bars[i].style.setProperty('--p',i<=active?'1':'0')});section.dataset.activeScene=String(active+1)}
  function preload(k){[k-1,k,k+1].forEach(i=>{if(i>=0&&i<N){imgs[i].loading='eager';imgs[i].decoding='async'}})}
  function finish(from,to){scenes[from].classList.remove('is-active','is-leaving');setTimeout(()=>scenes[to].classList.remove('is-entering'),1100)}
  
  function go(delta){if(transition||!delta)return false;const next=clamp(active+delta,0,N-1);if(next===active)return false;const from=active;transition=true;wheelArmed=false;lastGo=performance.now();preload(next);scenes[from].classList.add('is-leaving');scenes[next].classList.add('is-live','is-entering');mark(next);clearTimeout(timer);timer=setTimeout(()=>{finish(from,next);transition=false},DURATION);jump(sceneY(next));return true}
  function boundary(dir){if((dir<0&&active===0)||(dir>0&&active===N-1)){touchStart=null;return true}return false}
  function wheel(e){interacted=true;if(e.ctrlKey||!inPresentation()||!stage.contains(e.target))return;const dy=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?window.innerHeight:1);if(!dy||Math.abs(dy)<Math.abs(e.deltaX))return;const dir=Math.sign(dy),abs=Math.abs(dy),now=performance.now(),gap=now-lastWheel;lastWheel=now;const stream=gap<=90&&now-lastGo<1400;if(boundary(dir)){if(stream){e.preventDefault();lastAbs=abs;return}return}e.preventDefault();if(transition){lastAbs=abs;wheelDir=dir;return}if(!wheelArmed&&(gap>90||dir!==wheelDir||abs>lastAbs*1.6+8)){wheelArmed=true;wheelAccum=0}lastAbs=abs;wheelDir=dir;if(!wheelArmed)return;if(gap>180)wheelAccum=0;wheelAccum+=dy;const threshold=Math.max(36,Math.min(90,window.innerHeight*.06));if(Math.abs(wheelAccum)>=threshold){wheelAccum=0;go(dir)}}
  function touchStartHandler(e){interacted=true;if(!inPresentation()||!stage.contains(e.target)||e.touches.length!==1)return;touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};touchUsed=false}
  function touchMove(e){if(!touchStart||!inPresentation())return;const dx=e.touches[0].clientX-touchStart.x,dy=e.touches[0].clientY-touchStart.y;if(Math.abs(dy)<Math.abs(dx)||Math.abs(dy)<2)return;const d=dy<0?1:-1;if(boundary(d))return;e.preventDefault();if(!touchUsed&&!transition&&Math.abs(dy)>=34){touchUsed=true;go(d)}}
  function touchEnd(e){if(!touchStart)return;const dy=e.changedTouches[0].clientY-touchStart.y;touchStart=null;if(touchUsed||Math.abs(dy)<42||transition)return;const dir=dy<0?1:-1;if(boundary(dir))return;go(dir)}
  function key(e){interacted=true;if(!inPresentation()||e.altKey||e.ctrlKey||e.metaKey)return;const dir=e.key==='ArrowDown'||e.key==='PageDown'||e.key===' '?1:e.key==='ArrowUp'||e.key==='PageUp'?-1:0;if(!dir)return;if(boundary(dir))return;e.preventDefault();go(dir)}
  function sync(){if(transition||touchStart||performance.now()-lastGo<700)return;const top=track.getBoundingClientRect().top,step=STEP();if(top<=1&&top+track.offsetHeight-window.innerHeight>=-24){const k=clamp(Math.round(-top/step),0,N-1);if(k!==active){if(interacted)jump(sceneY(active));else mark(k)}}}
  ticks.forEach((a,i)=>a.addEventListener('click',e=>{e.preventDefault();if(i===active||transition)return;const from=active;jump(sceneY(i));preload(i);scenes[from].classList.add('is-leaving');scenes[i].classList.add('is-entering','is-live');mark(i);setTimeout(()=>finish(from,i),DURATION)}));
  scenes.forEach((s,i)=>s.addEventListener('focusin',()=>{if(inPresentation()&&i!==active&&!transition){jump(sceneY(i));mark(i)}}));
  imgs.forEach((img,i)=>{img.loading=i<2?'eager':'lazy';img.decoding='async'});
  root.classList.add('pst-js','pst-pin');mark(0);preload(0);
  if(!reduce.matches){window.addEventListener('wheel',wheel,{passive:false});window.addEventListener('touchstart',touchStartHandler,{passive:true});window.addEventListener('touchmove',touchMove,{passive:false});window.addEventListener('touchend',touchEnd,{passive:true});window.addEventListener('touchcancel',()=>{touchStart=null},{passive:true});window.addEventListener('keydown',key)}else root.classList.add('pst-reduced');
  window.addEventListener('scroll',sync,{passive:true});window.addEventListener('resize',()=>{if(inPresentation())jump(sceneY(active))});
})();
