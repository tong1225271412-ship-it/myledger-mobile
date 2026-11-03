/* VASCONTA V0.1.6 · Splash only. No account, storage or sync access. */
(()=>{
  'use strict';
  const splash=document.getElementById('vascontaSplash');
  if(!splash)return;
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){splash.remove();return;}
  let finished=false;
  const finish=()=>{if(finished)return;finished=true;clearTimeout(timer);splash.classList.add('is-completing');splash.setAttribute('aria-hidden','true');splash.removeAttribute('aria-modal');if(splash.contains(document.activeElement))document.activeElement.blur();setTimeout(()=>splash.remove(),500);};
  const timer=setTimeout(finish,3100);
  document.getElementById('vascontaSplashSkip')?.addEventListener('click',finish,{once:true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')finish();});
})();
