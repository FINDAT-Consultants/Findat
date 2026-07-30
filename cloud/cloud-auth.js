(()=>{
  'use strict';
  const desktop=document.getElementById('desktop');
  if(!desktop)return;
  const parentWindow=(()=>{try{return window.parent&&window.parent!==window?window.parent:null}catch{return null}})();
  const client=parentWindow?.FINDAT_SUPABASE_CLIENT||null;
  const account=parentWindow?.FINDAT_ACTIVE_ACCOUNT||null;
  let unlocked=false;

  const overlay=document.createElement('section');
  overlay.className='cloud-access-gate';
  overlay.setAttribute('aria-label','FINDAT Cloud sign in');
  overlay.innerHTML=`<form class="cloud-access-card" id="cloudAccessForm" autocomplete="off">
    <div class="cloud-access-logo"><span class="aurelia-symbol"></span></div>
    <h1>FINDAT Cloud</h1>
    <p>Enter your assigned monthly Cloud password.</p>
    <label>Username<input id="cloudAccessUsername" type="text" autocomplete="username" readonly></label>
    <label>Cloud password<input id="cloudAccessPassword" type="password" autocomplete="current-password" placeholder="Enter monthly Cloud password" required></label>
    <button type="submit"><span>Sign in to Cloud</span><i>→</i></button>
    <small id="cloudAccessStatus" aria-live="polite"></small>
  </form>`;
  desktop.appendChild(overlay);
  desktop.classList.add('cloud-auth-locked');

  function setStatus(message,error=false){const host=document.getElementById('cloudAccessStatus');if(host){host.textContent=message||'';host.classList.toggle('is-error',error)}}
  function unlock(){unlocked=true;desktop.classList.remove('cloud-auth-locked');overlay.classList.add('is-hidden');setTimeout(()=>overlay.remove(),400)}
  function showGate(){
    const liveAccount=parentWindow?.FINDAT_ACTIVE_ACCOUNT||account;
    const username=document.getElementById('cloudAccessUsername');if(username)username.value=liveAccount?.username||'';
    if(!liveAccount){overlay.classList.add('is-visible');setStatus('Sign in to the main FINDAT website first.',true);setTimeout(()=>{if(!unlocked)showGate()},800);return}
    if(liveAccount.role==='admin'){unlock();return}
    overlay.classList.add('is-visible');document.getElementById('cloudAccessPassword')?.focus()
  }

  document.getElementById('cloudAccessForm')?.addEventListener('submit',async event=>{
    event.preventDefault();if(unlocked)return;
    const liveAccount=parentWindow?.FINDAT_ACTIVE_ACCOUNT||account;
    if(!client||!liveAccount){setStatus('Your FINDAT session is unavailable. Sign in again.',true);return}
    const password=String(document.getElementById('cloudAccessPassword')?.value||'');
    if(!password){setStatus('Enter the Cloud password from your notification.',true);return}
    const button=event.currentTarget.querySelector('button');if(button)button.disabled=true;setStatus('Checking Cloud access…');
    try{
      const result=await client.rpc('findat_verify_cloud_access',{p_username:liveAccount.username,p_password:password});
      if(result.error)throw result.error;
      const row=Array.isArray(result.data)?result.data[0]:result.data;
      if(!row?.access_granted){setStatus(row?.message||'Cloud access was not granted.',true);return}
      document.getElementById('cloudAccessPassword').value='';setStatus(row.message||'Cloud access granted.');unlock()
    }catch(error){setStatus(error.message||'Cloud access could not be checked.',true)}finally{if(button)button.disabled=false}
  });


  client?.auth?.onAuthStateChange?.((event,session)=>{
    if(event==='SIGNED_OUT'||!session?.user){unlocked=false;location.reload();return}
    if(!unlocked)setTimeout(showGate,100)
  });

  // Keep the existing boot loader and wallpaper untouched. The sign-in appears only after it finishes.
  const waitForBoot=()=>{
    const boot=document.getElementById('boot-screen');
    if(boot&&document.body.contains(boot)){setTimeout(waitForBoot,180);return}
    showGate()
  };
  setTimeout(waitForBoot,1200);
})();
