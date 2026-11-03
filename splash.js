/* MyLedger v0.1.5.1 startup overlay. No access to personal data, auth or storage. */
(()=>{
  'use strict';
  const splash=document.getElementById('myledgerSplash');
  if(!splash) return;
  const skip=document.getElementById('myledgerSplashSkip');
  let done=false;
  let timeoutId;
  let disposeId;
  function finish(){
    if(done)return;
    done=true;
    clearTimeout(timeoutId);
    splash.classList.add('is-completing');
    splash.setAttribute('aria-hidden','true');
    splash.removeAttribute('aria-modal');
    if(splash.contains(document.activeElement))document.activeElement.blur();
    disposeId=setTimeout(()=>{splash.remove();},560);
  }
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    splash.remove();
    return;
  }
  skip?.addEventListener('click',finish,{once:true});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!done)finish();
  });
  // Timing starts as soon as the DOM/deferred script is ready; app code runs beneath the overlay.
  timeoutId=setTimeout(finish,2650);
})();
