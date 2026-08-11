(()=>{
  'use strict';
  const CARD_ID='assuranceRegentDevelopmentCard';
  const STYLE_ID='assuranceRegentDevelopmentStyles';
  const appUrl=()=>{
    const configured=String(window.ASSURANCE_REGENT_URL||'').trim();
    if(configured)return configured;
    return new URL('adra_recovery_work/',document.baseURI).href;
  };

  function addStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .dev-app-icon.dev-app-icon-logo{background:#fff;overflow:hidden;padding:4px;box-shadow:inset 0 0 0 1px rgba(20,34,52,.10),0 12px 25px rgba(23,35,53,.14)}
      .dev-app-icon.dev-app-icon-logo img{width:100%;height:100%;display:block;object-fit:contain;border-radius:14px}
    `;
    document.head.appendChild(style);
  }

  function openAssuranceRegent(event){
    event?.stopPropagation?.();
    const target=appUrl();
    const opened=window.open(target,'_blank','noopener,noreferrer');
    if(!opened)window.location.href=target;
  }

  function updateSummary(){
    const summary=document.querySelector('.dev-store-summary article:first-child');
    if(!summary)return;
    const count=summary.querySelector('strong');
    const label=summary.querySelector('span');
    if(count)count.textContent='2';
    if(label)label.textContent='Applications available for browser testing';
  }

  function createCard(){
    const card=document.createElement('article');
    card.id=CARD_ID;
    card.className='dev-app-card is-available';
    card.dataset.appName='assurance regent human capital intelligence recovery agent work evidence recovery assurance adra';
    card.innerHTML=`
      <div class="dev-app-card-top">
        <span aria-hidden="true" class="dev-app-icon dev-app-icon-logo"><img src="adra_recovery_work/public/assets/AR-06.png" alt=""></span>
        <span class="dev-app-availability">Available</span>
      </div>
      <h4>Assurance Regent</h4>
      <span class="dev-app-publisher">Human Capital Intelligence</span>
      <p class="dev-app-description">A recovery-assurance and human-capital intelligence application for controlled work evidence, recovery analysis and AI-assisted operational review.</p>
      <div class="dev-app-tags"><span>Human Capital</span><span>Recovery</span><span>AI</span></div>
      <ul class="dev-app-features">
        <li><i aria-hidden="true" class="fas fa-check"></i> Unified work-evidence and recovery controls</li>
        <li><i aria-hidden="true" class="fas fa-check"></i> Recovery Passport and assurance workflows</li>
        <li><i aria-hidden="true" class="fas fa-check"></i> Recovery Agent powered through the shared OpenAI server key</li>
      </ul>
      <div class="dev-app-card-actions">
        <button class="dev-app-open" data-open-assurance-regent type="button">Open application</button>
        <button aria-label="View Assurance Regent application details" class="dev-app-details" data-assurance-regent-details type="button"><i aria-hidden="true" class="fas fa-chevron-right"></i></button>
      </div>`;
    card.querySelector('[data-open-assurance-regent]')?.addEventListener('click',openAssuranceRegent);
    card.querySelector('[data-assurance-regent-details]')?.addEventListener('click',event=>{
      event.stopPropagation();
      card.querySelector('[data-open-assurance-regent]')?.focus();
    });
    return card;
  }

  function install(){
    const grid=document.getElementById('developmentsAppGrid');
    if(!grid)return false;
    addStyles();
    updateSummary();
    if(!document.getElementById(CARD_ID)){
      const x1=grid.querySelector('[data-open-x1-app]')?.closest('.dev-app-card');
      const coming=grid.querySelector('.dev-coming-card');
      const card=createCard();
      if(x1?.nextSibling)grid.insertBefore(card,x1.nextSibling);
      else if(coming)grid.insertBefore(card,coming);
      else grid.appendChild(card);
    }
    return true;
  }

  if(!install()){
    const observer=new MutationObserver(()=>{ if(install())observer.disconnect(); });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),30000);
  }
})();
