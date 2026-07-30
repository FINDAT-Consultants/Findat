/* Media-copy deterrents for public browser delivery. */
(()=>{
  const selector='img,video,picture,canvas,svg';
  const mediaFile=/\.(?:avif|bmp|gif|jpe?g|m4v|mov|mp4|mpeg|png|svg|webm|webp)(?:$|[?#])/i;
  const protect=root=>{
    const nodes=[];
    if(root?.matches?.(selector)) nodes.push(root);
    root?.querySelectorAll?.(selector).forEach(node=>nodes.push(node));
    nodes.forEach(node=>{
      node.draggable=false;
      node.setAttribute('draggable','false');
      node.setAttribute('data-findat-protected-media',node.tagName.toLowerCase());
      node.addEventListener('contextmenu',event=>event.preventDefault(),{capture:true});
      node.addEventListener('dragstart',event=>event.preventDefault(),{capture:true});
      if(node instanceof HTMLVideoElement){
        node.controls=false;
        node.setAttribute('controlsList','nodownload noremoteplayback');
        node.setAttribute('disablePictureInPicture','');
        node.setAttribute('disableRemotePlayback','');
        try{node.disablePictureInPicture=true}catch(_error){}
        try{node.disableRemotePlayback=true}catch(_error){}
      }
    });
    root?.querySelectorAll?.('a[download]').forEach(link=>link.removeAttribute('download'));
  };
  protect(document);
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>node.nodeType===1&&protect(node))))
    .observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('contextmenu',event=>{
    if(event.target?.closest?.(selector)) event.preventDefault();
  },true);
  document.addEventListener('dragstart',event=>{
    if(event.target?.closest?.(selector)) event.preventDefault();
  },true);
  document.addEventListener('selectstart',event=>{
    if(event.target?.closest?.(selector)) event.preventDefault();
  },true);
  document.addEventListener('click',event=>{
    const link=event.target?.closest?.('a[href]');
    if(link&&mediaFile.test(link.getAttribute('href')||'')){
      event.preventDefault();
      event.stopPropagation();
    }
  },true);
  window.addEventListener('beforeprint',()=>document.documentElement.classList.add('findat-media-print-block'));
  window.addEventListener('afterprint',()=>document.documentElement.classList.remove('findat-media-print-block'));
})();

/* FINDAT application JavaScript extracted from the original single-file build. */

/* ============================== Inline script 01 ============================== */

const mainNav = document.getElementById('mainNav');
    const navItems = document.querySelectorAll('.nav-item');
    const navButtons = document.querySelectorAll('.nav-link');
    const mobileToggle = document.getElementById('mobileToggle');
    const searchRow = document.getElementById('searchRow');
    const openSearch = document.getElementById('openSearch');
    const closeSearch = document.getElementById('closeSearch');

    function closeMobileMenus(){
      navItems.forEach(item=>{
        item.classList.remove('open');
        item.querySelector('.nav-link')?.setAttribute('aria-expanded','false');
      });
    }

    const desktopMenuQuery = window.matchMedia('(min-width: 861px)');
    const mobileMenuQuery = window.matchMedia('(max-width: 860px)');

    function closeDesktopMenus(exceptItem=null){
      navItems.forEach(item=>{
        if(item !== exceptItem){
          item.classList.remove('open');
          item.querySelector('.nav-link')?.setAttribute('aria-expanded','false');
        }
      });
    }

    function releaseOuterScroll(){
      closeDesktopMenus();
    }

    navItems.forEach(item=>{
      const button = item.querySelector('.nav-link');
      const panel = item.querySelector('.dropdown-panel');

      function openDesktopMenu(){
        if(!desktopMenuQuery.matches) return;
        closeDesktopMenus(item);
        item.classList.add('open');
        button?.setAttribute('aria-expanded','true');
      }

      function closeDesktopMenu(){
        if(!desktopMenuQuery.matches) return;
        item.classList.remove('open');
        button?.setAttribute('aria-expanded','false');
      }

      item.addEventListener('pointerenter',openDesktopMenu);
      item.addEventListener('pointerleave',closeDesktopMenu);
      item.addEventListener('focusin',openDesktopMenu);

      item.addEventListener('focusout',e=>{
        if(!item.contains(e.relatedTarget)) closeDesktopMenu();
      });

      panel?.addEventListener('wheel',e=>{
        e.stopPropagation();
      },{passive:true});

      button?.addEventListener('click',()=>{
        if(mobileMenuQuery.matches){
          closeDesktopMenus();
          const wasOpen = item.classList.contains('open');
          closeMobileMenus();
          item.classList.toggle('open', !wasOpen);
          button.setAttribute('aria-expanded', String(!wasOpen));
          panel?.classList.add('force-mobile');
        }
      });
    });

    desktopMenuQuery.addEventListener?.('change',()=>closeDesktopMenus());

    mobileToggle.addEventListener('click',()=>{
      mainNav.classList.toggle('is-mobile-open');
      const open = mainNav.classList.contains('is-mobile-open');
      mobileToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if(!open) closeMobileMenus();
    });

    document.addEventListener('click',e=>{
      const insideNav = e.target.closest('.site-header');
      const insideSearch = e.target.closest('.search-row');
      if(!insideNav && !insideSearch && window.matchMedia('(max-width: 860px)').matches){
        mainNav.classList.remove('is-mobile-open');
        closeMobileMenus();
      }
    });

    document.querySelectorAll('.dropdown-link, .footer-card a').forEach(link=>link.addEventListener('click',()=>{
      if(window.matchMedia('(max-width: 860px)').matches){
        mainNav.classList.remove('is-mobile-open');
        closeMobileMenus();
      }
    }));

    const publicationsPanel=document.getElementById('publications');
    const closePublications=document.getElementById('closePublications');
    const liveTrainingPanel=document.getElementById('live-training');
    const closeLiveTraining=document.getElementById('closeLiveTraining');
    const recordingsPanel=document.getElementById('recordings');
    const closeRecordings=document.getElementById('closeRecordings');
    const recordingPlayer=document.getElementById('findatRecordingPlayer');
    const recordingsVideoWrap=document.getElementById('recordingsVideoWrap');
    const startRecordingLesson=document.getElementById('startRecordingLesson');
    const markRecordingComplete=document.getElementById('markRecordingComplete');
    const recordingLessonButton=document.getElementById('playAnalyticsDomainLesson');
    const recordingProgressRing=document.getElementById('recordingProgressRing');
    const recordingProgressRingText=document.getElementById('recordingProgressRingText');
    const recordingToolbarProgressBar=document.getElementById('recordingToolbarProgressBar');
    const recordingToolbarProgressText=document.getElementById('recordingToolbarProgressText');
    const recordingNotesBox=document.getElementById('recordingNotesBox');
    const recordingNoteStatus=document.getElementById('recordingNoteStatus');
    const recordingVideoError=document.getElementById('recordingVideoError');
    const recordingDurationMeta=document.getElementById('recordingDurationMeta');
    const recordingSeek=document.getElementById('recordingSeek');
    const recordingPlayPause=document.getElementById('recordingPlayPause');
    const recordingBack10=document.getElementById('recordingBack10');
    const recordingForward10=document.getElementById('recordingForward10');
    const recordingCurrentTime=document.getElementById('recordingCurrentTime');
    const recordingTotalTime=document.getElementById('recordingTotalTime');
    const recordingMute=document.getElementById('recordingMute');
    const recordingVolume=document.getElementById('recordingVolume');
    const recordingSpeed=document.getElementById('recordingSpeed');
    const recordingPipButton=document.getElementById('recordingPipButton');
    const findatProtectedVideoPath=String.fromCharCode(67,108,97,115,115,101,115,47,68,97,116,97,46,77,80,52);
    const findatProtectedPosterPath=window[String.fromCharCode(95,95,70,73,78,68,65,84,95,80,82,79,84,69,67,84,69,68,95,80,79,83,84,69,82,95,95)]||'Classes/Data-Thumbnail.jpg';
    if(recordingPlayer){
      recordingPlayer.controls=false;
      recordingPlayer.setAttribute('controlsList','nodownload noremoteplayback');
      recordingPlayer.setAttribute('disablePictureInPicture','');
      recordingPlayer.setAttribute('disableRemotePlayback','');
      recordingPlayer.setAttribute('preload','metadata');
      recordingPlayer.setAttribute('data-findat-protected-media','video');
      try{recordingPlayer.disablePictureInPicture=true}catch(_error){}
      try{recordingPlayer.disableRemotePlayback=true}catch(_error){}
      if(findatProtectedPosterPath){recordingPlayer.poster=findatProtectedPosterPath;if(startRecordingLesson){startRecordingLesson.classList.add('has-thumbnail');startRecordingLesson.style.backgroundImage=`linear-gradient(90deg,rgba(8,13,22,.92),rgba(8,13,22,.58) 52%,rgba(8,13,22,.14)),url("${findatProtectedPosterPath}")`}}
      recordingPlayer.src=findatProtectedVideoPath;
      recordingPlayer.load();
    }
    if(recordingPipButton){recordingPipButton.hidden=true;recordingPipButton.setAttribute('aria-hidden','true')}
    const recordingFullscreen=document.getElementById('recordingFullscreen');
    const recordingResumeLabel=document.getElementById('recordingResumeLabel');
    const recordingStartLabel=document.getElementById('recordingStartLabel');
    const recordingPlaybackStatus=document.getElementById('recordingPlaybackStatus');
    const recordingLessonWatch=document.getElementById('recordingLessonWatch');
    const recordingSectionProgress=document.getElementById('recordingSectionProgress');
    const restartRecording=document.getElementById('restartRecording');
    const resetRecordingProgress=document.getElementById('resetRecordingProgress');
    const addRecordingTimestamp=document.getElementById('addRecordingTimestamp');
    const recordingCourseSideTab=document.getElementById('recordingCourseSideTab');
    const recordingScriptSideTab=document.getElementById('recordingScriptSideTab');
    const recordingCoursePanel=document.getElementById('recordingCoursePanel');
    const recordingScriptPanel=document.getElementById('recordingScriptPanel');
    const openRecordingScript=document.getElementById('openRecordingScript');
    const recordingScriptFollow=document.getElementById('recordingScriptFollow');
    const recordingScriptSearch=document.getElementById('recordingScriptSearch');
    const recordingScriptList=document.getElementById('recordingScriptList');
    const recordingScriptCurrent=document.getElementById('recordingScriptCurrent');
    const recordingScriptEmpty=document.getElementById('recordingScriptEmpty');
    const recordingScriptCues=Array.from(document.querySelectorAll('.recordings-script-cue'));
    const recordingQuizSideTab=document.getElementById('recordingQuizSideTab');
    const recordingQuizPanel=document.getElementById('recordingQuizPanel');
    const openRecordingQuiz=document.getElementById('openRecordingQuiz');
    const openKnowledgeQuizFromCourse=document.getElementById('openKnowledgeQuizFromCourse');
    const recordingQuizForm=document.getElementById('recordingQuizForm');
    const recordingQuizQuestions=Array.from(document.querySelectorAll('.recordings-quiz-question'));
    const recordingQuizStatus=document.getElementById('recordingQuizStatus');
    const recordingQuizAnswered=document.getElementById('recordingQuizAnswered');
    const recordingQuizBest=document.getElementById('recordingQuizBest');
    const recordingQuizResult=document.getElementById('recordingQuizResult');
    const recordingQuizResultTitle=document.getElementById('recordingQuizResultTitle');
    const recordingQuizResultText=document.getElementById('recordingQuizResultText');
    const submitRecordingQuiz=document.getElementById('submitRecordingQuiz');
    const retryRecordingQuiz=document.getElementById('retryRecordingQuiz');
    const resetRecordingQuiz=document.getElementById('resetRecordingQuiz');
    const recordingQuizCourseStatus=document.getElementById('recordingQuizCourseStatus');
    const recordingQuizCourseIcon=document.getElementById('recordingQuizCourseIcon');
    const recordingProgressKey='findat-recording-Data-MP4-complete';
    const recordingNotesKey='findat-recording-Data-MP4-notes';
    const recordingPositionKey='findat-recording-Data-MP4-position';
    const recordingWatchedKey='findat-recording-Data-MP4-watched';
    const recordingVolumeKey='findat-recording-Data-MP4-volume';
    const recordingSpeedKey='findat-recording-Data-MP4-speed';
    const recordingQuizBestKey='findat-recording-Data-MP4-quiz-v2-best';
    const recordingQuizPassedKey='findat-recording-Data-MP4-quiz-v2-passed';
    const recordingQuizAttemptsKey='findat-recording-Data-MP4-quiz-v2-attempts';
    function formatRecordingDuration(totalSeconds){
      if(!Number.isFinite(totalSeconds)||totalSeconds<=0) return 'Recorded lesson';
      const seconds=Math.floor(totalSeconds%60);
      const minutes=Math.floor((totalSeconds/60)%60);
      const hours=Math.floor(totalSeconds/3600);
      return hours>0 ? `${hours}h ${String(minutes).padStart(2,'0')}m` : `${minutes}m ${String(seconds).padStart(2,'0')}s`;
    }
    let publicationsReturnFocus=null;
    let liveTrainingReturnFocus=null;
    let recordingsReturnFocus=null;

    function openPublicationsPanel(trigger=null){
      closeRecordingsPanel({restoreFocus:false,clearHash:false});
      closeLiveTrainingPanel({restoreFocus:false,clearHash:false});
      closeSearchPanel();
      closeDesktopMenus();
      mainNav.classList.remove('is-mobile-open');
      closeMobileMenus();
      if(trigger) publicationsReturnFocus=trigger;
      else if(!(publicationsReturnFocus instanceof HTMLElement)||!document.contains(publicationsReturnFocus)) publicationsReturnFocus=document.querySelector('.quick-action[href="#publications"]');
      publicationsPanel?.classList.add('is-open');
      publicationsPanel?.setAttribute('aria-hidden','false');
      document.querySelectorAll('a[href="#publications"]').forEach(link=>link.setAttribute('aria-expanded','true'));
      document.body.classList.add('publications-open');
      if(location.hash!=='#publications') history.replaceState(null,'','#publications');
      setTimeout(()=>document.getElementById('homePublicationSearch')?.focus(),80);
    }
    function closePublicationsPanel({restoreFocus=true,clearHash=true}={}){
      publicationsPanel?.classList.remove('is-open');
      publicationsPanel?.setAttribute('aria-hidden','true');
      document.querySelectorAll('a[href="#publications"]').forEach(link=>link.setAttribute('aria-expanded','false'));
      document.body.classList.remove('publications-open');
      if(clearHash&&location.hash==='#publications') history.replaceState(null,'',location.pathname+location.search);
      if(restoreFocus&&publicationsReturnFocus instanceof HTMLElement) publicationsReturnFocus.focus();
    }
    window.openPublicationsPanel=openPublicationsPanel;
    window.closePublicationsPanel=closePublicationsPanel;

    function openLiveTrainingPanel(trigger=null){
      closeRecordingsPanel({restoreFocus:false,clearHash:false});
      closePublicationsPanel({restoreFocus:false,clearHash:false});
      closeSearchPanel();
      closeDesktopMenus();
      mainNav.classList.remove('is-mobile-open');
      closeMobileMenus();
      if(trigger) liveTrainingReturnFocus=trigger;
      else if(!(liveTrainingReturnFocus instanceof HTMLElement)||!document.contains(liveTrainingReturnFocus)) liveTrainingReturnFocus=document.querySelector('.quick-action[href="#live-training"]');
      liveTrainingPanel?.classList.add('is-open');
      liveTrainingPanel?.setAttribute('aria-hidden','false');
      document.querySelectorAll('a[href="#live-training"]').forEach(link=>link.setAttribute('aria-expanded','true'));
      document.body.classList.add('live-training-open');
      if(location.hash!=='#live-training') history.replaceState(null,'','#live-training');

      // Always open Live Training at the very top. Focusing the first class link
      // previously caused the internal panel to scroll down automatically.
      if(liveTrainingPanel){
        liveTrainingPanel.scrollTop=0;
        liveTrainingPanel.scrollLeft=0;
      }
      requestAnimationFrame(()=>{
        liveTrainingPanel?.scrollTo({top:0,left:0,behavior:'auto'});
        try{ closeLiveTraining?.focus({preventScroll:true}); }
        catch(error){ closeLiveTraining?.focus(); }
      });
    }
    function closeLiveTrainingPanel({restoreFocus=true,clearHash=true}={}){
      liveTrainingPanel?.classList.remove('is-open');
      liveTrainingPanel?.setAttribute('aria-hidden','true');
      document.querySelectorAll('a[href="#live-training"]').forEach(link=>link.setAttribute('aria-expanded','false'));
      document.body.classList.remove('live-training-open');
      if(clearHash&&location.hash==='#live-training') history.replaceState(null,'',location.pathname+location.search);
      if(restoreFocus&&liveTrainingReturnFocus instanceof HTMLElement) liveTrainingReturnFocus.focus();
    }
    window.openLiveTrainingPanel=openLiveTrainingPanel;
    window.closeLiveTrainingPanel=closeLiveTrainingPanel;

    function openRecordingsPanel(trigger=null){
      closeLiveTrainingPanel({restoreFocus:false,clearHash:false});
      closePublicationsPanel({restoreFocus:false,clearHash:false});
      closeSearchPanel();
      closeDesktopMenus();
      mainNav.classList.remove('is-mobile-open');
      closeMobileMenus();
      if(trigger) recordingsReturnFocus=trigger;
      else if(!(recordingsReturnFocus instanceof HTMLElement)||!document.contains(recordingsReturnFocus)) recordingsReturnFocus=document.querySelector('.quick-action[href="#recordings"]');
      syncRecordingLearningState();
      recordingsPanel?.classList.add('is-open');
      recordingsPanel?.setAttribute('aria-hidden','false');
      document.querySelectorAll('a[href="#recordings"]').forEach(link=>link.setAttribute('aria-expanded','true'));
      document.body.classList.add('recordings-open');
      if(location.hash!=='#recordings') history.replaceState(null,'','#recordings');
      setTimeout(()=>document.getElementById('playAnalyticsDomainLesson')?.focus(),80);
    }
    function closeRecordingsPanel({restoreFocus=true,clearHash=true}={}){
      recordingsPanel?.classList.remove('is-open');
      recordingsPanel?.setAttribute('aria-hidden','true');
      document.querySelectorAll('a[href="#recordings"]').forEach(link=>link.setAttribute('aria-expanded','false'));
      document.body.classList.remove('recordings-open');
      if(recordingPlayer){
        recordingPlayer.pause();
      }
      recordingsVideoWrap?.classList.remove('is-playing');
      if(recordingVideoError) recordingVideoError.hidden=true;
      if(clearHash&&location.hash==='#recordings') history.replaceState(null,'',location.pathname+location.search);
      if(restoreFocus&&recordingsReturnFocus instanceof HTMLElement) recordingsReturnFocus.focus();
    }
    window.openRecordingsPanel=openRecordingsPanel;
    window.closeRecordingsPanel=closeRecordingsPanel;

    function openSearchPanel(){
      closeRecordingsPanel({restoreFocus:false,clearHash:true});
      closeLiveTrainingPanel({restoreFocus:false,clearHash:true});
      closePublicationsPanel({restoreFocus:false,clearHash:true});
      searchRow.classList.add('is-open');
      searchRow.setAttribute('aria-hidden','false');
      document.body.classList.add('search-open');
      setTimeout(()=>document.getElementById('siteSearch')?.focus(),80);
    }
    function closeSearchPanel(){
      searchRow.classList.remove('is-open');
      searchRow.setAttribute('aria-hidden','true');
      document.body.classList.remove('search-open');
    }
    openSearch.addEventListener('click',openSearchPanel);
    closeSearch?.addEventListener('click',closeSearchPanel);
    closePublications?.addEventListener('click',()=>closePublicationsPanel());
    document.querySelectorAll('a[href="#publications"]').forEach(link=>{
      link.setAttribute('aria-controls','publications');
      link.setAttribute('aria-expanded','false');
      link.addEventListener('click',event=>{
        event.preventDefault();
        openPublicationsPanel(link);
      });
    });
    closeLiveTraining?.addEventListener('click',()=>closeLiveTrainingPanel());
    document.querySelectorAll('a[href="#live-training"]').forEach(link=>{
      link.setAttribute('aria-controls','live-training');
      link.setAttribute('aria-expanded','false');
      link.addEventListener('click',event=>{
        event.preventDefault();
        openLiveTrainingPanel(link);
      });
    });
    if(location.hash==='#live-training') setTimeout(()=>openLiveTrainingPanel(),0);
    closeRecordings?.addEventListener('click',()=>closeRecordingsPanel());
    document.querySelectorAll('a[href="#recordings"]').forEach(link=>{
      link.setAttribute('aria-controls','recordings');
      link.setAttribute('aria-expanded','false');
      link.addEventListener('click',event=>{
        event.preventDefault();
        openRecordingsPanel(link);
      });
    });
    function recordingStoreGet(key,fallback=''){
      try{
        const value=localStorage.getItem(key);
        return value===null?fallback:value;
      }catch(error){return fallback}
    }
    function recordingStoreSet(key,value){
      try{localStorage.setItem(key,String(value));return true}catch(error){return false}
    }
    function recordingStoreRemove(key){
      try{localStorage.removeItem(key)}catch(error){}
    }
    function formatRecordingClock(totalSeconds){
      const safe=Number.isFinite(totalSeconds)&&totalSeconds>0?Math.floor(totalSeconds):0;
      const hours=Math.floor(safe/3600);
      const minutes=Math.floor((safe%3600)/60);
      const seconds=safe%60;
      return hours>0?`${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`:`${minutes}:${String(seconds).padStart(2,'0')}`;
    }
    function recordingIsComplete(){
      return recordingStoreGet(recordingProgressKey)==='1';
    }
    function recordingSavedPosition(){
      const value=Number(recordingStoreGet(recordingPositionKey,'0'));
      return Number.isFinite(value)&&value>0?value:0;
    }
    function recordingWatchedPercent(){
      const stored=Number(recordingStoreGet(recordingWatchedKey,'0'));
      const current=(recordingPlayer&&Number.isFinite(recordingPlayer.duration)&&recordingPlayer.duration>0)
        ?(recordingPlayer.currentTime/recordingPlayer.duration)*100:0;
      return Math.max(0,Math.min(100,Math.max(Number.isFinite(stored)?stored:0,current)));
    }
    function setRecordingRangeFill(input,percent){
      if(input) input.style.setProperty('--fill',`${Math.max(0,Math.min(100,percent))}%`);
    }
    function updateRecordingControlState(){
      if(!recordingPlayer) return;
      const duration=Number.isFinite(recordingPlayer.duration)?recordingPlayer.duration:0;
      const current=Number.isFinite(recordingPlayer.currentTime)?recordingPlayer.currentTime:0;
      const percent=duration>0?(current/duration)*100:0;
      if(recordingSeek){recordingSeek.max=String(duration||100);recordingSeek.value=String(duration?current:0);setRecordingRangeFill(recordingSeek,percent)}
      if(recordingCurrentTime) recordingCurrentTime.textContent=formatRecordingClock(current);
      if(recordingTotalTime) recordingTotalTime.textContent=formatRecordingClock(duration);
      if(recordingPlayPause){
        const paused=recordingPlayer.paused||recordingPlayer.ended;
        recordingPlayPause.setAttribute('aria-label',paused?'Play recording':'Pause recording');
        const icon=recordingPlayPause.querySelector('i');
        if(icon) icon.className=paused?'fas fa-play':'fas fa-pause';
      }
      if(recordingMute){
        const silent=recordingPlayer.muted||recordingPlayer.volume===0;
        recordingMute.setAttribute('aria-label',silent?'Unmute recording':'Mute recording');
        const icon=recordingMute.querySelector('i');
        if(icon) icon.className=silent?'fas fa-volume-mute':recordingPlayer.volume<.5?'fas fa-volume-down':'fas fa-volume-up';
      }
      if(recordingVolume){
        recordingVolume.value=String(recordingPlayer.muted?0:recordingPlayer.volume);
        setRecordingRangeFill(recordingVolume,(recordingPlayer.muted?0:recordingPlayer.volume)*100);
      }
    }
    function syncRecordingLearningState(){
      const complete=recordingIsComplete();
      const watched=complete?100:Math.min(99,Math.floor(recordingWatchedPercent()));
      const quizPassed=recordingStoreGet(recordingQuizPassedKey,'0')==='1';
      const courseProgress=Math.min(100,Math.round((watched*.5)+(quizPassed?50:0)));
      const completedActivities=(complete?1:0)+(quizPassed?1:0);
      const position=recordingPlayer&&Number.isFinite(recordingPlayer.currentTime)?recordingPlayer.currentTime:recordingSavedPosition();
      const duration=recordingPlayer&&Number.isFinite(recordingPlayer.duration)?recordingPlayer.duration:0;
      const hasResume=position>4&&(!duration||position<duration-4);

      markRecordingComplete?.classList.toggle('is-complete',complete);
      markRecordingComplete?.setAttribute('aria-pressed',String(complete));
      if(markRecordingComplete){
        const icon=markRecordingComplete.querySelector('i');
        const label=markRecordingComplete.querySelector('span');
        if(icon) icon.className=complete?'fas fa-check-circle':'far fa-circle';
        if(label) label.textContent=complete?'Completed':'Mark complete';
      }
      recordingLessonButton?.classList.toggle('is-complete',complete);
      const lessonStatus=recordingLessonButton?.querySelector('.recording-lesson-status');
      if(lessonStatus) lessonStatus.className=complete?'fas fa-check-circle recording-lesson-status':'far fa-check-circle recording-lesson-status';
      recordingProgressRing?.style.setProperty('--progress',String(courseProgress));
      recordingProgressRing?.classList.toggle('is-complete',courseProgress===100);
      recordingProgressRing?.setAttribute('aria-label',courseProgress+' percent course complete');
      if(recordingProgressRingText) recordingProgressRingText.textContent=courseProgress+'%';
      if(recordingToolbarProgressBar) recordingToolbarProgressBar.style.width=courseProgress+'%';
      if(recordingToolbarProgressText) recordingToolbarProgressText.textContent=courseProgress+'%';
      if(recordingSectionProgress) recordingSectionProgress.textContent=`${completedActivities} / 2 complete`;
      if(recordingLessonWatch){
        recordingLessonWatch.textContent=complete?'100% watched · completed':watched>0?`${watched}% watched · ${formatRecordingClock(position)} saved`:'0% watched · not started';
      }
      if(recordingPlaybackStatus){
        recordingPlaybackStatus.textContent=complete?'Lesson completed · replay whenever needed':watched>0?`${watched}% watched · continue from ${formatRecordingClock(position)}`:'Not started · progress saves on this device';
      }
      if(recordingResumeLabel){
        const text=recordingResumeLabel.querySelector('span');
        if(text) text.textContent=complete?'Completed — ready to replay':hasResume?`Continue from ${formatRecordingClock(position)}`:'Ready to begin';
      }
      if(recordingStartLabel) recordingStartLabel.textContent=complete?'Replay lesson':hasResume?'Resume lesson':'Start lesson';
      if(recordingNotesBox&&document.activeElement!==recordingNotesBox){
        recordingNotesBox.value=recordingStoreGet(recordingNotesKey,'');
      }
      updateRecordingQuizSummary();
      updateRecordingControlState();
    }
    let recordingStateSaveTimer=0;
    function persistRecordingPlayback(force=false){
      if(!recordingPlayer||!Number.isFinite(recordingPlayer.duration)||recordingPlayer.duration<=0) return;
      const now=Date.now();
      if(!force&&now-recordingStateSaveTimer<900) return;
      recordingStateSaveTimer=now;
      const percent=Math.max(Number(recordingStoreGet(recordingWatchedKey,'0'))||0,(recordingPlayer.currentTime/recordingPlayer.duration)*100);
      recordingStoreSet(recordingPositionKey,recordingPlayer.currentTime);
      recordingStoreSet(recordingWatchedKey,Math.min(100,percent));
    }
    async function playRecordingLesson(){
      if(!recordingPlayer) return;
      if(recordingVideoError) recordingVideoError.hidden=true;
      if(recordingPlayer.ended||((Number.isFinite(recordingPlayer.duration)&&recordingPlayer.duration>0)&&recordingPlayer.currentTime>=recordingPlayer.duration-1)) recordingPlayer.currentTime=0;
      recordingsVideoWrap?.classList.add('is-playing');
      try{
        await recordingPlayer.play();
      }catch(error){
        recordingsVideoWrap?.classList.remove('is-playing');
        if(recordingVideoError) recordingVideoError.hidden=false;
      }
    }
    function toggleRecordingPlayback(){
      if(!recordingPlayer) return;
      if(recordingPlayer.paused||recordingPlayer.ended) playRecordingLesson();
      else recordingPlayer.pause();
    }
    function seekRecordingBy(seconds){
      if(!recordingPlayer||!Number.isFinite(recordingPlayer.duration)) return;
      recordingPlayer.currentTime=Math.max(0,Math.min(recordingPlayer.duration,recordingPlayer.currentTime+seconds));
      persistRecordingPlayback(true);
      syncRecordingLearningState();
    }
    async function toggleRecordingFullscreen(){
      const target=recordingsVideoWrap;
      if(!target) return;
      try{
        if(document.fullscreenElement) await document.exitFullscreen();
        else if(target.requestFullscreen) await target.requestFullscreen();
      }catch(error){}
    }
    async function toggleRecordingPip(){
      if(!recordingPlayer||!document.pictureInPictureEnabled||recordingPlayer.disablePictureInPicture) return;
      try{
        if(document.pictureInPictureElement) await document.exitPictureInPicture();
        else await recordingPlayer.requestPictureInPicture();
      }catch(error){}
    }
    let recordingControlsTimer=null;
    function showRecordingControls(){
      recordingsVideoWrap?.classList.remove('controls-idle');
      clearTimeout(recordingControlsTimer);
      if(recordingPlayer&&!recordingPlayer.paused){
        recordingControlsTimer=setTimeout(()=>recordingsVideoWrap?.classList.add('controls-idle'),2400);
      }
    }


    function setRecordingSidePanel(panelName){
      const showCourse=panelName==='course';
      const showScript=panelName==='script';
      const showQuiz=panelName==='quiz';
      recordingCourseSideTab?.setAttribute('aria-selected',String(showCourse));
      recordingScriptSideTab?.setAttribute('aria-selected',String(showScript));
      recordingQuizSideTab?.setAttribute('aria-selected',String(showQuiz));
      recordingCoursePanel?.classList.toggle('is-active',showCourse);
      recordingScriptPanel?.classList.toggle('is-active',showScript);
      recordingQuizPanel?.classList.toggle('is-active',showQuiz);
      if(recordingCoursePanel) recordingCoursePanel.hidden=!showCourse;
      if(recordingScriptPanel) recordingScriptPanel.hidden=!showScript;
      if(recordingQuizPanel) recordingQuizPanel.hidden=!showQuiz;
      if(showScript) syncRecordingScript(true);
      if(showQuiz) updateRecordingQuizSummary();
    }
    recordingCourseSideTab?.addEventListener('click',()=>setRecordingSidePanel('course'));
    recordingScriptSideTab?.addEventListener('click',()=>setRecordingSidePanel('script'));
    recordingQuizSideTab?.addEventListener('click',()=>setRecordingSidePanel('quiz'));
    openRecordingScript?.addEventListener('click',()=>{
      setRecordingSidePanel('script');
      recordingScriptSideTab?.focus({preventScroll:true});
      recordingScriptPanel?.scrollIntoView({behavior:'smooth',block:'nearest'});
    });
    function openLessonQuiz(){
      setRecordingSidePanel('quiz');
      recordingQuizSideTab?.focus({preventScroll:true});
      recordingQuizPanel?.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
    openRecordingQuiz?.addEventListener('click',openLessonQuiz);
    openKnowledgeQuizFromCourse?.addEventListener('click',openLessonQuiz);

    function resolvedRecordingCueTime(cue){
      const stored=Number(cue?.dataset.resolvedTime);
      if(Number.isFinite(stored)) return stored;
      const explicit=Number(cue?.dataset.time);
      if(Number.isFinite(explicit)) return explicit;
      const ratio=Math.max(0,Math.min(1,Number(cue?.dataset.ratio)||0));
      return Number.isFinite(recordingPlayer?.duration)?ratio*recordingPlayer.duration:0;
    }
    function initialiseRecordingScript(){
      if(!recordingPlayer||!Number.isFinite(recordingPlayer.duration)||recordingPlayer.duration<=0) return;
      recordingScriptCues.forEach(cue=>{
        const explicit=Number(cue.dataset.time);
        const ratio=Math.max(0,Math.min(1,Number(cue.dataset.ratio)||0));
        const seconds=Number.isFinite(explicit)?Math.min(recordingPlayer.duration,Math.max(0,explicit)):ratio*recordingPlayer.duration;
        cue.dataset.resolvedTime=String(seconds);
        const label=cue.querySelector('.recordings-script-time');
        if(label) label.textContent=formatRecordingClock(seconds);
        cue.setAttribute('aria-label',`${cue.dataset.title||'Lesson section'}, ${formatRecordingClock(seconds)}`);
      });
      syncRecordingScript(true);
    }
    let activeRecordingScriptCue=null;
    function syncRecordingScript(forceScroll=false){
      if(!recordingScriptCues.length) return;
      const current=Math.max(0,recordingPlayer?.currentTime||0);
      let active=recordingScriptCues[0];
      recordingScriptCues.forEach(cue=>{
        if(resolvedRecordingCueTime(cue)<=current+.2) active=cue;
      });
      if(activeRecordingScriptCue!==active){
        recordingScriptCues.forEach(cue=>{
          const isCurrent=cue===active;
          cue.classList.toggle('is-current',isCurrent);
          if(isCurrent) cue.setAttribute('aria-current','true');
          else cue.removeAttribute('aria-current');
        });
        activeRecordingScriptCue=active;
        const title=active?.dataset.title||'Current discussion';
        if(recordingScriptCurrent) recordingScriptCurrent.textContent=`Now: ${title} · ${formatRecordingClock(resolvedRecordingCueTime(active))}`;
        const follow=recordingScriptFollow?.getAttribute('aria-pressed')!=='false';
        const scriptVisible=recordingScriptPanel&&!recordingScriptPanel.hidden;
        if((follow||forceScroll)&&scriptVisible&&!active.hidden){
          active.scrollIntoView({behavior:forceScroll?'auto':'smooth',block:'nearest'});
        }
      }else if(recordingScriptCurrent&&active){
        recordingScriptCurrent.textContent=`Now: ${active.dataset.title||'Current discussion'} · ${formatRecordingClock(current)}`;
      }
    }
    recordingScriptCues.forEach(cue=>cue.addEventListener('click',()=>{
      if(!recordingPlayer) return;
      recordingPlayer.currentTime=Math.max(0,resolvedRecordingCueTime(cue));
      recordingsVideoWrap?.classList.add('is-playing');
      persistRecordingPlayback(true);
      syncRecordingScript(true);
      playRecordingLesson();
    }));
    recordingScriptFollow?.addEventListener('click',()=>{
      const following=recordingScriptFollow.getAttribute('aria-pressed')!=='true';
      recordingScriptFollow.setAttribute('aria-pressed',String(following));
      const label=recordingScriptFollow.querySelector('span');
      if(label) label.textContent=following?'Follow video':'Follow off';
      if(following) syncRecordingScript(true);
    });
    recordingScriptSearch?.addEventListener('input',()=>{
      const query=recordingScriptSearch.value.trim().toLowerCase();
      let visibleCount=0;
      recordingScriptCues.forEach(cue=>{
        const matches=!query||cue.textContent.toLowerCase().includes(query);
        cue.hidden=!matches;
        if(matches) visibleCount++;
      });
      recordingScriptEmpty?.classList.toggle('is-visible',visibleCount===0);
      if(!query) syncRecordingScript(true);
    });


    function recordingQuizBestScore(){
      const value=Number(recordingStoreGet(recordingQuizBestKey,''));
      return Number.isFinite(value)&&value>=0?Math.min(100,Math.round(value)):null;
    }
    function recordingQuizPassed(){
      return recordingStoreGet(recordingQuizPassedKey,'0')==='1';
    }
    function recordingQuizAnswerCount(){
      return recordingQuizQuestions.filter(question=>question.querySelector('input[type="radio"]:checked')).length;
    }
    function updateRecordingQuizSummary(){
      const total=recordingQuizQuestions.length||6;
      const answered=recordingQuizAnswerCount();
      const best=recordingQuizBestScore();
      const passed=recordingQuizPassed();
      const attempts=Math.max(0,Number(recordingStoreGet(recordingQuizAttemptsKey,'0'))||0);
      if(recordingQuizAnswered) recordingQuizAnswered.textContent=`${answered} / ${total}`;
      if(recordingQuizBest) recordingQuizBest.textContent=best===null?'—':`${best}%`;
      if(recordingQuizStatus){
        recordingQuizStatus.classList.toggle('is-passed',passed);
        recordingQuizStatus.classList.toggle('is-failed',!passed&&attempts>0);
        recordingQuizStatus.textContent=passed?'Passed':attempts>0?'Try again':'Not attempted';
      }
      openKnowledgeQuizFromCourse?.classList.toggle('is-complete',passed);
      if(recordingQuizCourseIcon) recordingQuizCourseIcon.className=passed?'fas fa-check-circle recording-lesson-status':'far fa-check-circle recording-lesson-status';
      if(recordingQuizCourseStatus){
        recordingQuizCourseStatus.textContent=passed?`Passed · best ${best}%`:attempts>0?`Best ${best}% · ${attempts} attempt${attempts===1?'':'s'}`:'Not attempted';
      }
    }
    function resetCurrentQuizAttempt(){
      recordingQuizQuestions.forEach(question=>{
        question.classList.remove('is-correct','is-incorrect','is-unanswered');
        question.querySelectorAll('.recordings-quiz-option').forEach(option=>option.classList.remove('is-answer-correct','is-answer-wrong'));
        question.querySelectorAll('input[type="radio"]').forEach(input=>{input.checked=false;input.disabled=false});
        const feedback=question.querySelector('.recordings-quiz-feedback');
        if(feedback) feedback.textContent='';
      });
      if(recordingQuizResult){recordingQuizResult.hidden=true;recordingQuizResult.classList.remove('is-passed','is-failed')}
      if(submitRecordingQuiz) submitRecordingQuiz.hidden=false;
      if(retryRecordingQuiz) retryRecordingQuiz.hidden=true;
      updateRecordingQuizSummary();
      recordingQuizQuestions[0]?.scrollIntoView({behavior:'smooth',block:'start'});
    }
    recordingQuizForm?.addEventListener('change',()=>{
      recordingQuizQuestions.forEach(question=>question.classList.remove('is-unanswered'));
      updateRecordingQuizSummary();
    });
    recordingQuizForm?.addEventListener('submit',event=>{
      event.preventDefault();
      const unanswered=recordingQuizQuestions.filter(question=>!question.querySelector('input[type="radio"]:checked'));
      if(unanswered.length){
        unanswered.forEach(question=>question.classList.add('is-unanswered'));
        if(recordingQuizResult){
          recordingQuizResult.hidden=false;
          recordingQuizResult.classList.remove('is-passed');
          recordingQuizResult.classList.add('is-failed');
        }
        if(recordingQuizResultTitle) recordingQuizResultTitle.textContent='Complete every question';
        if(recordingQuizResultText) recordingQuizResultText.textContent=`${unanswered.length} question${unanswered.length===1?' is':'s are'} still unanswered.`;
        unanswered[0]?.scrollIntoView({behavior:'smooth',block:'center'});
        unanswered[0]?.querySelector('input')?.focus({preventScroll:true});
        return;
      }
      let correctCount=0;
      recordingQuizQuestions.forEach(question=>{
        question.classList.remove('is-unanswered');
        const selected=question.querySelector('input[type="radio"]:checked');
        const correctValue=question.dataset.correct||'';
        const correct=selected?.value===correctValue;
        if(correct) correctCount++;
        question.classList.toggle('is-correct',correct);
        question.classList.toggle('is-incorrect',!correct);
        question.querySelectorAll('.recordings-quiz-option').forEach(option=>{
          const input=option.querySelector('input');
          option.classList.toggle('is-answer-correct',input?.value===correctValue);
          option.classList.toggle('is-answer-wrong',Boolean(input?.checked&&input.value!==correctValue));
          if(input) input.disabled=true;
        });
        const feedback=question.querySelector('.recordings-quiz-feedback');
        if(feedback) feedback.textContent=`${correct?'Correct.':'Review this answer.'} ${question.dataset.explanation||''}`;
      });
      const total=recordingQuizQuestions.length||1;
      const percent=Math.round((correctCount/total)*100);
      const passed=percent>=70;
      const previousBest=recordingQuizBestScore();
      const best=previousBest===null?percent:Math.max(previousBest,percent);
      const attempts=Math.max(0,Number(recordingStoreGet(recordingQuizAttemptsKey,'0'))||0)+1;
      recordingStoreSet(recordingQuizBestKey,String(best));
      recordingStoreSet(recordingQuizAttemptsKey,String(attempts));
      if(passed) recordingStoreSet(recordingQuizPassedKey,'1');
      if(recordingQuizResult){
        recordingQuizResult.hidden=false;
        recordingQuizResult.classList.toggle('is-passed',passed);
        recordingQuizResult.classList.toggle('is-failed',!passed);
      }
      if(recordingQuizResultTitle) recordingQuizResultTitle.textContent=passed?'Quiz passed':'Keep learning and try again';
      if(recordingQuizResultText) recordingQuizResultText.textContent=`You answered ${correctCount} of ${total} correctly and scored ${percent}%. ${passed?'The quiz activity is complete.':'Review the explanations and score at least 70% to pass.'}`;
      if(submitRecordingQuiz) submitRecordingQuiz.hidden=true;
      if(retryRecordingQuiz) retryRecordingQuiz.hidden=false;
      updateRecordingQuizSummary();
      syncRecordingLearningState();
      recordingQuizResult?.scrollIntoView({behavior:'smooth',block:'center'});
    });
    retryRecordingQuiz?.addEventListener('click',resetCurrentQuizAttempt);
    resetRecordingQuiz?.addEventListener('click',()=>{
      recordingStoreRemove(recordingQuizBestKey);
      recordingStoreRemove(recordingQuizPassedKey);
      recordingStoreRemove(recordingQuizAttemptsKey);
      resetCurrentQuizAttempt();
      syncRecordingLearningState();
    });

    startRecordingLesson?.addEventListener('click',playRecordingLesson);
    recordingLessonButton?.addEventListener('click',playRecordingLesson);
    recordingPlayPause?.addEventListener('click',toggleRecordingPlayback);
    recordingBack10?.addEventListener('click',()=>seekRecordingBy(-10));
    recordingForward10?.addEventListener('click',()=>seekRecordingBy(10));
    recordingSeek?.addEventListener('input',()=>{
      if(recordingPlayer&&Number.isFinite(recordingPlayer.duration)){
        recordingPlayer.currentTime=Number(recordingSeek.value)||0;
        updateRecordingControlState();
      }
    });
    recordingSeek?.addEventListener('change',()=>{persistRecordingPlayback(true);syncRecordingLearningState()});
    recordingMute?.addEventListener('click',()=>{
      if(!recordingPlayer) return;
      recordingPlayer.muted=!recordingPlayer.muted;
      updateRecordingControlState();
    });
    recordingVolume?.addEventListener('input',()=>{
      if(!recordingPlayer) return;
      recordingPlayer.muted=false;
      recordingPlayer.volume=Math.max(0,Math.min(1,Number(recordingVolume.value)));
      recordingStoreSet(recordingVolumeKey,recordingPlayer.volume);
      updateRecordingControlState();
    });
    recordingSpeed?.addEventListener('change',()=>{
      if(!recordingPlayer) return;
      recordingPlayer.playbackRate=Number(recordingSpeed.value)||1;
      recordingStoreSet(recordingSpeedKey,recordingPlayer.playbackRate);
    });
    recordingPipButton?.addEventListener('click',toggleRecordingPip);
    recordingFullscreen?.addEventListener('click',toggleRecordingFullscreen);
    restartRecording?.addEventListener('click',()=>{
      if(!recordingPlayer) return;
      recordingsVideoWrap?.classList.add('is-playing');
      recordingPlayer.currentTime=0;
      persistRecordingPlayback(true);
      playRecordingLesson();
    });
    resetRecordingProgress?.addEventListener('click',()=>{
      recordingStoreRemove(recordingProgressKey);
      recordingStoreRemove(recordingPositionKey);
      recordingStoreRemove(recordingWatchedKey);
      if(recordingPlayer){recordingPlayer.pause();recordingPlayer.currentTime=0}
      recordingsVideoWrap?.classList.remove('is-playing');
      syncRecordingLearningState();
    });

    let recordingResumeApplied=false;
    function initialiseRecordingMetadata(){
      if(!recordingPlayer||!Number.isFinite(recordingPlayer.duration)||recordingPlayer.duration<=0) return;
      if(recordingDurationMeta) recordingDurationMeta.innerHTML='<i class="far fa-clock" aria-hidden="true"></i> '+formatRecordingDuration(recordingPlayer.duration);
      if(recordingTotalTime) recordingTotalTime.textContent=formatRecordingClock(recordingPlayer.duration);
      if(recordingSeek) recordingSeek.max=String(recordingPlayer.duration);
      if(!recordingResumeApplied){
        recordingResumeApplied=true;
        const saved=recordingSavedPosition();
        if(saved>0&&saved<recordingPlayer.duration-3) recordingPlayer.currentTime=saved;
      }
      const savedVolume=Math.max(0,Math.min(1,Number(recordingStoreGet(recordingVolumeKey,'1'))));
      const savedSpeed=Math.max(.5,Math.min(2,Number(recordingStoreGet(recordingSpeedKey,'1'))));
      if(Number.isFinite(savedVolume)) recordingPlayer.volume=savedVolume;
      if(Number.isFinite(savedSpeed)){recordingPlayer.playbackRate=savedSpeed;if(recordingSpeed) recordingSpeed.value=String(savedSpeed)}
      syncRecordingLearningState();
    }
    recordingPlayer?.addEventListener('loadedmetadata',initialiseRecordingMetadata);
    recordingPlayer?.addEventListener('loadedmetadata',initialiseRecordingScript);
    recordingPlayer?.addEventListener('play',()=>{
      recordingsVideoWrap?.classList.add('is-playing');
      updateRecordingControlState();
      showRecordingControls();
    });
    recordingPlayer?.addEventListener('pause',()=>{
      persistRecordingPlayback(true);
      updateRecordingControlState();
      recordingsVideoWrap?.classList.remove('controls-idle');
      syncRecordingLearningState();
    });
    recordingPlayer?.addEventListener('timeupdate',()=>{
      updateRecordingControlState();
      persistRecordingPlayback();
      syncRecordingLearningState();
      syncRecordingScript();
    });
    recordingPlayer?.addEventListener('volumechange',updateRecordingControlState);
    recordingPlayer?.addEventListener('ratechange',()=>{if(recordingSpeed) recordingSpeed.value=String(recordingPlayer.playbackRate)});
    recordingPlayer?.addEventListener('error',()=>{
      recordingsVideoWrap?.classList.remove('is-playing');
      if(recordingVideoError) recordingVideoError.hidden=false;
    });
    recordingPlayer?.addEventListener('ended',()=>{
      recordingStoreSet(recordingProgressKey,'1');
      recordingStoreSet(recordingWatchedKey,'100');
      recordingStoreSet(recordingPositionKey,'0');
      syncRecordingLearningState();
    });
    recordingsVideoWrap?.addEventListener('mousemove',showRecordingControls);
    recordingsVideoWrap?.addEventListener('touchstart',showRecordingControls,{passive:true});

    markRecordingComplete?.addEventListener('click',()=>{
      const complete=!recordingIsComplete();
      recordingStoreSet(recordingProgressKey,complete?'1':'0');
      if(complete) recordingStoreSet(recordingWatchedKey,'100');
      syncRecordingLearningState();
    });

    document.querySelectorAll('.recordings-tab').forEach(tab=>tab.addEventListener('click',()=>{
      document.querySelectorAll('.recordings-tab').forEach(item=>item.setAttribute('aria-selected',String(item===tab)));
      document.querySelectorAll('.recordings-tab-panel').forEach(panel=>{
        const active=panel.id===tab.getAttribute('aria-controls');
        panel.classList.toggle('is-active',active);
        panel.hidden=!active;
      });
    }));
    function activateRecordingNotesTab(){
      document.getElementById('recordingNotesTab')?.click();
    }
    addRecordingTimestamp?.addEventListener('click',()=>{
      activateRecordingNotesTab();
      if(!recordingNotesBox) return;
      const stamp=`[${formatRecordingClock(recordingPlayer?.currentTime||0)}] `;
      const startPos=recordingNotesBox.selectionStart??recordingNotesBox.value.length;
      const endPos=recordingNotesBox.selectionEnd??startPos;
      recordingNotesBox.setRangeText(stamp,startPos,endPos,'end');
      recordingNotesBox.dispatchEvent(new Event('input',{bubbles:true}));
      recordingNotesBox.focus();
    });
    let recordingNotesTimer=null;
    recordingNotesBox?.addEventListener('input',()=>{
      if(recordingNoteStatus) recordingNoteStatus.textContent='Saving notes…';
      clearTimeout(recordingNotesTimer);
      recordingNotesTimer=setTimeout(()=>{
        if(recordingStoreSet(recordingNotesKey,recordingNotesBox.value)){
          if(recordingNoteStatus) recordingNoteStatus.textContent='Notes saved on this device.';
        }else if(recordingNoteStatus) recordingNoteStatus.textContent='Notes could not be saved in this browser.';
      },350);
    });

    document.addEventListener('keydown',event=>{
      if(!recordingsPanel?.classList.contains('is-open')) return;
      if(event.ctrlKey||event.metaKey||event.altKey) return;
      const target=event.target;
      if(target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement||target?.isContentEditable) return;
      const key=event.key.toLowerCase();
      if(key===' '||key==='k'){event.preventDefault();toggleRecordingPlayback()}
      else if(key==='j'||event.key==='ArrowLeft'){event.preventDefault();seekRecordingBy(-10)}
      else if(key==='l'||event.key==='ArrowRight'){event.preventDefault();seekRecordingBy(10)}
      else if(key==='m'&&recordingPlayer){event.preventDefault();recordingPlayer.muted=!recordingPlayer.muted;updateRecordingControlState()}
      else if(key==='f'){event.preventDefault();toggleRecordingFullscreen()}
    });

    if(recordingPipButton&&!document.pictureInPictureEnabled) recordingPipButton.hidden=true;
    if(recordingNotesBox) recordingNotesBox.value=recordingStoreGet(recordingNotesKey,'');
    if(recordingPlayer?.readyState>=1) initialiseRecordingMetadata();
    updateRecordingQuizSummary();
    syncRecordingLearningState();
    if(location.hash==='#recordings') setTimeout(()=>openRecordingsPanel(),0);

    function removeHighlights(){
      document.querySelectorAll('.search-highlight').forEach(span=>{
        const text=document.createTextNode(span.textContent || '');
        span.parentNode.replaceChild(text,span);
      });
    }

    function normaliseText(value){
      return (value || '').replace(/\s+/g,' ').trim();
    }

    function buildSearchBlocks(){
      const candidates=[
        ...document.querySelectorAll('main section, .quick-actions, footer .footer-col, footer .footer-brand, header .dropdown-section')
      ];
      return candidates
        .filter(el=>!el.closest('.search-row') && !el.closest('.modal'))
        .map((el,idx)=>{
          if(!el.id) el.id=`search-target-${idx}`;
          const heading=el.querySelector('h1,h2,h3,strong,.quick-action-label,.dropdown-title');
          const title=normaliseText(heading?.textContent) || el.getAttribute('aria-label') || 'FINDAT website content';
          const text=normaliseText(el.textContent);
          return {el,title,text};
        })
        .filter(item=>item.text.length>0);
    }

    function makeSnippet(text, query){
      const lower=text.toLowerCase();
      const q=query.toLowerCase();
      const found=lower.indexOf(q);
      if(found<0) return text.slice(0,170) + (text.length>170 ? '…' : '');
      const start=Math.max(0, found-70);
      const end=Math.min(text.length, found+query.length+110);
      return (start>0 ? '…' : '') + text.slice(start,end) + (end<text.length ? '…' : '');
    }

    function highlightQuery(query){
      removeHighlights();
      if(!query) return 0;
      const q=query.toLowerCase();
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{
        acceptNode(node){
          const parent=node.parentElement;
          if(!parent) return NodeFilter.FILTER_REJECT;
          if(parent.closest('.search-row,.modal,script,style,noscript,input,textarea,select')) return NodeFilter.FILTER_REJECT;
          if(!node.nodeValue || !node.nodeValue.toLowerCase().includes(q)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      const nodes=[];
      while(walker.nextNode()) nodes.push(walker.currentNode);
      let count=0;
      nodes.forEach(node=>{
        const text=node.nodeValue;
        const lower=text.toLowerCase();
        const frag=document.createDocumentFragment();
        let last=0;
        let idx=lower.indexOf(q);
        while(idx!==-1){
          frag.appendChild(document.createTextNode(text.slice(last,idx)));
          const mark=document.createElement('mark');
          mark.className='search-highlight';
          mark.textContent=text.slice(idx,idx+query.length);
          frag.appendChild(mark);
          count+=1;
          last=idx+query.length;
          idx=lower.indexOf(q,last);
        }
        frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag,node);
      });
      return count;
    }

    function executeSearch(){
      const input=document.getElementById('siteSearch');
      const resultsBox=document.getElementById('siteSearchResults');
      const q=(input?.value || '').trim();
      if(!q){
        if(resultsBox){
          resultsBox.classList.add('has-results');
          resultsBox.innerHTML='<p class="search-results-summary">Enter a search term or question to search the FINDAT website.</p>';
        }
        input?.focus();
        return;
      }

      const blocks=buildSearchBlocks();
      const queryLower=q.toLowerCase();
      const matches=blocks.filter(item=>item.text.toLowerCase().includes(queryLower));
      highlightQuery(q);

      if(!resultsBox) return;
      resultsBox.classList.add('has-results');
      if(matches.length===0){
        resultsBox.innerHTML=`<p class="search-results-summary">No results found for “${q}”. Try a different term such as data, automation, research, reconciliation, classes, developments or contact.</p>`;
        return;
      }

      const shown=matches.slice(0,8);
      resultsBox.innerHTML=`
        <p class="search-results-summary">${matches.length} result${matches.length===1?'':'s'} found for “${q}”. Select a result to jump to it.</p>
        <ul class="search-results-list">
          ${shown.map((item,i)=>`<li><button class="search-result-card" type="button" data-result-index="${i}"><strong>${item.title}</strong><span>${makeSnippet(item.text,q)}</span></button></li>`).join('')}
        </ul>`;

      resultsBox.querySelectorAll('.search-result-card').forEach(button=>{
        button.addEventListener('click',()=>{
          const target=shown[Number(button.dataset.resultIndex)]?.el;
          if(!target) return;
          closeSearchPanel();
          setTimeout(()=>target.scrollIntoView({behavior:'smooth',block:'start'}),80);
        });
      });
    }

    function toggleModal(id,state){
      const el=document.getElementById(id);
      if(!el) return;
      el.classList.toggle('is-visible',state);
      el.setAttribute('aria-hidden',String(!state));
    }
    document.getElementById('openLogin')?.addEventListener('click',e=>{e.preventDefault();toggleModal('loginPopup',true)});
    document.getElementById('footerLogin')?.addEventListener('click',e=>{e.preventDefault();toggleModal('loginPopup',true)});
    document.getElementById('openSignup')?.addEventListener('click',e=>{e.preventDefault();toggleModal('signupPopup',true)});
    document.getElementById('openLang')?.addEventListener('click',e=>{e.preventDefault();toggleModal('langPopup',true)});
    document.querySelectorAll('.open-consultant').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();toggleModal('consultantModal',true)}));
    document.querySelectorAll('.modal').forEach(modal=>modal.addEventListener('click',e=>{ if(e.target===modal) toggleModal(modal.id,false); }));
    document.addEventListener('keydown',e=>{ if(e.key === 'Escape'){ closeSearchPanel(); closePublicationsPanel(); closeLiveTrainingPanel(); closeRecordingsPanel(); document.querySelectorAll('.modal').forEach(m=>toggleModal(m.id,false)); mainNav.classList.remove('is-mobile-open'); closeMobileMenus(); } });

    function removeHighlights(){
      document.querySelectorAll('.search-highlight').forEach(span=>{
        const text=document.createTextNode(span.textContent);
        span.parentNode.replaceChild(text,span);
      });
    }
    function findAndHighlightFirst(query){
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,false);
      const q=query.toLowerCase();
      let node;
      while(node=walker.nextNode()){
        if(node.parentElement && ['SCRIPT','STYLE','INPUT','TEXTAREA','SELECT'].includes(node.parentElement.tagName)) continue;
        const text=node.nodeValue.toLowerCase();
        const idx=text.indexOf(q);
        if(idx!==-1){
          if(node.parentElement.closest('#publications')) openPublicationsPanel(document.querySelector('.quick-action[href="#publications"]'));
          if(node.parentElement.closest('#live-training')) openLiveTrainingPanel(document.querySelector('.quick-action[href="#live-training"]'));
          if(node.parentElement.closest('#recordings')) openRecordingsPanel(document.querySelector('.quick-action[href="#recordings"]'));
          const range=document.createRange();
          range.setStart(node,idx);
          range.setEnd(node,idx+query.length);
          const mark=document.createElement('span');
          mark.className='search-highlight';
          mark.style.backgroundColor='#ffd966';
          mark.style.fontWeight='700';
          range.surroundContents(mark);
          mark.scrollIntoView({behavior:'smooth',block:'center'});
          return true;
        }
      }
      return false;
    }
    function executeSearch(){
      const q=document.getElementById('siteSearch').value.trim();
      if(!q){ alert('Enter a search term.'); return; }
      closeSearchPanel();
      removeHighlights();
      const found=findAndHighlightFirst(q);
      if(!found) alert(`No results for "${q}"`);
    }

    const contactReception=document.getElementById('contactReception');
    const contactWhatsappStatus=document.getElementById('contactWhatsappStatus');
    if(contactReception){
      contactReception.addEventListener('click',()=>{
        const receptionistPhone='+260976913843';
        const chatUrl=`https://api.whatsapp.com/send?phone=260976913843&text=${encodeURIComponent('Hello FINDAT Consultants receptionist, I would like to make an enquiry.')}`;
        const whatsappWindow=window.open('about:blank', '_blank');
        if(whatsappWindow) whatsappWindow.opener=null;
        contactReception.classList.add('is-loading');
        const label=contactReception.querySelector('.contact-label');
        if(label) label.textContent=receptionistPhone;
        if(contactWhatsappStatus) contactWhatsappStatus.textContent=`Opening WhatsApp chat with receptionist: ${receptionistPhone}`;
        setTimeout(()=>{
          if(whatsappWindow){ whatsappWindow.location.href=chatUrl; }
          else { window.location.href=chatUrl; }
          setTimeout(()=>{
            contactReception.classList.remove('is-loading');
            if(label) label.textContent='Contact';
            if(contactWhatsappStatus) contactWhatsappStatus.textContent='';
          }, 1200);
        }, 650);
      });
    }

    const consultantForm=document.getElementById('consultantForm');
    const RATE_KEY='findat_req_last';
    function rateLimited(){ const last=+(localStorage.getItem(RATE_KEY)||0); return (Date.now()-last)<60000; }
    if(consultantForm){
      consultantForm.addEventListener('submit',async e=>{
        e.preventDefault();
        if(rateLimited()){ alert('Please wait a minute before sending another request.'); return; }
        const fd=new FormData(consultantForm);
        const message=`Consultant Request\nName: ${fd.get('clientName')}\nEmail: ${fd.get('clientEmail')}\nPhone: ${fd.get('clientPhone')}\nService: ${fd.get('servicesNeeded')}\nType: ${fd.get('consultantType')}\nDuration: ${fd.get('projectDuration')}`;
        window.open(`https://api.whatsapp.com/send?phone=+260976913843&text=${encodeURIComponent(message)}`,'_blank','noopener');
        try{
          await fetch('/consultant-request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(fd))});
          localStorage.setItem(RATE_KEY, String(Date.now()));
        }catch(_){ }
        toggleModal('consultantModal',false);
        consultantForm.reset();
        alert('Request sent — we’ll contact you shortly.');
      });
    }



/* ============================== Inline script 02 ============================== */

document.querySelectorAll('.programme-trigger').forEach(trigger=>{
      trigger.addEventListener('click',()=>{
        const item=trigger.closest('.programme-item');
        const list=trigger.closest('.programme-list');
        list?.querySelectorAll('.programme-item').forEach(other=>{
          if(other!==item) other.classList.remove('is-open');
        });
        item?.classList.toggle('is-open');
      });
    });



/* ============================== Inline script 03 ============================== */

(()=>{
      const windowEl=document.getElementById('globalInnovationWindow');
      if(!windowEl) return;

      const panels=[...windowEl.querySelectorAll('[data-innovation-panel]')];
      const pauseButton=document.getElementById('globalInnovationPause');
      const nextButton=document.getElementById('globalInnovationNext');
      const progress=document.getElementById('globalInnovationProgress');
      const status=document.getElementById('globalInnovationStatus');
      const rotationMs=7000;
      let timer=null;
      let paused=false;
      let cycle=0;

      const items=[
        {
          category:'Technology & Finance',
          icon:'fas fa-microchip',
          copy:'Digital markets, automation and intelligent systems.',
          image:'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=82'
        },
        {
          category:'Green Energy',
          icon:'fas fa-leaf',
          copy:'Clean power, smart grids and sustainable industry.',
          image:'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=1400&q=82'
        },
        {
          category:'Travel & Connectivity',
          icon:'fas fa-plane-departure',
          copy:'Connected destinations and modern global mobility.',
          image:'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=82'
        },
        {
          category:'Agriculture',
          icon:'fas fa-seedling',
          copy:'Precision farming, resilient food systems and agritech.',
          image:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=82'
        },
        {
          category:'Transport & Mobility',
          icon:'fas fa-bus-alt',
          copy:'Smarter movement by road, rail, air and sea.',
          image:'https://images.unsplash.com/photo-1519003300449-424ad0405076?auto=format&fit=crop&w=1400&q=82'
        },
        {
          category:'Technology & Finance',
          icon:'fas fa-chart-line',
          copy:'Real-time insight, financial inclusion and connected commerce.',
          image:'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1400&q=82'
        },
        {
          category:'Green Energy',
          icon:'fas fa-solar-panel',
          copy:'Renewable infrastructure supporting lower-carbon growth.',
          image:'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1400&q=82'
        },
        {
          category:'Travel & Connectivity',
          icon:'fas fa-globe-africa',
          copy:'People, places and ideas moving across a connected world.',
          image:'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1400&q=82'
        },
        {
          category:'Agriculture',
          icon:'fas fa-tractor',
          copy:'Technology helping producers improve quality and productivity.',
          image:'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1400&q=82'
        },
        {
          category:'Transport & Mobility',
          icon:'fas fa-train',
          copy:'Efficient infrastructure connecting cities and economies.',
          image:'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=82'
        },
        {
          category:'Technology & Finance',
          icon:'fas fa-laptop-code',
          copy:'Software, data and financial tools shaping modern enterprise.',
          image:'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=82'
        },
        {
          category:'Agriculture',
          icon:'fas fa-seedling',
          copy:'Sustainable production and smarter management of natural resources.',
          image:'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1400&q=82'
        }
      ];

      const batches=[
        [0,1,2],
        [3,4,5],
        [6,7,8],
        [9,10,11],
        [1,3,4],
        [5,6,7],
        [8,9,0]
      ];

      const preload=image=>{
        const img=new Image();
        img.referrerPolicy='no-referrer';
        img.src=image;
      };
      items.forEach(item=>preload(item.image));

      function restartProgress(){
        if(!progress) return;
        progress.classList.remove('is-running');
        void progress.offsetWidth;
        if(!paused) progress.classList.add('is-running');
      }

      function updatePanel(panel,item,position){
        const photos=[...panel.querySelectorAll('.global-innovation-photo')];
        const current=photos.find(photo=>photo.classList.contains('is-active')) || photos[0];
        const incoming=photos.find(photo=>photo!==current) || photos[1];
        const heading=panel.querySelector('h3');
        const copy=panel.querySelector('.global-innovation-panel-copy');
        const icon=panel.querySelector('.global-innovation-panel-icon i');
        const index=panel.querySelector('.global-innovation-panel-index');

        panel.classList.add('is-updating');
        incoming.onload=()=>{
          incoming.classList.add('is-active');
          current.classList.remove('is-active');
          window.setTimeout(()=>{
            current.removeAttribute('src');
            panel.classList.remove('is-updating');
          },1180);
        };
        incoming.onerror=()=>{
          panel.classList.remove('is-updating');
          incoming.onerror=null;
          incoming.onload=null;
        };
        incoming.src=item.image;

        window.setTimeout(()=>{
          if(heading) heading.textContent=item.category;
          if(copy) copy.textContent=item.copy;
          if(icon) icon.className=item.icon;
          if(index) index.textContent=String(position+1).padStart(2,'0');
        },260);
      }

      function showNext(){
        cycle=(cycle+1)%batches.length;
        const batch=batches[cycle];
        panels.forEach((panel,index)=>updatePanel(panel,items[batch[index]],index));
        if(status) status.textContent=`Global view ${cycle+1} of ${batches.length}`;
        restartProgress();
      }

      function stopTimer(){
        if(timer){window.clearInterval(timer);timer=null;}
      }

      function startTimer(){
        stopTimer();
        if(!paused) timer=window.setInterval(showNext,rotationMs);
        restartProgress();
      }

      pauseButton?.addEventListener('click',()=>{
        paused=!paused;
        pauseButton.setAttribute('aria-pressed',String(paused));
        pauseButton.setAttribute('aria-label',paused?'Resume image rotation':'Pause image rotation');
        pauseButton.innerHTML=paused?'<i class="fas fa-play" aria-hidden="true"></i>':'<i class="fas fa-pause" aria-hidden="true"></i>';
        if(status) status.textContent=paused?'Visual stream paused':`Global view ${cycle+1} of ${batches.length}`;
        if(paused){
          stopTimer();
          progress?.classList.remove('is-running');
        }else{
          startTimer();
        }
      });

      nextButton?.addEventListener('click',()=>{
        showNext();
        if(!paused) startTimer();
      });

      windowEl.addEventListener('mouseenter',()=>{
        if(!paused){stopTimer();progress?.classList.remove('is-running');}
      });
      windowEl.addEventListener('mouseleave',()=>{
        if(!paused) startTimer();
      });
      windowEl.addEventListener('focusin',()=>{
        if(!paused){stopTimer();progress?.classList.remove('is-running');}
      });
      windowEl.addEventListener('focusout',event=>{
        if(!windowEl.contains(event.relatedTarget) && !paused) startTimer();
      });

      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        paused=true;
        pauseButton?.setAttribute('aria-pressed','true');
        pauseButton?.setAttribute('aria-label','Resume image rotation');
        if(pauseButton) pauseButton.innerHTML='<i class="fas fa-play" aria-hidden="true"></i>';
        if(status) status.textContent='Motion reduced by device preference';
      }else{
        if(status) status.textContent=`Global view 1 of ${batches.length}`;
        startTimer();
      }
    })();



/* ============================== Inline script 04 ============================== */

(()=>{
      const toggles=document.querySelectorAll('.dropdown-expand-toggle');

      toggles.forEach(toggle=>{
        toggle.addEventListener('click',event=>{
          event.preventDefault();
          event.stopPropagation();

          const option=toggle.closest('.dropdown-option');
          const detailId=toggle.getAttribute('aria-controls');
          const detail=detailId ? document.getElementById(detailId) : null;
          if(!option || !detail) return;

          const opening=toggle.getAttribute('aria-expanded')!=='true';
          option.classList.toggle('is-expanded',opening);
          toggle.setAttribute('aria-expanded',String(opening));
          toggle.setAttribute('aria-label',`${opening ? 'Hide' : 'Show'} details for ${toggle.dataset.title}`);
          detail.hidden=!opening;
        });
      });
    })();



/* ============================== Inline script 05 ============================== */

(()=>{
      document.querySelectorAll('.dropdown-social-action[data-external-url]').forEach(button=>{
        button.addEventListener('click',event=>{
          event.preventDefault();
          event.stopPropagation();
          const url=button.getAttribute('data-external-url');
          if(!url) return;
          const opened=window.open(url,'_blank','noopener');
          if(opened) opened.opener=null;
        });
      });
    })();



/* ============================== Inline script 06 ============================== */

(()=>{
      document.querySelectorAll('.footer-expand-toggle').forEach(toggle=>{
        toggle.addEventListener('click',event=>{
          event.preventDefault();
          event.stopPropagation();

          const item=toggle.closest('.footer-expand-item');
          const detailId=toggle.getAttribute('aria-controls');
          const detail=detailId ? document.getElementById(detailId) : null;
          if(!item || !detail) return;

          const opening=toggle.getAttribute('aria-expanded')!=='true';
          item.classList.toggle('is-expanded',opening);
          toggle.setAttribute('aria-expanded',String(opening));
          toggle.setAttribute('aria-label',`${opening ? 'Hide' : 'Show'} details for ${toggle.dataset.title}`);
          detail.hidden=!opening;
        });
      });
    })();



/* ============================== Inline script 07 ============================== */

(()=>{
      const toggle=document.querySelector('.industries-reveal-toggle');
      const panel=document.getElementById('industries-reveal-panel');
      if(!toggle || !panel) return;

      const label=toggle.querySelector('.industries-reveal-label');

      toggle.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();

        const opening=toggle.getAttribute('aria-expanded')!=='true';
        toggle.setAttribute('aria-expanded',String(opening));
        toggle.classList.toggle('is-open',opening);
        panel.classList.toggle('is-open',opening);
        panel.setAttribute('aria-hidden',String(!opening));
        if(label) label.textContent=opening ? 'Hide industries' : 'Show industries';
      });
    })();



/* ============================== Inline script 08 ============================== */

(()=>{
      document.querySelectorAll('.footer-social-button[data-external-url]').forEach(button=>{
        button.addEventListener('click',event=>{
          event.preventDefault();
          const url=button.getAttribute('data-external-url');
          if(!url) return;
          const opened=window.open(url,'_blank','noopener');
          if(opened) opened.opener=null;
        });
      });
      document.querySelectorAll('.footer-social-button[data-scroll-target]').forEach(button=>{
        button.addEventListener('click',event=>{
          event.preventDefault();
          const selector=button.getAttribute('data-scroll-target');
          const target=selector ? document.querySelector(selector) : null;
          target?.scrollIntoView({behavior:'smooth',block:'start'});
        });
      });
    })();



/* ============================== Inline script 09 ============================== */

(()=>{
      const yearElement=document.getElementById('findat-current-year');
      if(yearElement) yearElement.textContent=String(new Date().getFullYear());
    })();



/* ============================== Inline script 10 ============================== */

(()=>{
      'use strict';
      const FINDAT_AUTH_CONFIG=window.FINDAT_AUTH_CONFIG||{};
      const SUPABASE_URL=String(FINDAT_AUTH_CONFIG.supabaseUrl||'');
      const SUPABASE_KEY=String(FINDAT_AUTH_CONFIG.publishableKey||FINDAT_AUTH_CONFIG.anonKey||'');
      let rememberSupabaseSession=true;
      const authStorage={
        getItem(key){return sessionStorage.getItem(key)||localStorage.getItem(key)},
        setItem(key,value){const primary=rememberSupabaseSession?localStorage:sessionStorage,secondary=rememberSupabaseSession?sessionStorage:localStorage;primary.setItem(key,value);secondary.removeItem(key)},
        removeItem(key){localStorage.removeItem(key);sessionStorage.removeItem(key)}
      };
      const supabaseClient=window.supabase?.createClient&&SUPABASE_URL&&SUPABASE_KEY?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:authStorage,storageKey:'findat-auth-v1'}}):null;
      window.FINDAT_SUPABASE_CLIENT=supabaseClient;
      const LEGACY_WORKSPACE_KEY='findat.workspace.v2';
      const dashboard=document.getElementById('findatDashboard');
      let activeAccount=null;
      let accountCache=[];
      let workspaceCache={articles:[],audit:[]};
      let editingArticleId='';
      let pendingCover=null;
      let pendingAttachments=[];
      let currentReaderArticleId='';
      let publicRefreshTimer=0;
      let recoverySessionActive=false;
      let authTransitionInProgress=false;
      let directoryCache=[];
      let collaborationCache=[];
      let collaborationInbox=[];
      let collaborationActivity=[];
      let notificationFeed=[];
      let collaborationChannel=null;
      let contributorLayoutDraft=[];
      let contributorLayoutArticleId='';
      let contributorLayoutDirty=false;
      const reviewSelection=new Set();
      let collaborationRefreshTimer=0;
      let articleActivityCache={articleId:'',revisions:[],comments:[]};
      let articleCommentReplyId='';
      let notificationCommentArticleId='';
      let notificationCommentReplyId='';

      const $=(selector,root=document)=>root.querySelector(selector);
      const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
      const safeParse=(value,fallback)=>{try{const parsed=JSON.parse(value);return parsed??fallback}catch{return fallback}};
      const normal=value=>String(value||'').trim().toLowerCase();
      const uid=()=>globalThis.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)});
      const nowISO=()=>new Date().toISOString();
      const escapeHTML=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
      const formatDate=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'—':date.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})};
      const formatTime=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'—':date.toLocaleString(undefined,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})};
      const roleLabel=role=>({admin:'Administrator',consultant:'Consultant',client:'Client'})[role]||'Client';
      const normaliseRole=value=>{const role=normal(value);if(role.includes('admin'))return'admin';if(role.includes('consult'))return'consultant';return'client'};
      const accountName=account=>account?.displayName||`${account?.firstName||''} ${account?.lastName||''}`.trim()||account?.username||'FINDAT Member';
      const initials=account=>{const parts=String(accountName(account)||'FINDAT Member').trim().split(/\s+/);return `${parts[0]?.[0]||'F'}${parts.length>1?parts.at(-1)?.[0]||'M':''}`.toUpperCase()};
      const isAdmin=()=>activeAccount?.role==='admin';
      const stripHTML=value=>{const div=document.createElement('div');div.innerHTML=String(value||'');return(div.textContent||'').trim()};
      const sanitiseHTML=value=>{const template=document.createElement('template');template.innerHTML=String(value||'');template.content.querySelectorAll('script,style,iframe,object,embed,form,input,button').forEach(node=>node.remove());template.content.querySelectorAll('*').forEach(node=>[...node.attributes].forEach(attr=>{if(/^on/i.test(attr.name)||attr.name==='srcdoc'||(/^(href|src)$/i.test(attr.name)&&/^javascript:/i.test(attr.value)))node.removeAttribute(attr.name)}));return template.innerHTML};
      const templateHints={classic:'Classic article gives you a clean, readable page suitable for general publications.',research:'Research paper provides a formal structure for evidence, findings, analysis and references.',report:'Professional report is designed for executive summaries, recommendations and organisational reports.',newsletter:'Newsletter gives the page a lighter editorial format for announcements and updates.'};
      const templateStarters={classic:'<p>Begin with a strong introduction that tells the reader why this subject matters.</p><h2>Main discussion</h2><p>Develop the central argument, evidence or story here.</p>',research:'<h2>Abstract</h2><p>Summarise the purpose, method and principal finding.</p><h2>Introduction</h2><p>State the problem and context.</p><h2>Findings and discussion</h2><p>Present and interpret the evidence.</p><h2>Conclusion</h2><p>Summarise the implications.</p>',report:'<h2>Executive summary</h2><p>Provide the essential conclusion and recommendation.</p><h2>Background</h2><p>Explain the context and scope.</p><h2>Analysis</h2><p>Present the evidence and interpretation.</p><h2>Recommendations</h2><ul><li>Add the first recommendation.</li></ul>',newsletter:'<h2>What you need to know</h2><p>Open with the most important update.</p><h2>Highlights</h2><ul><li>Add a key highlight.</li></ul><h2>What comes next</h2><p>Close with the next action or event.</p>'};

      function profileFromRow(row){
        if(!row)return null;
        const displayName=String(row.display_name||'').trim();
        return{id:row.id,displayName,firstName:row.first_name||'',lastName:row.last_name||'',email:row.email||'',username:row.username||'',phone:row.phone||'',organisation:row.organisation||'',role:normaliseRole(row.role),country:row.country||'',avatarUrl:row.avatar_url||'',qualifications:row.qualifications||'',jobTitle:row.job_title||'',placeOfWork:row.place_of_work||'',active:row.active!==false,emailConfirmed:row.emailConfirmed===true||Boolean(row.email_confirmed_at),emailConfirmedAt:row.email_confirmed_at||'',lastSignInAt:row.last_sign_in_at||'',createdAt:row.created_at||'',updatedAt:row.updated_at||''}
      }
      function articleFromRow(row){if(!row)return null;return{id:row.id,ownerId:row.owner_id,createdBy:row.created_by,collaboratorId:row.collaborator_id||'',publisherId:row.publisher_id||'',publisherAssignedBy:row.publisher_assigned_by||'',publisherAssignedAt:row.publisher_assigned_at||'',contributorLayout:Array.isArray(row.contributor_layout)?row.contributor_layout:[],title:row.title||'',subtitle:row.subtitle||'',content:row.content||'',template:row.template||'classic',category:row.category||'Research',image:row.image||null,attachments:Array.isArray(row.attachments)?row.attachments:[],status:row.status||'Draft',reviewNote:row.review_note||'',authorName:row.author_name||'',createdAt:row.created_at||'',updatedAt:row.updated_at||'',submittedAt:row.submitted_at||'',reviewedAt:row.reviewed_at||'',reviewedBy:row.reviewed_by||'',publishedAt:row.published_at||''}}
      function articleToRow(article){return{id:article.id,owner_id:article.ownerId||article.createdBy,created_by:article.createdBy||article.ownerId,collaborator_id:null,publisher_id:article.publisherId||null,publisher_assigned_by:article.publisherAssignedBy||null,publisher_assigned_at:article.publisherAssignedAt||null,contributor_layout:Array.isArray(article.contributorLayout)?article.contributorLayout:[],title:article.title||'',subtitle:article.subtitle||'',content:article.content||'',template:article.template||'classic',category:article.category||'Research',image:article.image||null,attachments:Array.isArray(article.attachments)?article.attachments:[],status:article.status||'Draft',review_note:article.reviewNote||null,submitted_at:article.submittedAt||null,reviewed_at:article.reviewedAt||null,reviewed_by:article.reviewedBy||null,published_at:article.publishedAt||null}}
      function loadAccounts(){return accountCache.slice()}
      function saveAccounts(accounts){accountCache=Array.isArray(accounts)?accounts.slice():[]}
      function loadWorkspace(){return workspaceCache}
      function saveWorkspace(state){workspaceCache={articles:Array.isArray(state?.articles)?state.articles:[],audit:Array.isArray(state?.audit)?state.audit:[]}}
      function findAccount(identifier){const needle=normal(identifier);return accountCache.find(account=>normal(account.username)===needle||normal(account.email)===needle)}
      function accountById(id){return accountCache.find(account=>account.id===id)}
      function requireSupabase(statusId='loginStatus'){if(supabaseClient)return true;setStatus(statusId,'Secure authentication is not configured in this deployment.','error');return false}
      async function getCurrentSession(){if(!supabaseClient)return null;const{data}=await supabaseClient.auth.getSession();return data?.session||null}
      async function fetchOwnProfile(userId){if(!supabaseClient||!userId)return null;const{data,error}=await supabaseClient.from('findat_profiles').select('*').eq('id',userId).maybeSingle();if(error)throw error;return profileFromRow(data)}
      async function refreshDirectory(){
        if(!supabaseClient||!activeAccount)return;
        const next=[activeAccount];
        const directoryResult=await supabaseClient.rpc('findat_collaboration_directory');
        if(directoryResult.error)throw directoryResult.error;
        directoryCache=(directoryResult.data||[]).map(profileFromRow).filter(Boolean);
        next.push(...directoryCache.filter(item=>item.id!==activeAccount.id));
        if(activeAccount.role==='admin'){
          const response=await invokeFunction(FINDAT_AUTH_CONFIG.adminUsersFunction||'findat-admin-users',{action:'list'},true);
          for(const row of response.users||[]){
            const richer=profileFromRow(row),directory=directoryCache.find(item=>item.id===row.id);
            if(richer&&directory)richer.avatarUrl=directory.avatarUrl||richer.avatarUrl;
            next.push(richer)
          }
        }
        accountCache=[...new Map(next.filter(Boolean).map(item=>[item.id,item])).values()]
      }
      async function refreshCollaborationState(){
        if(!supabaseClient||!activeAccount){collaborationCache=[];collaborationInbox=[];collaborationActivity=[];notificationFeed=[];return}
        const [rowsResult,inboxResult,activityResult,notificationsResult]=await Promise.all([
          supabaseClient.from('findat_article_collaborators').select('article_id,user_id,invited_by,status,created_at,responded_at,updated_at').order('updated_at',{ascending:false}),
          supabaseClient.rpc('findat_collaboration_inbox'),
          supabaseClient.rpc('findat_collaboration_activity'),
          supabaseClient.rpc('findat_notifications_feed')
        ]);
        if(rowsResult.error)throw rowsResult.error;
        collaborationCache=rowsResult.data||[];
        if(inboxResult.error){
          console.warn('Collaboration inbox RPC unavailable; deriving pending requests from visible collaboration rows.',inboxResult.error);
          collaborationInbox=collaborationCache.filter(row=>row.user_id===activeAccount.id&&row.status==='pending').map(row=>{const article=workspaceCache.articles.find(item=>item.id===row.article_id),inviter=accountById(row.invited_by);return{article_id:row.article_id,article_title:article?.title||'Untitled paper',inviter_id:row.invited_by,inviter_name:accountName(inviter||{displayName:'FINDAT Member'}),inviter_avatar_url:inviter?.avatarUrl||'',created_at:row.created_at}})
        }else collaborationInbox=inboxResult.data||[];
        if(activityResult.error){
          console.warn('Collaboration activity RPC unavailable; using pending-request fallback.',activityResult.error);
          collaborationActivity=collaborationInbox.map(request=>({...request,direction:'incoming',other_name:request.inviter_name,other_avatar_url:request.inviter_avatar_url,status:'pending',updated_at:request.created_at}));
        }else collaborationActivity=activityResult.data||[];
        if(notificationsResult.error){
          console.warn('Notification feed RPC unavailable; using collaboration activity fallback.',notificationsResult.error);
          notificationFeed=[];
        }else notificationFeed=notificationsResult.data||[];
        renderCollaborationInbox();
        renderArticleCollaborationNotice(workspaceCache.articles.find(article=>article.id===editingArticleId)||null);
      }
      function stopCollaborationRealtime(){
        if(collaborationChannel&&supabaseClient){try{supabaseClient.removeChannel(collaborationChannel)}catch(error){console.warn('Could not remove collaboration channel',error)}}
        collaborationChannel=null;
      }
      function startCollaborationRealtime(){
        stopCollaborationRealtime();
        if(!supabaseClient||!activeAccount||typeof supabaseClient.channel!=='function')return;
        const refresh=async()=>{
          try{await Promise.all([refreshCollaborationState(),refreshArticles(),editingArticleId?refreshArticleActivity(editingArticleId):Promise.resolve()]);renderAll()}catch(error){console.warn('Realtime collaboration refresh failed',error)}
        };
        collaborationChannel=supabaseClient
          .channel(`findat-collaboration-${activeAccount.id}`)
          .on('postgres_changes',{event:'*',schema:'public',table:'findat_article_collaborators'},refresh)
          .on('postgres_changes',{event:'*',schema:'public',table:'findat_notifications',filter:`recipient_id=eq.${activeAccount.id}`},refresh)
          .on('postgres_changes',{event:'*',schema:'public',table:'findat_article_revisions'},refresh)
          .on('postgres_changes',{event:'*',schema:'public',table:'findat_article_comments'},refresh)
          .subscribe((status,error)=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')console.warn('Collaboration realtime unavailable; timed refresh remains active.',error||status)});
      }
      async function refreshArticles({publicOnly=false}={}){if(!supabaseClient)return;let query=supabaseClient.from('findat_articles').select('*').order('updated_at',{ascending:false});if(publicOnly)query=query.eq('status','Published');const{data,error}=await query;if(error)throw error;const incoming=(data||[]).map(articleFromRow);if(publicOnly&&!activeAccount){workspaceCache={...workspaceCache,articles:incoming};return}workspaceCache={...workspaceCache,articles:incoming}}
      async function refreshPublicArticles(){try{await refreshArticles({publicOnly:!activeAccount});renderHomepagePublications();if(activeAccount)renderAll()}catch(error){console.warn('FINDAT publication refresh failed',error)}}
      async function loadAuthenticatedWorkspace(){await Promise.all([refreshDirectory(),refreshArticles(),refreshCollaborationState()]);renderAll()}
      async function invokeFunction(name,body,requiresAuth=false){if(!SUPABASE_URL||!SUPABASE_KEY)throw new Error('The secure service is not configured.');const headers={'Content-Type':'application/json','apikey':SUPABASE_KEY};if(requiresAuth){const session=await getCurrentSession();if(!session?.access_token)throw new Error('Your session has expired. Please log in again.');headers.Authorization=`Bearer ${session.access_token}`}const response=await fetch(`${SUPABASE_URL}/functions/v1/${encodeURIComponent(name)}`,{method:'POST',headers,body:JSON.stringify(body||{})});let payload={};try{payload=await response.json()}catch{}if(!response.ok)throw new Error(payload.error||payload.message||`Request failed (${response.status}).`);return payload}
      async function migrateLegacyWorkspaceIfEmpty(){if(!activeAccount||workspaceCache.articles.length)return;let legacy;try{legacy=JSON.parse(localStorage.getItem(LEGACY_WORKSPACE_KEY)||'null')}catch{return}if(!Array.isArray(legacy?.articles)||!legacy.articles.length)return;const migratable=legacy.articles.filter(item=>item&&item.title&&item.content).slice(0,100);if(!migratable.length)return;for(const old of migratable){const article={...old,id:uid(),ownerId:activeAccount.id,createdBy:activeAccount.id,collaboratorId:'',status:old.status==='Published'&&activeAccount.role!=='admin'?'Draft':old.status||'Draft',reviewedBy:'',createdAt:old.createdAt||nowISO(),updatedAt:old.updatedAt||nowISO()};const{data,error}=await supabaseClient.from('findat_articles').insert(articleToRow(article)).select().single();if(!error&&data)workspaceCache.articles.push(articleFromRow(data))}localStorage.setItem(`${LEGACY_WORKSPACE_KEY}.migrated`,'1')}
      async function clearSession(){stopCollaborationRealtime();if(supabaseClient)await supabaseClient.auth.signOut();activeAccount=null;window.FINDAT_ACTIVE_ACCOUNT=null;accountCache=[];directoryCache=[];collaborationCache=[];collaborationInbox=[];collaborationActivity=[];notificationFeed=[];notificationCommentArticleId='';notificationCommentReplyId='';contributorLayoutDraft=[];contributorLayoutArticleId='';contributorLayoutDirty=false;reviewSelection.clear();workspaceCache={articles:[],audit:[]}}
      function setStatus(id,message,type=''){const el=document.getElementById(id);if(!el)return;el.textContent=message||'';el.classList.remove('is-success','is-error');if(type==='success')el.classList.add('is-success');if(type==='error')el.classList.add('is-error')}
      async function addAudit(action,detail,articleId=''){const item={id:uid(),date:nowISO(),actorId:activeAccount?.id||'system',actorName:accountName(activeAccount),role:activeAccount?.role||'system',action,area:'Writing & Publication',detail,entityId:articleId};workspaceCache.audit.push(item);if(supabaseClient&&activeAccount){const{error}=await supabaseClient.rpc('findat_write_audit',{p_action:action,p_detail:detail,p_article_id:articleId||null});if(error)console.warn('FINDAT audit write failed',error)}}
      function closeAllAuthModals(){['loginPopup','signupPopup','recoveryPopup','passwordResetPopup'].forEach(id=>window.toggleModal?.(id,false))}
      function openAuthModal(id){closeAllAuthModals();window.toggleModal?.(id,true);setTimeout(()=>document.querySelector(`#${id} input, #${id} select`)?.focus(),50)}
      function readAsDataURL(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)})}
      function fileSize(size){return size<1024?`${size} B`:size<1048576?`${(size/1024).toFixed(1)} KB`:`${(size/1048576).toFixed(1)} MB`}
      function profileAvatarPath(){return activeAccount?`findat-v1/profiles/${activeAccount.id}/avatar.jpg`:''}
      function resizeAvatarFile(file){
        return new Promise((resolve,reject)=>{
          const reader=new FileReader();
          reader.onerror=()=>reject(new Error('The profile picture could not be read.'));
          reader.onload=()=>{
            const image=new Image();
            image.onerror=()=>reject(new Error('Choose a valid image file.'));
            image.onload=()=>{
              const size=384;
              const canvas=document.createElement('canvas');
              canvas.width=size;
              canvas.height=size;
              const context=canvas.getContext('2d');
              const source=Math.min(image.naturalWidth,image.naturalHeight);
              const sx=(image.naturalWidth-source)/2;
              const sy=(image.naturalHeight-source)/2;
              context.drawImage(image,sx,sy,source,source,0,0,size,size);
              canvas.toBlob(
                blob=>blob?resolve(blob):reject(new Error('The profile picture could not be prepared.')),
                'image/jpeg',
                .82
              );
            };
            image.src=String(reader.result);
          };
          reader.readAsDataURL(file);
        });
      }
      function blobAsDataURL(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(new Error('The resized profile picture could not be encoded.'));reader.readAsDataURL(blob)})}
      function renderProfilePhotoModal(){const preview=$('#fdProfilePhotoPreview');if(!preview||!activeAccount)return;preview.innerHTML=activeAccount.avatarUrl?`<img src="${escapeHTML(activeAccount.avatarUrl)}" alt="${escapeHTML(accountName(activeAccount))} profile picture">`:escapeHTML(initials(activeAccount));if($('#fdRemoveProfilePhoto'))$('#fdRemoveProfilePhoto').disabled=!activeAccount.avatarUrl;setStatus('fdProfilePhotoStatus','')}
      function updateCachedAvatar(url){activeAccount.avatarUrl=url;accountCache=accountCache.map(item=>item.id===activeAccount.id?{...item,avatarUrl:url}:item);directoryCache=directoryCache.map(item=>item.id===activeAccount.id?{...item,avatarUrl:url}:item);hydrateUser();renderProfilePhotoModal();renderAll()}
      window.addEventListener('findat-profile-updated',event=>{if(!activeAccount||!event.detail)return;activeAccount={...activeAccount,...event.detail};accountCache=accountCache.map(item=>item.id===activeAccount.id?{...item,...event.detail}:item);directoryCache=directoryCache.map(item=>item.id===activeAccount.id?{...item,...event.detail}:item);hydrateUser();renderProfilePhotoModal();renderAll();refreshDirectory().then(()=>{const current=workspaceCache.articles.find(article=>article.id===editingArticleId);renderContributorBoard(current,true);renderPublications()}).catch(console.warn)});
      async function persistProfileAvatar(url){const result=await supabaseClient.rpc('findat_set_profile_avatar',{p_avatar_url:url});if(result.error)throw result.error;return String(result.data||url||'')}
      async function uploadProfilePhoto(file){
        if(!file||!activeAccount)return;
        if(file.size>12*1024*1024){setStatus('fdProfilePhotoStatus','Choose an image smaller than 12 MB.','error');return}
        setStatus('fdProfilePhotoStatus','Preparing and uploading your profile picture…','');
        try{
          const blob=await resizeAvatarFile(file),path=profileAvatarPath();
          let url='',savedInStorage=false,storageError=null;
          try{
            const upload=await supabaseClient.storage.from('findat-documents').upload(path,blob,{upsert:true,contentType:'image/jpeg',cacheControl:'3600'});
            if(upload.error)throw upload.error;
            const publicData=supabaseClient.storage.from('findat-documents').getPublicUrl(path).data;
            if(!publicData?.publicUrl)throw new Error('The profile picture address was not returned.');
            url=`${publicData.publicUrl}?v=${Date.now()}`;
            savedInStorage=true;
          }catch(error){
            storageError=error;
            url=await blobAsDataURL(blob);
          }
          const savedUrl=await persistProfileAvatar(url);
          updateCachedAvatar(savedUrl);
          setStatus('fdProfilePhotoStatus',savedInStorage?'Profile picture saved and updated across FINDAT.':'Profile picture saved securely.','success');
        }catch(error){
          setStatus('fdProfilePhotoStatus',error.message||'The profile picture could not be uploaded. Run the latest collaboration and profile SQL update, then try again.','error')
        }finally{if($('#fdProfilePhotoInput'))$('#fdProfilePhotoInput').value=''}
      }
      async function removeProfilePhoto(){
        if(!activeAccount)return;
        setStatus('fdProfilePhotoStatus','Removing profile picture…','');
        try{
          const path=profileAvatarPath();
          try{await supabaseClient.storage.from('findat-documents').remove([path])}catch(error){console.warn('Storage avatar removal was unavailable; clearing the profile record instead.',error)}
          const result=await supabaseClient.rpc('findat_clear_profile_avatar');
          if(result.error)throw result.error;
          updateCachedAvatar('');
          setStatus('fdProfilePhotoStatus','Profile picture removed. Initials will be shown instead.','success')
        }catch(error){setStatus('fdProfilePhotoStatus',error.message||'The profile picture could not be removed.','error')}
      }
      function articleOwner(article){return accountById(article.ownerId||article.createdBy)||{id:article.ownerId||article.createdBy,displayName:article.authorName||'FINDAT Member',username:article.authorName||'FINDAT Member'}}
      function collaborationRows(articleId){return collaborationCache.filter(row=>row.article_id===articleId)}
      function isAcceptedCollaborator(articleId,userId=activeAccount?.id){return Boolean(userId)&&collaborationRows(articleId).some(row=>row.user_id===userId&&row.status==='accepted')}
      function canManageCollaborators(article){return Boolean(article&&activeAccount&&(isAdmin()||(article.ownerId||article.createdBy)===activeAccount.id||isAcceptedCollaborator(article.id,activeAccount.id)))}
      function visibleWritingArticles(){const state=loadWorkspace();if(!activeAccount)return[];if(isAdmin())return state.articles;return state.articles.filter(article=>(article.ownerId||article.createdBy)===activeAccount.id||article.publisherId===activeAccount.id||isAcceptedCollaborator(article.id))}
      function avatarMarkup(account,className='fd-profile-avatar'){
        const name=accountName(account),url=String(account?.avatarUrl||'').trim();
        return `<span class="${className}">${url?`<img src="${escapeHTML(url)}" alt="">`:escapeHTML(initials(account))}</span>`
      }
      function contributorProfiles(article){
        if(!article)return activeAccount?[activeAccount]:[];
        const owner=articleOwner(article),accepted=collaborationRows(article.id).filter(row=>row.status==='accepted').map(row=>accountById(row.user_id)).filter(Boolean);
        return [...new Map([owner,...accepted].filter(Boolean).map(item=>[item.id,item])).values()]
      }
      function qualificationSummary(value){return String(value||'').split(/\s*[|,;]\s*/).map(item=>item.trim()).filter(Boolean).slice(0,3).join(' | ')}
      function normaliseContributorLayout(article){
        const people=contributorProfiles(article),saved=Array.isArray(article?.contributorLayout)?article.contributorLayout:[];
        return people.map((person,index)=>{const old=saved.find(item=>item.userId===person.id)||{};return{userId:person.id,name:accountName(person),avatarUrl:person.avatarUrl||'',qualifications:qualificationSummary(person.qualifications||old.qualifications||''),x:Number.isFinite(Number(old.x))?Math.max(0,Math.min(88,Number(old.x))):Math.min(82,(index%3)*31+3),y:Number.isFinite(Number(old.y))?Math.max(0,Math.min(78,Number(old.y))):Math.floor(index/3)*43+6,size:Number.isFinite(Number(old.size))?Math.max(28,Math.min(64,Number(old.size))):36}})
      }
      function mergeContributorLayoutDraft(article){
        const desired=normaliseContributorLayout(article),current=new Map(contributorLayoutDraft.map(item=>[item.userId,item]));
        contributorLayoutDraft=desired.map(item=>{const existing=current.get(item.userId);return existing?{...item,x:existing.x,y:existing.y,size:existing.size}:{...item}})
      }
      function contributorSummary(article){const count=Math.max(0,(article?.contributorLayout||[]).length-1);return count?`${accountName(articleOwner(article))} with ${count} collaborator${count===1?'':'s'}`:accountName(articleOwner(article))}
      function statusTag(status){const progress=status==='Draft'||status==='Rejected';const cls=status==='Published'?'is-green':status==='Pending approval'?'is-orange':progress?'is-progress':'';const label=progress?'In progress':status||'In progress';return `<span class="fd-workspace-tag ${cls}">${escapeHTML(label)}</span>`}

      function syncPublicAuthBar(account=null){const form=$('#utilityLoginForm'),user=$('#utilityUsername'),pass=$('#utilityPassword'),button=form?.querySelector('button[type="submit"]'),register=$('#utilityRegister');if(!form||!user||!pass||!button)return;form.classList.toggle('has-session',Boolean(account));user.value='';pass.value='';if(account){user.readOnly=true;user.placeholder='Signed in';pass.placeholder='Signed in';button.textContent='Writing Desk';if(register)register.textContent='My writing desk'}else{user.readOnly=false;user.placeholder='Username';pass.placeholder='Password';button.textContent='Login';if(register)register.textContent='Register'}}
      function applyRoleVisibility(){$$('[data-role-allow]').forEach(el=>{const roles=String(el.dataset.roleAllow||'').split(',').map(normal);el.hidden=!roles.includes(activeAccount?.role)});const publish=$('#fdPublishArticle');if(publish)publish.hidden=!isAdmin()}
      function hydrateUser(){
        $$('[data-user-fullname]').forEach(el=>el.textContent=accountName(activeAccount));$$('[data-user-firstname]').forEach(el=>el.textContent=activeAccount?.firstName||activeAccount?.username||'Writer');$$('[data-user-role]').forEach(el=>el.textContent=roleLabel(activeAccount?.role));$$('[data-user-initials]').forEach(el=>{el.innerHTML=activeAccount?.avatarUrl?`<img src="${escapeHTML(activeAccount.avatarUrl)}" alt="">`:escapeHTML(initials(activeAccount))});$('#fdSidebarRole').textContent=`${roleLabel(activeAccount?.role)} workspace`;
        const intro=$('#fdWritingIntro'),saveButton=$('#fdSaveArticle');
        if(intro)intro.textContent=isAdmin()?'Write, collaborate and publish directly, or review submissions waiting for approval. You may also assign selected submissions to a Consultant publisher.':activeAccount?.role==='consultant'?'Proofread collaborative or assigned articles, improve writing and cover photographs, and publish only submissions explicitly delegated by an Administrator.':'Write articles, invite up to five collaborators, add a cover photograph, then send completed work to an Administrator for review and publication.';
        if(saveButton)saveButton.innerHTML=activeAccount?.role==='consultant'?'<i class="fas fa-save"></i> Save editorial changes':'<i class="fas fa-save"></i> Save draft';
        const reviewIntro=$('#fdReviewIntro'),authority=$('#fdReviewAuthority');
        if(reviewIntro)reviewIntro.textContent=isAdmin()?'Review, edit, approve or assign submitted writing to a Consultant publisher.':'Only articles specifically assigned to you for publication appear here.';
        if(authority)authority.innerHTML=isAdmin()?'<i class="fas fa-key"></i> Administrator approval':'<i class="fas fa-user-check"></i> Delegated publication';
      }
      async function enterDashboard(account){if(!account||account.active===false)return;activeAccount=account;window.FINDAT_ACTIVE_ACCOUNT=account;accountCache=[account];closeAllAuthModals();document.body.classList.add('dashboard-mode');dashboard?.setAttribute('aria-hidden','false');history.replaceState(null,'','#writing');syncPublicAuthBar(account);hydrateUser();applyRoleVisibility();renderAll();try{await loadAuthenticatedWorkspace();await migrateLegacyWorkspaceIfEmpty();populateCollaborators();renderAll();startCollaborationRealtime();if(activeAccount.role==='consultant'){const assigned=visibleWritingArticles()[0];if(assigned)openEditor(assigned.id);else setStatus('fdArticleStatus','No collaborative or publication-assigned article is available yet.','')}}catch(error){console.error(error);setStatus('fdArticleStatus',error.message||'The workspace could not be loaded.','error')}showView('writing');clearInterval(collaborationRefreshTimer);collaborationRefreshTimer=setInterval(async()=>{try{await refreshCollaborationState();await refreshArticles();renderAll()}catch(error){console.warn('Collaboration refresh failed',error)}},10000)}
      function leaveDashboard(showWebsite=false){document.body.classList.remove('dashboard-mode');dashboard?.setAttribute('aria-hidden','true');closeReader();history.replaceState(null,'',showWebsite?'#top':'#login');if(showWebsite)document.getElementById('top')?.scrollIntoView({behavior:'smooth'})}
      async function logout(){await clearSession();editingArticleId='';leaveDashboard(false);syncPublicAuthBar(null);await refreshPublicArticles();openAuthModal('loginPopup')}
      function showView(view){const delegated=activeAccount?.role==='consultant'&&workspaceCache.articles.some(article=>article.status==='Pending approval'&&article.publisherId===activeAccount.id);if(view==='accounts'&&!isAdmin())view='writing';if(view==='review'&&!isAdmin()&&!delegated)view='writing';$$('[data-view-panel]').forEach(panel=>panel.classList.toggle('is-active',panel.dataset.viewPanel===view));$$('[data-dashboard-view]').forEach(button=>button.classList.toggle('is-active',button.dataset.dashboardView===view));const titles={writing:'Writing Desk',review:'Review & Approval',publications:'Published Articles',accounts:'User Accounts',learning:'My Learning'};$('#fdTopbarTitle').textContent=titles[view]||'Writing Desk';$('#fdDashboardMain')?.scrollTo({top:0,behavior:'smooth'});if(view==='accounts'&&isAdmin())refreshAdminAccounts();closeSidebar()}
      function populateCollaborators(){renderContributorBoard(loadWorkspace().articles.find(article=>article.id===editingArticleId)||null)}
      function collaborationStatusLabel(status){return({pending:'Waiting for response',accepted:'Accepted',rejected:'Rejected',cancelled:'Cancelled',none:'Information'})[status]||status||'Unknown'}
      function displayNotificationRows(){
        if(notificationFeed.length)return notificationFeed.map(item=>({
          notification_id:item.notification_id,
          kind:item.kind,
          article_id:item.article_id,
          article_title:item.article_title,
          other_name:item.actor_name,
          other_avatar_url:item.actor_avatar_url,
          message:item.message,
          status:item.action_state||'none',
          is_read:item.is_read===true,
          created_at:item.created_at,
          updated_at:item.updated_at,
          direction:'incoming'
        }));
        const fallback=collaborationActivity.length?collaborationActivity:collaborationInbox.map(request=>({...request,direction:'incoming',other_name:request.inviter_name,other_avatar_url:request.inviter_avatar_url,status:'pending',updated_at:request.created_at}));
        return fallback.map(item=>({...item,kind:item.direction==='incoming'?'collaboration_request':'collaboration_response',is_read:true}));
      }
      function renderCollaborationInbox(){
        const count=$('#fdCollaborationInboxCount'),button=$('#fdCollaborationInboxButton'),list=$('#fdCollaborationInboxList');
        const unread=notificationFeed.filter(item=>item.is_read!==true).length;
        if(count){count.textContent=String(unread);count.dataset.count=String(unread)}
        button?.classList.toggle('has-unread',unread>0);
        if(!list)return;
        const rows=displayNotificationRows();
        list.innerHTML=rows.length?rows.map(request=>{
          const pending=request.kind==='collaboration_request'&&request.status==='pending';
          const person={displayName:request.other_name||'FINDAT Member',avatarUrl:request.other_avatar_url||''};
          const sentence=request.message
            ? escapeHTML(request.message)
            : request.direction==='incoming'
              ? `<strong>${escapeHTML(person.displayName||'A FINDAT member')}</strong> invited you to collaborate on <strong>“${escapeHTML(request.article_title||'Untitled paper')}”</strong>.`
              : `You invited <strong>${escapeHTML(person.displayName||'a FINDAT member')}</strong> to collaborate on <strong>“${escapeHTML(request.article_title||'Untitled paper')}”</strong>.`;
          const actions=pending?`<div class="fd-collaboration-request-actions"><button class="fd-mini-btn is-success" data-collaboration-response="accept" data-collaboration-article="${request.article_id}" type="button"><i class="fas fa-check"></i> Accept</button><button class="fd-mini-btn is-danger" data-collaboration-response="reject" data-collaboration-article="${request.article_id}" type="button"><i class="fas fa-times"></i> Reject</button></div>`:'';
          const viewLabel=request.kind==='article_comment'?'Open comments':request.article_id?'Open article':'';
          return `<article class="fd-collaboration-request is-${escapeHTML(request.status||'none')} ${request.is_read===false?'is-unread':''} ${request.article_id||request.kind==='cloud_access'?'is-clickable':''}" data-notification-article="${escapeHTML(request.article_id||'')}" data-notification-kind="${escapeHTML(request.kind||'')}" data-notification-message="${escapeHTML(request.message||'')}">${avatarMarkup(person,'fd-collaboration-avatar')}<div><p>${sentence}</p><div class="fd-collaboration-meta"><span class="fd-collaboration-status is-${escapeHTML(request.status||'none')}">${escapeHTML(collaborationStatusLabel(request.status))}</span><time>${escapeHTML(formatDate(request.updated_at||request.created_at))}</time>${viewLabel?`<button class="fd-notification-open" data-notification-open="${escapeHTML(request.article_id||'')}" data-notification-open-kind="${escapeHTML(request.kind||'')}" type="button"><i class="fas ${request.kind==='article_comment'?'fa-comments':'fa-arrow-right'}"></i> ${viewLabel}</button>`:''}</div>${actions}</div></article>`
        }).join(''):'<div class="fd-empty-request"><i class="fas fa-bell"></i>No notifications or collaboration history is available yet.</div>'
      }
      function renderNotificationCommentPopup(){
        const list=$('#fdNotificationCommentList'),article=workspaceCache.articles.find(item=>item.id===notificationCommentArticleId);
        if(!list)return;
        const comments=articleActivityCache.articleId===notificationCommentArticleId?(articleActivityCache.comments||[]):[];
        const roots=comments.filter(comment=>!comment.parent_id),repliesByParent=new Map();
        comments.filter(comment=>comment.parent_id).forEach(comment=>{const rows=repliesByParent.get(comment.parent_id)||[];rows.push(comment);repliesByParent.set(comment.parent_id,rows)});
        $('#fdNotificationCommentTitle').textContent=article?.title?`Comments — ${article.title}`:'Article comments';
        list.innerHTML=roots.length?roots.map(comment=>{const replies=repliesByParent.get(comment.id)||[];return `<article class="fd-notification-comment-thread">${activityAvatar(comment.author_name,comment.author_avatar_url)}<div><strong>${escapeHTML(comment.author_name||'FINDAT Member')}</strong><p>${escapeHTML(comment.body||'')}</p><time>${escapeHTML(formatTime(comment.created_at))}</time><button class="fd-notification-reply-button" data-notification-reply="${comment.id}" data-notification-reply-author="${escapeHTML(comment.author_name||'FINDAT Member')}" type="button"><i class="fas fa-reply"></i> Reply</button>${replies.length?`<div class="fd-notification-comment-replies">${replies.map(reply=>`<article>${activityAvatar(reply.author_name,reply.author_avatar_url)}<div><strong>${escapeHTML(reply.author_name||'FINDAT Member')}</strong><p>${escapeHTML(reply.body||'')}</p><time>${escapeHTML(formatTime(reply.created_at))}</time><button class="fd-notification-reply-button" data-notification-reply="${comment.id}" data-notification-reply-author="${escapeHTML(reply.author_name||'FINDAT Member')}" type="button"><i class="fas fa-reply"></i> Reply</button></div></article>`).join('')}</div>`:''}</div></article>`}).join(''):'<div class="fd-empty-request"><i class="fas fa-comments"></i>No comments are available for this article yet.</div>';
        const label=$('#fdNotificationReplyLabel'),cancel=$('#fdNotificationReplyCancel');
        if(label)label.textContent=notificationCommentReplyId?'Replying to a comment':'';
        if(cancel)cancel.hidden=!notificationCommentReplyId
      }
      async function openNotificationItem(articleId,kind=''){
        if(!articleId)return;
        let article=workspaceCache.articles.find(item=>item.id===articleId);
        if(!article){try{await refreshArticles();article=workspaceCache.articles.find(item=>item.id===articleId)}catch(error){console.warn(error)}}
        if(!article){setStatus('fdCollaborationInboxStatus','The related article is no longer available.','error');return}
        if(kind==='article_comment'){
          notificationCommentArticleId=articleId;notificationCommentReplyId='';if($('#fdNotificationCommentInput'))$('#fdNotificationCommentInput').value='';
          window.toggleModal?.('fdCollaborationInboxModal',false);setStatus('fdNotificationCommentStatus','Loading comments…','');
          try{await refreshArticleActivity(articleId);renderNotificationCommentPopup();setStatus('fdNotificationCommentStatus','');window.toggleModal?.('fdNotificationCommentModal',true)}
          catch(error){setStatus('fdCollaborationInboxStatus',error.message||'Comments could not be opened.','error')}
          return
        }
        window.toggleModal?.('fdCollaborationInboxModal',false);openEditor(articleId)
      }
      async function sendNotificationComment(){
        const input=$('#fdNotificationCommentInput'),body=String(input?.value||'').trim();
        if(!notificationCommentArticleId||!body){setStatus('fdNotificationCommentStatus','Enter a response first.','error');return}
        const button=$('#fdNotificationCommentSend');if(button)button.disabled=true;setStatus('fdNotificationCommentStatus','Saving response…','');
        try{const result=await supabaseClient.rpc('findat_add_article_comment',{p_article_id:notificationCommentArticleId,p_body:body,p_parent_id:notificationCommentReplyId||null});if(result.error)throw result.error;if(input)input.value='';notificationCommentReplyId='';await Promise.all([refreshArticleActivity(notificationCommentArticleId),refreshCollaborationState()]);renderNotificationCommentPopup();setStatus('fdNotificationCommentStatus','Response saved and participants notified.','success')}
        catch(error){setStatus('fdNotificationCommentStatus',error.message||'The response could not be saved.','error')}
        finally{if(button)button.disabled=false}
      }
      async function markNotificationsRead(){
        const ids=notificationFeed.filter(item=>item.is_read!==true).map(item=>item.notification_id).filter(Boolean);
        if(!ids.length)return 0;
        const result=await supabaseClient.rpc('findat_mark_notifications_read',{p_notification_ids:ids});
        if(result.error)throw result.error;
        notificationFeed=notificationFeed.map(item=>ids.includes(item.notification_id)?{...item,is_read:true}:item);
        renderCollaborationInbox();
        return Number(result.data)||0
      }
      async function clearNotificationHistory(){
        setStatus('fdCollaborationInboxStatus','Clearing completed notification history…','');
        const result=await supabaseClient.rpc('findat_clear_notification_history');
        if(result.error){setStatus('fdCollaborationInboxStatus',result.error.message||'Notification history could not be cleared.','error');return}
        await refreshCollaborationState();
        setStatus('fdCollaborationInboxStatus',`${Number(result.data)||0} completed notification${Number(result.data)===1?'':'s'} cleared. Unanswered requests remain available.`,'success')
      }
      function renderArticleCollaborationNotice(article){
        const host=$('#fdArticleCollaborationNotice');if(!host)return;
        host.className='fd-collaboration-article-notice';host.innerHTML='';
        if(!activeAccount)return;
        if(!article){
          const pending=notificationFeed.filter(item=>item.kind==='collaboration_request'&&item.action_state==='pending');
          if(pending.length){host.classList.add('is-visible');host.innerHTML=`<strong><i class="fas fa-bell"></i> ${pending.length} collaboration request${pending.length===1?' is':'s are'} waiting.</strong> Open the notification bell to accept or reject.`}
          return
        }
        const ownerId=article.ownerId||article.createdBy;
        const rows=collaborationRows(article.id);
        const own=rows.find(row=>row.user_id===activeAccount.id);
        if(own?.status==='accepted'&&ownerId!==activeAccount.id){
          host.classList.add('is-visible','is-success');host.innerHTML=`<strong>You accepted the collaboration request for this article.</strong> Your edits are shared with ${escapeHTML(accountName(articleOwner(article)))} and the other accepted collaborators.`;return
        }
        if(ownerId===activeAccount.id||isAdmin()){
          const pending=rows.filter(row=>row.status==='pending').length,accepted=rows.filter(row=>row.status==='accepted').length;
          if(pending||accepted){host.classList.add('is-visible',accepted?'is-success':'');host.innerHTML=`<strong>${accepted} accepted collaborator${accepted===1?'':'s'}.</strong>${pending?` ${pending} invitation${pending===1?' is':'s are'} waiting for a response.`:''}`}
        }
      }
      function renderActiveCollaborators(article){
        const host=$('#fdActiveCollaborators'),count=$('#fdCollaboratorCount');if(!host)return;
        const rows=article?collaborationRows(article.id):[];
        if(count)count.textContent=`${rows.filter(row=>row.status==='pending'||row.status==='accepted').length} / 5`;
        host.innerHTML=rows.length?rows.map(row=>{const person=accountById(row.user_id)||{id:row.user_id,displayName:'FINDAT Member'};return `<span class="fd-collaborator-chip is-${escapeHTML(row.status)}">${avatarMarkup(person)}${escapeHTML(accountName(person))} · ${escapeHTML(row.status)}</span>`}).join(''):'<span class="fd-collaborator-chip">No collaborators selected</span>'
      }
      function renderContributorBoard(article,force=false){
        const board=$('#fdContributorLayoutBoard');if(!board)return;
        const editable=Boolean(activeAccount&&(article?(isAdmin()||(article.ownerId||article.createdBy)===activeAccount.id):activeAccount.role!=='consultant'));
        const articleId=article?.id||'';
        if(force||articleId!==contributorLayoutArticleId||!contributorLayoutDirty){contributorLayoutDraft=article?normaliseContributorLayout(article):(activeAccount?[{userId:activeAccount.id,name:accountName(activeAccount),avatarUrl:activeAccount.avatarUrl||'',x:4,y:8,size:36}]:[]);contributorLayoutArticleId=articleId;contributorLayoutDirty=false}else if(article)mergeContributorLayoutDraft(article)
        board.classList.toggle('is-readonly',!editable);const collaboratorButton=$('#fdCollaboratorButton');if(collaboratorButton){collaboratorButton.disabled=false;collaboratorButton.setAttribute('aria-disabled','false');collaboratorButton.title=article&&!canManageCollaborators(article)?'Open the collaborator directory. Only the article author or an Administrator can send or change requests for this paper.':'Choose from active FINDAT users.'}
        board.innerHTML=contributorLayoutDraft.map(item=>`<div class="fd-contributor-card" data-contributor-id="${item.userId}" style="left:${item.x}%;top:${item.y}%;--contributor-size:${item.size}px">${avatarMarkup({displayName:item.name,avatarUrl:item.avatarUrl,username:item.name})}<span class="fd-contributor-name"><strong>${escapeHTML(item.name)}</strong>${item.qualifications?`<small>${escapeHTML(item.qualifications)}</small>`:''}</span><span class="fd-contributor-size-controls"><button data-contributor-size="-1" type="button" aria-label="Make smaller">−</button><button data-contributor-size="1" type="button" aria-label="Make larger">+</button></span></div>`).join('');
        if(editable)enableContributorDragging(board);
        renderActiveCollaborators(article);renderArticleCollaborationNotice(article)
      }
      function enableContributorDragging(board){
        board.querySelectorAll('.fd-contributor-card').forEach(card=>{
          card.addEventListener('pointerdown',event=>{
            if(event.target.closest('[data-contributor-size]'))return;
            const rect=board.getBoundingClientRect(),cardRect=card.getBoundingClientRect(),offsetX=event.clientX-cardRect.left,offsetY=event.clientY-cardRect.top;
            card.setPointerCapture?.(event.pointerId);
            const move=moveEvent=>{
              const x=Math.max(0,Math.min(rect.width-card.offsetWidth,moveEvent.clientX-rect.left-offsetX)),y=Math.max(0,Math.min(rect.height-card.offsetHeight,moveEvent.clientY-rect.top-offsetY));
              card.style.left=`${x/rect.width*100}%`;card.style.top=`${y/rect.height*100}%`;
              const item=contributorLayoutDraft.find(row=>row.userId===card.dataset.contributorId);if(item){item.x=Number((x/rect.width*100).toFixed(2));item.y=Number((y/rect.height*100).toFixed(2));contributorLayoutDirty=true}
            };
            const up=()=>{card.removeEventListener('pointermove',move);card.removeEventListener('pointerup',up);card.removeEventListener('pointercancel',up)};
            card.addEventListener('pointermove',move);card.addEventListener('pointerup',up);card.addEventListener('pointercancel',up)
          })
        })
      }
      function renderReaderContributors(article){
        const host=$('#fdReaderContributors');if(!host)return;
        const owner=articleOwner(article);
        const layout=(Array.isArray(article.contributorLayout)&&article.contributorLayout.length)?article.contributorLayout:[{userId:article.ownerId,name:article.authorName||accountName(owner),avatarUrl:owner?.avatarUrl||'',qualifications:qualificationSummary(owner?.qualifications||''),size:38}];
        host.innerHTML=layout.map(item=>`<div class="fd-contributor-card" style="--contributor-size:${Math.max(28,Math.min(64,Number(item.size)||36))}px">${avatarMarkup({displayName:item.name,avatarUrl:item.avatarUrl,username:item.name})}<span class="fd-contributor-name"><strong>${escapeHTML(item.name||'FINDAT Member')}</strong>${item.qualifications?`<small>${escapeHTML(qualificationSummary(item.qualifications))}</small>`:''}</span></div>`).join('')
      }
      async function ensureArticleForCollaboration(){
        let article=workspaceCache.articles.find(row=>row.id===editingArticleId);if(article)return article;
        const data=collectArticle('Draft');if(!data)return null;
        if(activeAccount?.role==='consultant'){setStatus('fdCollaboratorStatus','Consultants cannot create a new paper. Open an existing collaborative paper first.','error');return null}
        article={id:uid(),ownerId:activeAccount.id,createdBy:activeAccount.id,createdAt:nowISO(),...data};editingArticleId=article.id;
        const result=await supabaseClient.from('findat_articles').insert(articleToRow(article)).select().single();if(result.error)throw result.error;
        article=articleFromRow(result.data);workspaceCache.articles.push(article);renderLibrary();return article
      }
      async function openCollaboratorPicker(){
        setStatus('fdCollaboratorStatus','Loading the FINDAT user directory…','');
        const list=$('#fdCollaboratorProfileList'),saveButton=$('#fdSaveCollaborators');
        if(list)list.innerHTML='<div class="fd-empty-request"><i class="fas fa-spinner fa-spin"></i>Loading active users…</div>';
        window.toggleModal?.('fdCollaboratorModal',true);
        try{
          await refreshDirectory();
          const article=workspaceCache.articles.find(row=>row.id===editingArticleId)||null;
          const selected=new Set(article?collaborationRows(article.id).filter(row=>row.status==='pending'||row.status==='accepted').map(row=>row.user_id):[]);
          const people=accountCache.filter(person=>person.id!==activeAccount?.id&&person.active!==false);
          if(list)list.innerHTML=people.length?people.map(person=>`<label class="fd-profile-option ${selected.has(person.id)?'is-selected':''}" data-profile-id="${person.id}"><input type="checkbox" ${selected.has(person.id)?'checked':''}>${avatarMarkup(person)}<strong>${escapeHTML(accountName(person))}</strong><span class="fd-profile-check"><i class="fas fa-check"></i></span></label>`).join(''):'<div class="fd-empty-request"><i class="fas fa-users-slash"></i>No other active FINDAT users are available.</div>';
          const maySend=article?canManageCollaborators(article):activeAccount?.role!=='consultant';
          if(saveButton){saveButton.disabled=!maySend;saveButton.title=maySend?'Send collaboration requests to the selected people.':'You may view the directory, but only the paper author or an Administrator can change this paper’s collaborators.'}
          updateCollaboratorSelectionCount();
          if(!maySend)setStatus('fdCollaboratorStatus',article?'You can view everyone, but only the paper author or an Administrator can change this paper’s collaboration group.':'Open a collaborative or assigned paper before sending requests.','');
          else if(!article)setStatus('fdCollaboratorStatus','Choose up to five people. When requests are sent, FINDAT will save the current paper as a draft first.','');
          else setStatus('fdCollaboratorStatus','Choose any active Client, Consultant or Administrator. Names are shown without role labels.','');
        }catch(error){
          if(list)list.innerHTML='<div class="fd-empty-request"><i class="fas fa-exclamation-circle"></i>The user directory could not be loaded.</div>';
          if(saveButton)saveButton.disabled=true;
          setStatus('fdCollaboratorStatus',error.message||'Collaborators could not be loaded.','error')
        }
      }
      function updateCollaboratorSelectionCount(){
        const checked=$$('#fdCollaboratorProfileList input:checked'),count=checked.length;
        if($('#fdCollaboratorSelectionCount'))$('#fdCollaboratorSelectionCount').textContent=String(count);
        if($('#fdCollaboratorCount'))$('#fdCollaboratorCount').textContent=`${count} / 5`;
        $$('#fdCollaboratorProfileList .fd-profile-option').forEach(option=>option.classList.toggle('is-selected',option.querySelector('input')?.checked));
        return count
      }
      async function saveCollaborators(){
        let article=workspaceCache.articles.find(row=>row.id===editingArticleId)||null;
        if(article&&!canManageCollaborators(article)){setStatus('fdCollaboratorStatus','Only the paper author, an accepted collaborator or an Administrator can change this collaboration group.','error');return}
        if(!article){
          try{article=await ensureArticleForCollaboration()}catch(error){setStatus('fdCollaboratorStatus',error.message||'The draft could not be prepared.','error');return}
          if(!article){setStatus('fdCollaboratorStatus','Add an article title and some writing first, then send the collaboration requests.','error');return}
        }
        const ids=$$('#fdCollaboratorProfileList input:checked').map(input=>input.closest('[data-profile-id]')?.dataset.profileId).filter(Boolean);
        if(ids.length>5){setStatus('fdCollaboratorStatus','Select no more than five collaborators.','error');return}
        setStatus('fdCollaboratorStatus','Sending collaboration requests…','');
        const button=$('#fdSaveCollaborators');if(button)button.disabled=true;
        try{
          const result=await supabaseClient.rpc('findat_manage_article_collaborators',{p_article_id:article.id,p_user_ids:ids});
          if(result.error)throw result.error;
          const activeRows=(result.data||[]).filter(row=>row.status==='pending'||row.status==='accepted');
          await Promise.all([refreshCollaborationState(),refreshArticles()]);
          article=workspaceCache.articles.find(row=>row.id===article.id)||article;
          article.contributorLayout=normaliseContributorLayout(article);
          contributorLayoutDraft=article.contributorLayout.map(item=>({...item}));
          contributorLayoutArticleId=article.id;
          contributorLayoutDirty=true;
          renderContributorBoard(article);
          window.toggleModal?.('fdCollaboratorModal',false);
          setStatus('fdArticleStatus',`${activeRows.length} collaborator${activeRows.length===1?'':'s'} saved. New selections received a notification request.`,activeRows.length?'success':'')
        }catch(error){
          setStatus('fdCollaboratorStatus',error.message||'Requests could not be sent. Run the latest collaboration, notifications and profile SQL update, then try again.','error')
        }finally{if(button)button.disabled=false}
      }
      async function respondCollaboration(articleId,accept,button=null){
        const original=button?.innerHTML||'';
        if(button){button.disabled=true;button.innerHTML='<i class="fas fa-spinner fa-spin"></i> Saving…'}
        try{
          const result=await supabaseClient.rpc('findat_respond_collaboration',{p_article_id:articleId,p_accept:Boolean(accept)});
          if(result.error)throw result.error;
          await Promise.all([refreshCollaborationState(),refreshArticles()]);
          renderAll();
          setStatus('fdCollaborationInboxStatus',accept?'Collaboration request accepted. The paper is now available in your Writing Desk.':'Collaboration request rejected. The response has been saved.','success');
          if(accept){const article=workspaceCache.articles.find(row=>row.id===articleId);if(article){window.toggleModal?.('fdCollaborationInboxModal',false);openEditor(article.id)}}
        }catch(error){
          setStatus('fdCollaborationInboxStatus',error.message||'The request could not be updated. Run the latest collaboration SQL update and try again.','error');
          if(button){button.disabled=false;button.innerHTML=original}
        }
      }
      function updateReviewSelection(){
        const valid=new Set(workspaceCache.articles.filter(article=>article.status==='Pending approval').map(article=>article.id));for(const id of [...reviewSelection])if(!valid.has(id))reviewSelection.delete(id);
        if($('#fdReviewSelectedCount'))$('#fdReviewSelectedCount').textContent=String(reviewSelection.size);if($('#fdAssignPublisherButton'))$('#fdAssignPublisherButton').disabled=!reviewSelection.size
      }
      function openPublisherPicker(){
        if(!isAdmin()||!reviewSelection.size)return;const consultants=accountCache.filter(person=>person.role==='consultant'&&person.active!==false),list=$('#fdPublisherProfileList');
        list.innerHTML=consultants.length?consultants.map(person=>`<button class="fd-profile-option" data-publisher-id="${person.id}" type="button">${avatarMarkup(person)}<strong>${escapeHTML(accountName(person))}</strong><span class="fd-profile-check"><i class="fas fa-arrow-right"></i></span></button>`).join(''):'<div class="fd-empty-request"><i class="fas fa-user-tie"></i>No active Consultant account is available.</div>';setStatus('fdPublisherStatus','');window.toggleModal?.('fdPublisherModal',true)
      }
      async function assignPublisher(consultantId){
        setStatus('fdPublisherStatus','Assigning publication authority…','');const result=await supabaseClient.rpc('findat_assign_article_publisher',{p_article_ids:[...reviewSelection],p_consultant_id:consultantId});
        if(result.error){setStatus('fdPublisherStatus',result.error.message||'The publisher could not be assigned.','error');return}
        reviewSelection.clear();await refreshArticles();renderAll();window.toggleModal?.('fdPublisherModal',false);setStatus('fdArticleStatus',`${Number(result.data)||0} article(s) assigned to the selected Consultant publisher.`,'success')
      }
      async function publishDelegatedArticle(id){
        if(activeAccount?.role!=='consultant')return;if(!confirm('Publish this Administrator-assigned article now?'))return;
        const result=await supabaseClient.rpc('findat_publish_assigned_article',{p_article_id:id});if(result.error){alert(result.error.message||'The assigned article could not be published.');return}
        const converted=articleFromRow(Array.isArray(result.data)?result.data[0]:result.data),index=workspaceCache.articles.findIndex(article=>article.id===id);if(index>=0)workspaceCache.articles[index]=converted;await addAudit('Assigned article published by Consultant',converted.title,id);renderAll();if(currentReaderArticleId===id)openReader(id)
      }
      function renderCounters(){const state=loadWorkspace(),mine=visibleWritingArticles(),reviewCount=isAdmin()?state.articles.filter(a=>a.status==='Pending approval'&&!a.publisherId).length:state.articles.filter(a=>a.status==='Pending approval'&&a.publisherId===activeAccount?.id).length;$('#fdDraftCount').textContent=String(mine.filter(a=>(a.status||'Draft')==='Draft'||a.status==='Rejected').length);$('#fdPendingCount').textContent=String(mine.filter(a=>a.status==='Pending approval').length);$('#fdPublishedCount').textContent=String(mine.filter(a=>a.status==='Published').length);$('#fdDraftNavCount').textContent=String(mine.filter(a=>a.status!=='Published').length);$('#fdReviewNavCount').textContent=String(reviewCount);$('#fdPublicationNavCount').textContent=String(state.articles.filter(a=>a.status==='Published').length);const reviewNav=$('[data-dashboard-view="review"]');if(reviewNav&&activeAccount?.role==='consultant')reviewNav.hidden=reviewCount===0;if($('#fdAccountNavCount'))$('#fdAccountNavCount').textContent=isAdmin()?String(accountCache.length):'0';updateReviewSelection()}
      function renderStatusBanner(article){const host=$('#fdArticleStatusBanner');if(!host)return;if(!article){host.innerHTML='';return}if(article.status==='Rejected')host.innerHTML=`<div class="fd-status-banner is-progress"><strong>In progress — returned for revision.</strong><br>${escapeHTML(article.reviewNote||'Please revise the article and submit it again.')}</div>`;else if(article.status==='Pending approval'){if(isAdmin())host.innerHTML='<div class="fd-status-banner"><strong>Awaiting administrator decision.</strong><br>Edit the submission, delete it, return it for revision, publish it, or assign a Consultant publisher.</div>';else if((article.ownerId||article.createdBy)===activeAccount?.id)host.innerHTML='<div class="fd-status-banner"><strong>Awaiting administrator approval.</strong><br>Saving as a draft returns the paper to your writing library for further revision.</div>';else host.innerHTML='<div class="fd-status-banner"><strong>This paper is awaiting approval.</strong><br>Your collaborative editorial changes remain attached to the submitted paper.</div>'}else if(article.status==='Published')host.innerHTML='<div class="fd-status-banner" style="background:#eaf7ef;color:#26774f"><strong>This article is published.</strong><br>Only an administrator can republish changes.</div>';else host.innerHTML='<div class="fd-status-banner is-progress"><strong>In progress.</strong><br>Changes, comments and collaborator activity are saved with date and time.</div>'}
      function renderCover(){const host=$('#fdArticleImagePreview');if(!host)return;host.innerHTML=pendingCover?.data?`<img src="${pendingCover.data}" alt="Selected cover photo">`:'<span><i class="far fa-image"></i><br>No cover photo selected</span>';const canEditAttachments=isAdmin()||activeAccount?.role==='consultant';$('#fdArticleAttachmentList').innerHTML=pendingAttachments.length?pendingAttachments.map((file,index)=>canEditAttachments?`<button class="fd-attachment-chip" type="button" data-remove-attachment="${index}" title="Remove attachment"><i class="fas fa-paperclip"></i>${escapeHTML(file.name)} <span>×</span></button>`:`<span class="fd-attachment-chip"><i class="fas fa-paperclip"></i>${escapeHTML(file.name)}</span>`).join(''):'<span style="font-size:9px;color:#98a2b0">No documents attached</span>'}
      function renderLibrary(){const query=normal($('#fdDashboardSearch')?.value),articles=visibleWritingArticles().filter(a=>a.status!=='Published').slice().sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt)).filter(a=>!query||normal(`${a.title} ${a.subtitle} ${a.category} ${stripHTML(a.content)}`).includes(query));$('#fdArticleLibrary').innerHTML=articles.length?articles.map(article=>`<article class="fd-library-item ${editingArticleId===article.id?'is-selected':''}"><div class="fd-library-item-head"><div><h4>${escapeHTML(article.title||'Untitled article')}</h4><p>${escapeHTML(article.category||'Article')} · ${escapeHTML(formatTime(article.updatedAt||article.createdAt))}</p></div>${statusTag(article.status||'Draft')}</div><p style="font-size:8px;color:#7e8a9b;line-height:1.5;margin:8px 0">${escapeHTML((article.subtitle||stripHTML(article.content)).slice(0,105))}${(article.subtitle||stripHTML(article.content)).length>105?'…':''}</p><div class="fd-library-item-actions"><button class="fd-mini-btn" type="button" data-article-open-editor="${article.id}">Open</button><button class="fd-mini-btn" type="button" data-article-preview="${article.id}">Preview</button>${isAdmin()?`<button class="fd-mini-btn is-danger" type="button" data-article-delete="${article.id}">Delete</button>`:''}</div></article>`).join(''):'<div class="fd-empty-compact"><i class="fas fa-feather-alt"></i>No articles yet. Start your first piece above.</div>'}
      function renderReview(){const pending=loadWorkspace().articles.filter(a=>a.status==='Pending approval'&&(isAdmin()?!a.publisherId:a.publisherId===activeAccount?.id)).sort((a,b)=>new Date(a.submittedAt)-new Date(b.submittedAt));$('#fdApprovalQueue').innerHTML=pending.length?pending.map(article=>{const publisher=article.publisherId?accountById(article.publisherId):null;return `<article class="fd-review-item ${reviewSelection.has(article.id)?'is-selected':''}">${isAdmin()?`<label class="fd-review-select"><input data-review-select="${article.id}" type="checkbox" ${reviewSelection.has(article.id)?'checked':''}></label>`:''}<div class="fd-review-thumb">${article.image?.data?`<img src="${article.image.data}" alt="">`:'<i class="fas fa-file-alt"></i>'}</div><div class="fd-review-copy"><h3>${escapeHTML(article.title)}</h3><p>${escapeHTML(article.subtitle||stripHTML(article.content).slice(0,150))}</p><p style="margin-top:5px">By ${escapeHTML(contributorSummary(article))} · submitted ${escapeHTML(formatTime(article.submittedAt))}</p><p class="fd-review-publisher">Publisher: <strong>${escapeHTML(publisher?accountName(publisher):'Administrator')}</strong></p></div><div class="fd-review-actions"><button class="fd-mini-btn" type="button" data-article-preview="${article.id}"><i class="fas fa-eye"></i> Review</button><button class="fd-mini-btn" type="button" data-article-open-editor="${article.id}"><i class="fas fa-edit"></i> Edit</button>${isAdmin()?`<button class="fd-mini-btn is-success" type="button" data-article-approve="${article.id}"><i class="fas fa-check"></i> Approve</button><button class="fd-mini-btn is-danger" type="button" data-article-return="${article.id}"><i class="fas fa-undo"></i> Return</button><button class="fd-mini-btn is-danger" type="button" data-article-delete="${article.id}"><i class="fas fa-trash"></i> Delete</button>`:`<button class="fd-mini-btn is-success" type="button" data-delegated-publish="${article.id}"><i class="fas fa-globe"></i> Publish assigned article</button>`}</div></article>`}).join(''):'<div class="fd-empty-large"><i class="fas fa-check-circle"></i>No articles are waiting in this publication queue.</div>';updateReviewSelection()}
      function renderPublications(){const published=loadWorkspace().articles.filter(a=>a.status==='Published').sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt));$('#fdPublicationGrid').innerHTML=published.length?published.map(article=>`<article class="fd-publication-card"><div class="fd-publication-cover">${article.image?.data?`<img src="${article.image.data}" alt="${escapeHTML(article.title)}">`:'<i class="fas fa-newspaper"></i>'}</div><div class="fd-publication-body"><span class="fd-workspace-tag is-green">${escapeHTML(article.category||'Published')}</span><h3>${escapeHTML(article.title)}</h3><p>${escapeHTML(article.subtitle||stripHTML(article.content).slice(0,180))}${(article.subtitle||stripHTML(article.content)).length>180?'…':''}</p><p style="margin-top:9px;font-size:8px">By ${escapeHTML(contributorSummary(article))} · ${escapeHTML(formatDate(article.publishedAt))}</p><div class="fd-library-item-actions"><button class="fd-mini-btn" type="button" data-article-preview="${article.id}">Read article</button>${isAdmin()?`<button class="fd-mini-btn is-danger" type="button" data-article-unpublish="${article.id}"><i class="fas fa-eye-slash"></i> Unpublish</button><button class="fd-mini-btn is-danger" type="button" data-article-delete="${article.id}"><i class="fas fa-trash"></i> Delete</button>`:''}</div></div></article>`).join(''):'<div class="fd-empty-large" style="grid-column:1/-1"><i class="fas fa-newspaper"></i>No articles have been published yet.</div>'}
      function publicationTopics(article){
        const source=[article.category,article.template==='research'?'Research':article.template==='report'?'Report':article.template==='newsletter'?'Newsletter':'Article'];
        return [...new Set(source.filter(Boolean).map(value=>String(value).trim()))].slice(0,3)
      }
      function renderHomepagePublications(){
        const list=$('#homePublicationList'),count=$('#homePublicationCount'),type=$('#homePublicationType');
        if(!list||!count||!type)return;
        const currentType=type.value;
        const published=loadWorkspace().articles.filter(article=>article.status==='Published').sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0));
        const categories=[...new Set(published.map(article=>String(article.category||'Article').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
        type.innerHTML='<option value="">All publication types</option>'+categories.map(category=>`<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join('');
        if(categories.includes(currentType))type.value=currentType;
        const query=normal($('#homePublicationSearch')?.value),selected=normal(type.value);
        const visible=published.filter(article=>{
          const owner=contributorSummary(article);
          const haystack=normal(`${article.title} ${article.subtitle} ${article.category} ${owner} ${stripHTML(article.content)} ${publicationTopics(article).join(' ')}`);
          return(!query||haystack.includes(query))&&(!selected||normal(article.category||'Article')===selected)
        });
        count.textContent=`${visible.length} publication${visible.length===1?'':'s'}`;
        list.innerHTML=visible.length?visible.map(article=>{
          const excerpt=article.subtitle||stripHTML(article.content).slice(0,245);
          const topics=publicationTopics(article);
          return `<article class="home-publication-card" tabindex="0" role="button" aria-label="Open ${escapeHTML(article.title)}" data-article-preview="${article.id}"><div class="home-publication-cover">${article.image?.data?`<img src="${article.image.data}" alt="Cover for ${escapeHTML(article.title)}">`:'<i class="fas fa-file-alt" aria-hidden="true"></i>'}</div><div class="home-publication-copy"><span class="home-publication-type"><i class="fas fa-book-open" aria-hidden="true"></i>${escapeHTML(article.category||'Article')}</span><h3>${escapeHTML(article.title||'Untitled publication')}</h3><p class="home-publication-meta">${escapeHTML(formatDate(article.publishedAt))} · ${escapeHTML(contributorSummary(article))}</p><p class="home-publication-excerpt">${escapeHTML(excerpt)}${excerpt.length>=245?'…':''}</p><div class="home-publication-tags">${topics.map(topic=>`<span>${escapeHTML(topic)}</span>`).join('')}</div></div><span class="home-publication-arrow" aria-hidden="true"><i class="fas fa-arrow-right"></i></span></article>`
        }).join(''):`<div class="home-publications-empty"><i class="fas fa-book-open"></i><strong>${published.length?'No publications match these filters.':'No publications have been released yet.'}</strong><span>${published.length?'Try another keyword or clear the filters.':'Approved articles will appear here automatically.'}</span></div>`
      }


      async function refreshArticleActivity(articleId){
        if(!supabaseClient||!activeAccount||!articleId){articleActivityCache={articleId:'',revisions:[],comments:[]};renderArticleActivity(null);return}
        const [revisionsResult,commentsResult]=await Promise.all([
          supabaseClient.from('findat_article_revisions').select('id,article_id,actor_id,actor_name,actor_avatar_url,actor_qualifications,summary,changed_fields,created_at').eq('article_id',articleId).order('created_at',{ascending:false}).limit(80),
          supabaseClient.from('findat_article_comments').select('id,article_id,author_id,parent_id,author_name,author_avatar_url,author_qualifications,body,created_at,updated_at,deleted_at').eq('article_id',articleId).order('created_at',{ascending:true}).limit(200)
        ]);
        if(revisionsResult.error)throw revisionsResult.error;
        if(commentsResult.error)throw commentsResult.error;
        articleActivityCache={articleId,revisions:revisionsResult.data||[],comments:commentsResult.data||[]};
        renderArticleActivity(workspaceCache.articles.find(article=>article.id===articleId)||null)
      }
      function activityAvatar(name,url){return avatarMarkup({displayName:name||'FINDAT Member',avatarUrl:url||'',username:name||'FINDAT Member'})}
      function renderArticleActivity(article){
        const host=$('#fdArticleActivity'),composer=$('#fdCommentComposer');if(!host)return;
        if(!article){host.innerHTML='<div class="fd-activity-empty"><i class="fas fa-history"></i> Save or open an article to view changes and comments.</div>';if(composer)composer.hidden=true;return}
        if(composer)composer.hidden=false;
        if(articleActivityCache.articleId!==article.id){host.innerHTML='<div class="fd-activity-empty"><i class="fas fa-spinner fa-spin"></i> Loading project activity…</div>';return}
        const revisions=articleActivityCache.revisions||[],comments=articleActivityCache.comments||[],roots=comments.filter(comment=>!comment.parent_id),repliesByParent=new Map();
        comments.filter(comment=>comment.parent_id).forEach(comment=>{const list=repliesByParent.get(comment.parent_id)||[];list.push(comment);repliesByParent.set(comment.parent_id,list)});
        const revisionHTML=revisions.length?`<div class="fd-activity-section"><strong class="fd-activity-heading">Recent changes</strong>${revisions.map(item=>`<article class="fd-activity-event">${activityAvatar(item.actor_name,item.actor_avatar_url)}<div><strong>${escapeHTML(item.actor_name||'FINDAT Member')}</strong>${item.actor_qualifications?` <small>${escapeHTML(qualificationSummary(item.actor_qualifications))}</small>`:''}<p>${escapeHTML(item.summary||'Updated the article')}</p><time>${escapeHTML(formatTime(item.created_at))}</time></div></article>`).join('')}</div>`:'';
        const commentHTML=roots.length?`<div class="fd-activity-section"><strong class="fd-activity-heading">Comments</strong>${roots.map(comment=>{const replies=repliesByParent.get(comment.id)||[];return `<article class="fd-comment-thread">${activityAvatar(comment.author_name,comment.author_avatar_url)}<div><strong>${escapeHTML(comment.author_name||'FINDAT Member')}</strong>${comment.author_qualifications?` <small>${escapeHTML(qualificationSummary(comment.author_qualifications))}</small>`:''}<p>${escapeHTML(comment.body||'')}</p><time>${escapeHTML(formatTime(comment.created_at))}</time><div class="fd-comment-actions"><button data-comment-reply="${comment.id}" data-comment-author="${escapeHTML(comment.author_name||'FINDAT Member')}" type="button"><i class="fas fa-reply"></i> Reply</button>${comment.author_id===activeAccount?.id||isAdmin()?`<button data-comment-delete="${comment.id}" type="button"><i class="fas fa-trash"></i> Remove</button>`:''}</div></div>${replies.length?`<div class="fd-comment-replies">${replies.map(reply=>`<div class="fd-comment-reply">${activityAvatar(reply.author_name,reply.author_avatar_url)}<div><strong>${escapeHTML(reply.author_name||'FINDAT Member')}</strong><p>${escapeHTML(reply.body||'')}</p><time>${escapeHTML(formatTime(reply.created_at))}</time><div class="fd-comment-actions">${reply.author_id===activeAccount?.id||isAdmin()?`<button data-comment-delete="${reply.id}" type="button"><i class="fas fa-trash"></i> Remove</button>`:''}</div></div></div>`).join('')}</div>`:''}</article>`}).join('')}</div>`:'';
        host.innerHTML=revisionHTML+commentHTML||'<div class="fd-activity-empty"><i class="fas fa-comments"></i> No recorded changes or comments yet.</div>'
      }
      function setCommentReply(parentId='',authorName=''){
        articleCommentReplyId=parentId||'';const label=$('#fdCommentReplyLabel'),cancel=$('#fdCancelCommentReply');if(label)label.textContent=articleCommentReplyId?`Replying to ${authorName||'comment'}`:'';if(cancel)cancel.hidden=!articleCommentReplyId;$('#fdArticleCommentInput')?.focus()
      }
      async function addArticleComment(){
        const article=workspaceCache.articles.find(item=>item.id===editingArticleId),input=$('#fdArticleCommentInput'),body=String(input?.value||'').trim();if(!article){setStatus('fdArticleActivityStatus','Open or save an article before adding a comment.','error');return}if(!body){setStatus('fdArticleActivityStatus','Enter a comment first.','error');return}
        const button=$('#fdAddArticleComment');if(button)button.disabled=true;setStatus('fdArticleActivityStatus','Saving comment…','');
        try{const result=await supabaseClient.rpc('findat_add_article_comment',{p_article_id:article.id,p_body:body,p_parent_id:articleCommentReplyId||null});if(result.error)throw result.error;if(input)input.value='';setCommentReply();await refreshArticleActivity(article.id);await refreshCollaborationState();setStatus('fdArticleActivityStatus','Comment saved and collaborators notified.','success')}
        catch(error){setStatus('fdArticleActivityStatus',error.message||'The comment could not be saved.','error')}
        finally{if(button)button.disabled=false}
      }
      async function deleteArticleComment(commentId){
        if(!commentId||!confirm('Remove this comment?'))return;const result=await supabaseClient.rpc('findat_delete_article_comment',{p_comment_id:commentId});if(result.error){setStatus('fdArticleActivityStatus',result.error.message||'The comment could not be removed.','error');return}if(editingArticleId)await refreshArticleActivity(editingArticleId);setStatus('fdArticleActivityStatus','Comment removed.','success')
      }
      function renderAll(){renderHomepagePublications();if(!activeAccount)return;renderCounters();renderLibrary();renderReview();renderPublications();renderCover();renderCollaborationInbox();const current=loadWorkspace().articles.find(a=>a.id===editingArticleId);renderStatusBanner(current);renderContributorBoard(current);renderArticleActivity(current)}

      function parseDelimitedLine(line,delimiter){const cells=[];let current='',quoted=false;for(let index=0;index<line.length;index+=1){const char=line[index];if(char==='"'){if(quoted&&line[index+1]==='"'){current+='"';index+=1}else quoted=!quoted}else if(char===delimiter&&!quoted){cells.push(current.trim());current=''}else current+=char}cells.push(current.trim());return cells}
      function parseArticleData(raw){const lines=String(raw||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);if(lines.length<2)throw new Error('Provide a heading row and at least one data row.');const sample=lines.slice(0,4).join('\n'),delimiter=sample.includes('\t')?'\t':sample.split(';').length>sample.split(',').length?';':',';const rows=lines.map(line=>parseDelimitedLine(line,delimiter));const width=Math.max(...rows.map(row=>row.length));rows.forEach(row=>{while(row.length<width)row.push('')});if(width<2)throw new Error('Provide at least two columns.');return{headers:rows[0].map((value,index)=>value||`Column ${index+1}`),rows:rows.slice(1).filter(row=>row.some(Boolean)).slice(0,100)}}
      function articleNumericSeries(grid){for(let column=1;column<grid.headers.length;column+=1){const points=grid.rows.map(row=>({label:row[0]||`Row ${grid.rows.indexOf(row)+1}`,value:Number(String(row[column]||'').replace(/[^0-9+.\-]/g,''))})).filter(point=>Number.isFinite(point.value));if(points.length>=2)return{label:grid.headers[column],points}}throw new Error('A chart needs at least two numeric values in a column after the labels column.')}
      function insertArticleBlock(html){const editor=$('#fdArticleEditor');if(!editor)return;editor.insertAdjacentHTML('beforeend',`<p><br></p>${html}<p><br></p>`);editor.focus()}
      function dataTableHTML(grid){return`<figure class="fd-article-data-block"><figcaption>${escapeHTML($('#fdChartTitle')?.value.trim()||'Data table')}</figcaption><div class="fd-article-table-scroll"><table class="fd-article-table"><thead><tr>${grid.headers.map(header=>`<th>${escapeHTML(header)}</th>`).join('')}</tr></thead><tbody>${grid.rows.map(row=>`<tr>${row.map(cell=>`<td>${escapeHTML(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></figure>`}
      const pythonChartTemplates={
        matplotlib:`import matplotlib.pyplot as plt\n\n# The pasted table is available as df.\nif df is None or df.empty:\n    labels = [\"January\", \"February\", \"March\", \"April\"]\n    values = [12, 18, 15, 24]\nelse:\n    labels = df.iloc[:, 0].astype(str).tolist()\n    values = df.iloc[:, 1].astype(float).tolist()\n\nfig, ax = plt.subplots(figsize=(8, 4.8))\nax.plot(labels, values, marker=\"o\", linewidth=2)\nax.set_title(CHART_TITLE or \"Matplotlib chart\")\nax.set_xlabel(\"Category\")\nax.set_ylabel(\"Value\")\nax.grid(alpha=0.25)\nfig.tight_layout()`,
        seaborn:`import matplotlib.pyplot as plt\nimport seaborn as sns\n\nsns.set_theme(style=\"whitegrid\")\nif df is None or df.empty:\n    values = [12, 18, 15, 24, 19, 27, 22]\n    groups = [\"A\", \"A\", \"A\", \"B\", \"B\", \"B\", \"B\"]\nelse:\n    groups = df.iloc[:, 0].astype(str).tolist()\n    values = df.iloc[:, 1].astype(float).tolist()\n\nfig, ax = plt.subplots(figsize=(8, 4.8))\nsns.barplot(x=groups, y=values, ax=ax, errorbar=None)\nax.set_title(CHART_TITLE or \"Seaborn chart\")\nax.set_xlabel(\"Category\")\nax.set_ylabel(\"Value\")\nfig.tight_layout()`,
        normal:`import numpy as np\nimport matplotlib.pyplot as plt\nfrom scipy.stats import norm\n\nvalues = None\nif df is not None and not df.empty:\n    numeric = df.select_dtypes(include=\"number\")\n    if not numeric.empty:\n        values = numeric.iloc[:, 0].dropna().to_numpy()\n\nmu = float(np.mean(values)) if values is not None and len(values) else 0.0\nsigma = float(np.std(values, ddof=1)) if values is not None and len(values) > 1 else 1.0\nif sigma <= 0:\n    sigma = 1.0\nx = np.linspace(mu - 4*sigma, mu + 4*sigma, 500)\ny = norm.pdf(x, mu, sigma)\n\nfig, ax = plt.subplots(figsize=(8, 4.8))\nax.plot(x, y, linewidth=2.5)\nax.fill_between(x, y, alpha=0.22)\nax.axvline(mu, linestyle=\"--\", linewidth=1.5, label=f\"Mean = {mu:.2f}\")\nax.set_title(CHART_TITLE or \"Normal distribution curve\")\nax.set_xlabel(\"Value\")\nax.set_ylabel(\"Probability density\")\nax.legend()\nfig.tight_layout()`,
        boxplot:`import matplotlib.pyplot as plt\n\nif df is None or df.empty:\n    series = [[12, 15, 17, 18, 22, 25], [9, 13, 14, 20, 24, 31]]\n    labels = [\"Group A\", \"Group B\"]\nelse:\n    numeric = df.select_dtypes(include=\"number\")\n    if numeric.empty:\n        raise ValueError(\"The pasted data needs at least one numeric column.\")\n    series = [numeric[column].dropna().tolist() for column in numeric.columns]\n    labels = [str(column) for column in numeric.columns]\n\nfig, ax = plt.subplots(figsize=(8, 4.8))\nax.boxplot(series, tick_labels=labels, patch_artist=True)\nax.set_title(CHART_TITLE or \"Box plot\")\nax.set_ylabel(\"Value\")\nax.grid(axis=\"y\", alpha=0.25)\nfig.tight_layout()`,
        histogram:`import matplotlib.pyplot as plt\n\nif df is None or df.empty:\n    values = [12, 15, 17, 18, 18, 19, 20, 22, 24, 25, 29, 31]\nelse:\n    numeric = df.select_dtypes(include=\"number\")\n    if numeric.empty:\n        raise ValueError(\"The pasted data needs at least one numeric column.\")\n    values = numeric.iloc[:, 0].dropna().tolist()\n\nfig, ax = plt.subplots(figsize=(8, 4.8))\nax.hist(values, bins=\"auto\", edgecolor=\"white\")\nax.set_title(CHART_TITLE or \"Histogram\")\nax.set_xlabel(\"Value\")\nax.set_ylabel(\"Frequency\")\nax.grid(axis=\"y\", alpha=0.22)\nfig.tight_layout()`,
        custom:`import matplotlib.pyplot as plt\n\n# Write any Matplotlib-compatible Python code here.\n# DATA_TEXT contains the pasted text and df contains a parsed pandas DataFrame.\nfig, ax = plt.subplots(figsize=(8, 4.8))\nax.scatter([1, 2, 3, 4], [4, 7, 5, 9])\nax.set_title(CHART_TITLE or \"Custom Python chart\")\nfig.tight_layout()`
      };
      let pendingPythonChart=null,pythonChartWorker=null,pythonChartRequest=0,pythonChartRequests=new Map();
      function applyPythonTemplate(name){const editor=$('#fdPythonCode'),template=pythonChartTemplates[name]||pythonChartTemplates.custom;if(editor)editor.value=template}
      function resetPythonChartWorker(){if(pythonChartWorker)pythonChartWorker.terminate();pythonChartWorker=null;for(const request of pythonChartRequests.values()){clearTimeout(request.timer);request.reject(new Error('The Python chart worker was restarted.'))}pythonChartRequests.clear()}
      function getPythonChartWorker(){
        if(pythonChartWorker)return pythonChartWorker;
        const workerUrl=new URL('assets/js/python-chart-worker.mjs',document.baseURI).href;
        pythonChartWorker=new Worker(workerUrl,{type:'module'});
        pythonChartWorker.addEventListener('message',event=>{const request=pythonChartRequests.get(event.data?.id);if(!request)return;clearTimeout(request.timer);pythonChartRequests.delete(event.data.id);if(event.data.ok)request.resolve(event.data);else request.reject(new Error(event.data.error||'Python could not generate the chart.'))});
        pythonChartWorker.addEventListener('error',event=>{const message=event.message||'The browser Python worker could not start.';for(const request of pythonChartRequests.values()){clearTimeout(request.timer);request.reject(new Error(message))}pythonChartRequests.clear();pythonChartWorker?.terminate();pythonChartWorker=null});
        return pythonChartWorker
      }
      function executePythonChart(code,dataText,title){
        return new Promise((resolve,reject)=>{const worker=getPythonChartWorker(),id=`python-${Date.now()}-${++pythonChartRequest}`,timer=setTimeout(()=>{pythonChartRequests.delete(id);resetPythonChartWorker();reject(new Error('Python took too long. Simplify the code and run it again.'))},120000);pythonChartRequests.set(id,{resolve,reject,timer});worker.postMessage({id,code,dataText,title})})
      }
      function renderPythonPreview(){const host=$('#fdPythonChartPreview'),insert=$('#fdInsertPythonChart');if(!host)return;if(pendingPythonChart?.dataUrl){host.innerHTML=`<img src="${pendingPythonChart.dataUrl}" alt="Python-generated statistical chart preview">`;if(insert)insert.disabled=false}else{host.innerHTML='<span><i class="fas fa-chart-area"></i> Run Python to preview a chart.</span>';if(insert)insert.disabled=true}}
      async function runPythonChart(){
        const button=$('#fdRunPythonChart'),code=$('#fdPythonCode')?.value||'',dataText=$('#fdDataInput')?.value||'',title=$('#fdChartTitle')?.value.trim()||$('#fdPythonCaption')?.value.trim()||'';
        if(!code.trim()){setStatus('fdPythonStatus','Enter Python code or choose a template.','error');return}
        pendingPythonChart=null;renderPythonPreview();if(button)button.disabled=true;setStatus('fdPythonStatus','Loading browser Python and generating the chart… The first run may take longer.','');if($('#fdPythonConsole'))$('#fdPythonConsole').textContent='Running Python…';
        try{const result=await executePythonChart(code,dataText,title);pendingPythonChart={dataUrl:result.dataUrl,title:title||'Python chart',code};renderPythonPreview();if($('#fdPythonConsole'))$('#fdPythonConsole').textContent=result.stdout||'Chart generated successfully.';setStatus('fdPythonStatus','Python chart generated. Review the preview, then insert it into the article.','success')}
        catch(error){if($('#fdPythonConsole'))$('#fdPythonConsole').textContent=error.message||'Python error';setStatus('fdPythonStatus',error.message||'Python could not generate the chart.','error')}
        finally{if(button)button.disabled=false}
      }
      function insertPythonChart(){
        if(!pendingPythonChart?.dataUrl){setStatus('fdPythonStatus','Run Python and generate a chart first.','error');return}
        const caption=$('#fdPythonCaption')?.value.trim()||pendingPythonChart.title||'Python chart';insertArticleBlock(`<figure class="fd-article-data-block fd-python-figure"><figcaption>${escapeHTML(caption)}</figcaption><img src="${pendingPythonChart.dataUrl}" alt="${escapeHTML(caption)}"></figure>`);setStatus('fdPythonStatus','Python chart inserted into the article.','success');pendingPythonChart=null;renderPythonPreview();if($('#fdPythonCaption'))$('#fdPythonCaption').value=''
      }
      function dataSummaryHTML(grid){const series=articleNumericSeries(grid),values=series.points.map(point=>point.value),sum=values.reduce((total,value)=>total+value,0),average=sum/values.length,min=Math.min(...values),max=Math.max(...values),format=value=>Number(value.toFixed(4)).toLocaleString();return`<figure class="fd-article-data-block"><figcaption>${escapeHTML($('#fdChartTitle')?.value.trim()||`${series.label} statistical summary`)}</figcaption><table class="fd-article-table fd-stat-table"><thead><tr><th>Measure</th><th>Value</th></tr></thead><tbody><tr><td>Observations</td><td>${values.length}</td></tr><tr><td>Total</td><td>${format(sum)}</td></tr><tr><td>Average</td><td>${format(average)}</td></tr><tr><td>Minimum</td><td>${format(min)}</td></tr><tr><td>Maximum</td><td>${format(max)}</td></tr></tbody></table></figure>`}
      function dataChartHTML(grid,type){const series=articleNumericSeries(grid),title=$('#fdChartTitle')?.value.trim()||`${series.label} by ${grid.headers[0]}`,points=series.points.slice(0,20),values=points.map(point=>point.value),min=Math.min(0,...values),max=Math.max(0,...values),range=max-min||1;if(type==='pie'){const positives=points.map(point=>({...point,value:Math.max(0,point.value)})).filter(point=>point.value>0),total=positives.reduce((sum,point)=>sum+point.value,0);if(!total)throw new Error('A pie chart needs positive values.');let cursor=0;const shades=['#d7651b','#274362','#ef9a45','#5e7895','#9d4e1f','#7f97ad','#f0bd7d','#415a73'];const stops=positives.map((point,index)=>{const start=cursor;cursor+=point.value/total*100;return`${shades[index%shades.length]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`});return`<figure class="fd-article-data-block fd-article-chart"><figcaption>${escapeHTML(title)}</figcaption><div class="fd-pie-layout"><div class="fd-article-pie" style="background:conic-gradient(${stops.join(',')})"></div><ul>${positives.map((point,index)=>`<li><i style="background:${shades[index%shades.length]}"></i><span>${escapeHTML(point.label)}</span><strong>${escapeHTML(point.value.toLocaleString())}</strong></li>`).join('')}</ul></div></figure>`}if(type==='line'){const coordinates=points.map((point,index)=>{const x=points.length===1?50:index/(points.length-1)*100,y=94-(point.value-min)/range*84;return`${x.toFixed(2)},${y.toFixed(2)}`}).join(' ');return`<figure class="fd-article-data-block fd-article-chart"><figcaption>${escapeHTML(title)}</figcaption><svg class="fd-line-chart" viewBox="0 0 100 100" role="img" aria-label="${escapeHTML(title)}"><line x1="0" y1="94" x2="100" y2="94"></line><polyline points="${coordinates}"></polyline>${points.map((point,index)=>{const x=points.length===1?50:index/(points.length-1)*100,y=94-(point.value-min)/range*84;return`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="2"></circle>`}).join('')}</svg><div class="fd-chart-label-row">${points.map(point=>`<span>${escapeHTML(point.label)}</span>`).join('')}</div></figure>`}const maximum=Math.max(...values.map(value=>Math.abs(value)),1);return`<figure class="fd-article-data-block fd-article-chart"><figcaption>${escapeHTML(title)}</figcaption><div class="fd-bar-chart">${points.map(point=>`<div class="fd-bar-row"><span>${escapeHTML(point.label)}</span><i><b style="width:${Math.max(2,Math.abs(point.value)/maximum*100).toFixed(2)}%"></b></i><strong>${escapeHTML(point.value.toLocaleString())}</strong></div>`).join('')}</div></figure>`}
      function useArticleData(kind){try{const grid=parseArticleData($('#fdDataInput')?.value);if(kind==='table')insertArticleBlock(dataTableHTML(grid));else if(kind==='summary')insertArticleBlock(dataSummaryHTML(grid));else insertArticleBlock(dataChartHTML(grid,$('#fdChartType')?.value||'bar'));$('#fdDataInput').value='';$('#fdChartTitle').value='';setStatus('fdDataStatus',kind==='table'?'Table inserted into the article.':kind==='summary'?'Statistical summary inserted into the article.':'Chart inserted into the article.','success')}catch(error){setStatus('fdDataStatus',error.message||'The data could not be processed.','error')}}
      function clearEditor(withStarter=false){editingArticleId='';pendingCover=null;pendingAttachments=[];contributorLayoutDraft=activeAccount?[{userId:activeAccount.id,name:accountName(activeAccount),avatarUrl:activeAccount.avatarUrl||'',qualifications:qualificationSummary(activeAccount.qualifications),x:4,y:8,size:36}]:[];contributorLayoutArticleId='';contributorLayoutDirty=false;$('#fdArticleTitle').value='';$('#fdArticleSubtitle').value='';$('#fdArticleTemplate').value='classic';$('#fdArticleCategory').value='Research';$('#fdArticleEditor').className='fd-editor-canvas template-classic';$('#fdArticleEditor').innerHTML=withStarter?templateStarters.classic:'';if($('#fdDataInput'))$('#fdDataInput').value='';if($('#fdChartTitle'))$('#fdChartTitle').value='';if($('#fdChartType'))$('#fdChartType').value='bar';if($('#fdPythonTemplate'))$('#fdPythonTemplate').value='matplotlib';applyPythonTemplate('matplotlib');if($('#fdPythonCaption'))$('#fdPythonCaption').value='';pendingPythonChart=null;renderPythonPreview();if($('#fdPythonConsole'))$('#fdPythonConsole').textContent='No output yet.';setStatus('fdPythonStatus','');if($('#fdDataTools'))$('#fdDataTools').open=false;if($('#fdPythonTools'))$('#fdPythonTools').open=false;setStatus('fdDataStatus','');$('#fdTemplateHint').textContent=templateHints.classic;setStatus('fdArticleStatus','');articleActivityCache={articleId:'',revisions:[],comments:[]};articleCommentReplyId='';notificationCommentArticleId='';notificationCommentReplyId='';renderArticleActivity(null);renderStatusBanner(null);renderCover();renderContributorBoard(null);if($('#fdSubmitArticle'))$('#fdSubmitArticle').hidden=activeAccount?.role!=='client';renderLibrary();$('#fdArticleTitle').focus()}
      function openEditor(id){const article=loadWorkspace().articles.find(a=>a.id===id);if(!article)return;const canOpen=isAdmin()||(article.ownerId||article.createdBy)===activeAccount.id||article.publisherId===activeAccount.id||isAcceptedCollaborator(article.id);if(!canOpen)return;editingArticleId=article.id;pendingCover=article.image||null;pendingAttachments=Array.isArray(article.attachments)?article.attachments:[];$('#fdArticleTitle').value=article.title||'';$('#fdArticleSubtitle').value=article.subtitle||'';$('#fdArticleTemplate').value=article.template||'classic';$('#fdArticleCategory').value=article.category||'Research';$('#fdArticleEditor').className=`fd-editor-canvas template-${article.template||'classic'}`;$('#fdArticleEditor').innerHTML=article.content||'';$('#fdTemplateHint').textContent=templateHints[article.template||'classic'];setStatus('fdArticleStatus','');renderStatusBanner(article);renderCover();renderContributorBoard(article,true);renderLibrary();refreshArticleActivity(article.id).catch(error=>setStatus('fdArticleActivityStatus',error.message||'Activity could not be loaded.','error'));const isOwner=(article.ownerId||article.createdBy)===activeAccount.id;if($('#fdSubmitArticle'))$('#fdSubmitArticle').hidden=activeAccount.role!=='client'||!isOwner;showView('writing')}
      function collectArticle(status){const title=$('#fdArticleTitle').value.trim(),content=sanitiseHTML($('#fdArticleEditor').innerHTML);if(!title||!stripHTML(content)){setStatus('fdArticleStatus','Enter an article title and some written content.','error');return null}const current=loadWorkspace().articles.find(a=>a.id===editingArticleId),canEditCover=isAdmin()||activeAccount?.role==='consultant'||activeAccount?.role==='client',canEditAttachments=isAdmin()||activeAccount?.role==='consultant',isOwner=!current||(current.ownerId||current.createdBy)===activeAccount?.id;return{title,subtitle:$('#fdArticleSubtitle').value.trim(),content,template:$('#fdArticleTemplate').value,category:$('#fdArticleCategory').value,collaboratorId:'',publisherId:current?.publisherId||'',publisherAssignedBy:current?.publisherAssignedBy||'',publisherAssignedAt:current?.publisherAssignedAt||'',contributorLayout:(isAdmin()||isOwner)?contributorLayoutDraft.map(item=>({...item})):(current?.contributorLayout||[]),image:canEditCover?pendingCover:(current?.image||null),attachments:canEditAttachments?pendingAttachments:(current?.attachments||[]),status,updatedAt:nowISO()}}
      async function saveArticle(status='Draft'){
        if(!requireSupabase('fdArticleStatus'))return;
        if(status==='Published'&&!isAdmin()){setStatus('fdArticleStatus','Only an Administrator has the standard Publish button.','error');return}
        const data=collectArticle(status);if(!data)return;
        let article=workspaceCache.articles.find(a=>a.id===editingArticleId);
        const articleAlreadyExists=Boolean(article);
        if(!article){if(activeAccount?.role==='consultant'){setStatus('fdArticleStatus','Consultants can edit collaborative or assigned articles but cannot create new articles.','error');return}article={id:uid(),ownerId:activeAccount.id,createdBy:activeAccount.id,createdAt:nowISO()};editingArticleId=article.id}
        const isOwner=(article.ownerId||article.createdBy)===activeAccount.id,collaborativeEdit=!isAdmin()&&!isOwner;
        if(article.status==='Published'&&!isAdmin()){setStatus('fdArticleStatus','A published article can only be changed by an Administrator.','error');return}
        if(collaborativeEdit){data.status=article.status||'Draft';data.reviewNote=article.reviewNote||''}
        if(isOwner&&status==='Draft'&&article.status==='Pending approval')data.reviewNote='';
        if(isOwner&&status==='Pending approval'){data.submittedAt=nowISO();data.reviewNote=''}
        if(isAdmin()&&status==='Published'){data.status='Published';data.publishedAt=nowISO();data.reviewedAt=nowISO();data.reviewedBy=activeAccount.id;data.reviewNote='Published by administrator.';data.contributorLayout=normaliseContributorLayout({...article,...data})}
        Object.assign(article,data);setStatus('fdArticleStatus',status==='Published'?'Publishing article…':'Saving article…','');
        const articleRow=articleToRow(article);
        const saveResult=articleAlreadyExists
          ? await supabaseClient.from('findat_articles').update(articleRow).eq('id',article.id).select().single()
          : await supabaseClient.from('findat_articles').insert(articleRow).select().single();
        const{data:saved,error}=saveResult;if(error){setStatus('fdArticleStatus',error.message||'The article could not be saved.','error');return}
        const converted=articleFromRow(saved),index=workspaceCache.articles.findIndex(a=>a.id===converted.id);if(index>=0)workspaceCache.articles[index]=converted;else workspaceCache.articles.push(converted);
        const auditAction=collaborativeEdit?'Collaborative editorial changes saved':status==='Published'?'Article published by administrator':status==='Pending approval'?'Article submitted for approval':'Article draft saved';await addAudit(auditAction,converted.title,converted.id);
        const successMessage=collaborativeEdit?'Collaborative changes saved.':status==='Published'?'Article published successfully.':status==='Pending approval'?'Article sent to the administrator for approval.':'Draft saved.';clearEditor(false);setStatus('fdArticleStatus',successMessage,'success');await refreshCollaborationState();renderAll()
      }
      async function deleteArticle(id){const article=workspaceCache.articles.find(a=>a.id===id);if(!article||!isAdmin())return;if(!confirm(`Delete “${article.title}”?`))return;const{error}=await supabaseClient.from('findat_articles').delete().eq('id',id);if(error){setStatus('fdArticleStatus',error.message||'The article could not be deleted.','error');return}workspaceCache.articles=workspaceCache.articles.filter(a=>a.id!==id);await addAudit('Article deleted',article.title,id);if(editingArticleId===id)clearEditor(false);if(currentReaderArticleId===id)closeReader();renderAll()}
      async function approveArticle(id){if(!isAdmin())return;const article=workspaceCache.articles.find(a=>a.id===id);if(!article)return;Object.assign(article,{status:'Published',publishedAt:nowISO(),reviewedAt:nowISO(),reviewedBy:activeAccount.id,reviewNote:'Approved for publication.',contributorLayout:normaliseContributorLayout(article)});const{data,error}=await supabaseClient.from('findat_articles').update(articleToRow(article)).eq('id',id).select().single();if(error){alert(error.message||'The article could not be approved.');return}Object.assign(article,articleFromRow(data));await addAudit('Article approved and published',article.title,id);renderAll();if(currentReaderArticleId===id)openReader(id)}
      async function returnArticle(id,note=''){if(!isAdmin())return;const article=workspaceCache.articles.find(a=>a.id===id);if(!article)return;const reason=String(note||prompt('Enter a short revision note for the writer:')||'').trim();if(!reason)return;Object.assign(article,{status:'Rejected',reviewedAt:nowISO(),reviewedBy:activeAccount.id,reviewNote:reason});const{data,error}=await supabaseClient.from('findat_articles').update(articleToRow(article)).eq('id',id).select().single();if(error){alert(error.message||'The article could not be returned.');return}Object.assign(article,articleFromRow(data));await addAudit('Article returned for revision',`${article.title}: ${reason}`,id);renderAll();if(currentReaderArticleId===id)openReader(id)}
      async function unpublishArticle(id){if(!isAdmin())return;const article=workspaceCache.articles.find(a=>a.id===id);if(!article||!confirm(`Remove “${article.title}” from publications?`))return;Object.assign(article,{status:'Draft',publishedAt:'',reviewNote:'Unpublished by administrator.'});const{data,error}=await supabaseClient.from('findat_articles').update(articleToRow(article)).eq('id',id).select().single();if(error){alert(error.message||'The article could not be unpublished.');return}Object.assign(article,articleFromRow(data));await addAudit('Article unpublished',article.title,id);renderAll();closeReader()}

      function openReader(id,{updateHash=true}={}){
        const article=loadWorkspace().articles.find(a=>a.id===id);if(!article)return;
        const canRead=article.status==='Published'||isAdmin()||(article.ownerId||article.createdBy)===activeAccount?.id||article.publisherId===activeAccount?.id||isAcceptedCollaborator(article.id);if(!canRead)return;
        currentReaderArticleId=id;
        $('#fdReaderCover').innerHTML=article.image?.data?`<img src="${article.image.data}" alt="Cover for ${escapeHTML(article.title)}">`:'<i class="fas fa-newspaper"></i>';
        $('#fdReaderStatus').outerHTML=statusTag(article.status||'Draft').replace('<span','<span id="fdReaderStatus"');
        $('#fdReaderTitle').textContent=article.title||'Untitled article';
        $('#fdReaderSubtitle').textContent=article.subtitle||'';
        $('#fdReaderMeta').textContent=`${article.category||'Article'} · ${contributorSummary(article)} · ${article.status==='Published'?'Published':'Updated'} ${formatDate(article.publishedAt||article.submittedAt||article.updatedAt||article.createdAt)}`;renderReaderContributors(article);
        $('#fdReaderContent').innerHTML=sanitiseHTML(article.content||'');
        const attachments=Array.isArray(article.attachments)?article.attachments:[],attachmentsHost=$('#fdReaderAttachments'),attachmentsList=$('#fdReaderAttachmentList');
        if(attachmentsHost&&attachmentsList){attachmentsHost.classList.toggle('has-items',attachments.length>0);attachmentsList.innerHTML=attachments.map(item=>`<div class="fd-reader-attachment"><span><i class="fas fa-paperclip"></i> ${escapeHTML(item.name||'Supporting document')} · ${escapeHTML(fileSize(Number(item.size)||0))}</span>${item.data?`<a href="${item.data}" download="${escapeHTML(item.name||'document')}">Download</a>`:'<span>Available from FINDAT</span>'}</div>`).join('')}
        const review=$('#fdReaderReview');
        if(isAdmin()&&article.status==='Pending approval'){review.innerHTML=`<h3 style="font-size:13px;color:#33445d;margin:0">Administrator decision</h3><textarea class="fd-review-note-box" id="fdReaderReviewNote" placeholder="Add a note when returning the article for revision"></textarea><div class="fd-review-actions" style="justify-content:flex-start"><button class="fd-mini-btn" type="button" data-article-open-editor="${article.id}"><i class="fas fa-edit"></i> Edit submission</button><button class="fd-mini-btn is-success" type="button" data-reader-approve="${article.id}"><i class="fas fa-check"></i> Approve & publish</button><button class="fd-mini-btn is-danger" type="button" data-reader-return="${article.id}"><i class="fas fa-undo"></i> Return for revision</button><button class="fd-mini-btn is-danger" type="button" data-reader-delete="${article.id}"><i class="fas fa-trash"></i> Delete submission</button></div>`}else if(activeAccount?.role==='consultant'&&article.status==='Pending approval'&&article.publisherId===activeAccount.id){review.innerHTML=`<div class="fd-review-actions" style="justify-content:flex-start"><button class="fd-mini-btn" type="button" data-article-open-editor="${article.id}"><i class="fas fa-edit"></i> Edit assigned article</button><button class="fd-mini-btn is-success" type="button" data-delegated-publish="${article.id}"><i class="fas fa-globe"></i> Publish assigned article</button></div>`}else if(article.reviewNote&&article.status!=='Published'){review.innerHTML=`<div class="fd-status-banner ${article.status==='Rejected'?'is-rejected':''}"><strong>Review note</strong><br>${escapeHTML(article.reviewNote)}</div>`}else if(isAdmin()&&article.status==='Published'){review.innerHTML=`<div class="fd-review-actions" style="justify-content:flex-start"><button class="fd-mini-btn" type="button" data-article-open-editor="${article.id}"><i class="fas fa-edit"></i> Edit article</button><button class="fd-mini-btn is-danger" type="button" data-article-unpublish="${article.id}"><i class="fas fa-eye-slash"></i> Unpublish</button><button class="fd-mini-btn is-danger" type="button" data-reader-delete="${article.id}"><i class="fas fa-trash"></i> Delete published article</button></div>`}else review.innerHTML='';
        $('#fdArticleReader').classList.add('is-open');$('#fdArticleReader').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
        if(updateHash&&!document.body.classList.contains('dashboard-mode')&&article.status==='Published')history.replaceState(null,'',`#publication-${article.id}`)
      }
      function closeReader({returnToPublications=true}={}){currentReaderArticleId='';$('#fdArticleReader')?.classList.remove('is-open');$('#fdArticleReader')?.setAttribute('aria-hidden','true');if(document.body.classList.contains('dashboard-mode'))document.body.style.overflow='hidden';else{document.body.style.overflow='';if(returnToPublications&&location.hash.startsWith('#publication-')){history.replaceState(null,'','#publications');window.openPublicationsPanel?.();}}}

      async function attemptLogin(identifier,password,remember=true,statusId='loginStatus'){if(!requireSupabase(statusId))return false;rememberSupabaseSession=Boolean(remember);setStatus(statusId,'Checking your secure account…','');try{const result=await invokeFunction(FINDAT_AUTH_CONFIG.usernameLoginFunction||'findat-username-login',{identifier:String(identifier||'').trim(),password:String(password||'')});if(!result.session?.access_token||!result.session?.refresh_token)throw new Error('The login service did not return a valid session.');const prefetchedAccount=profileFromRow(result.profile);if(prefetchedAccount){activeAccount=prefetchedAccount;accountCache=[prefetchedAccount]}authTransitionInProgress=true;const{error}=await supabaseClient.auth.setSession({access_token:result.session.access_token,refresh_token:result.session.refresh_token});authTransitionInProgress=false;if(error){activeAccount=null;accountCache=[];throw error}const account=prefetchedAccount||await fetchOwnProfile(result.session.user?.id);if(!account||account.active===false){await supabaseClient.auth.signOut();throw new Error('This account is currently suspended.')}setStatus(statusId,'Login successful. Opening the writing desk…','success');await enterDashboard(account);return true}catch(error){setStatus(statusId,error.message||'The username/email or password is incorrect.','error');return false}}
      async function beginGoogleAuthentication(statusId='loginStatus',remember=true){
        if(!requireSupabase(statusId))return false;
        rememberSupabaseSession=Boolean(remember);
        const buttons=['#googleLoginButton','#googleSignupButton'].map(selector=>$(selector)).filter(Boolean);
        buttons.forEach(button=>button.disabled=true);
        setStatus(statusId,'Opening Google secure sign-in…','');
        try{
          const redirectTo=`${location.origin}${location.pathname}`;
          const{data,error}=await supabaseClient.auth.signInWithOAuth({
            provider:'google',
            options:{redirectTo,queryParams:{prompt:'select_account'}}
          });
          if(error)throw error;
          if(!data?.url)throw new Error('Google sign-in could not be started.');
          return true
        }catch(error){
          buttons.forEach(button=>button.disabled=false);
          setStatus(statusId,error.message||'Google authentication could not be started.','error');
          return false
        }
      }
      function googleAuthErrorFromLocation(){
        const query=new URLSearchParams(location.search);
        const hash=new URLSearchParams(location.hash.replace(/^#/,''));
        return query.get('error_description')||hash.get('error_description')||query.get('error')||hash.get('error')||''
      }


      $('#loginForm')?.addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,identifier=$('#loginIdentifier').value,password=$('#loginPassword').value,remember=$('#loginRemember').checked;if(!identifier||!password){setStatus('loginStatus','Enter your username or email and password.','error');return}form.reset();$('#loginRemember').checked=remember;await attemptLogin(identifier,password,remember,'loginStatus')});
      $('#utilityLoginForm')?.addEventListener('submit',async event=>{event.preventDefault();if(activeAccount){showView('writing');document.body.classList.add('dashboard-mode');return}const identifier=$('#utilityUsername')?.value,password=$('#utilityPassword')?.value;event.currentTarget.reset();if(!identifier||!password){openAuthModal('loginPopup');return}const ok=await attemptLogin(identifier,password,false,'loginStatus');if(!ok)openAuthModal('loginPopup')});
      $('#googleLoginButton')?.addEventListener('click',()=>beginGoogleAuthentication('loginStatus',$('#loginRemember')?.checked!==false));
      $('#googleSignupButton')?.addEventListener('click',()=>beginGoogleAuthentication('signupStatus',true));
      $('#signupForm')?.addEventListener('submit',async event=>{event.preventDefault();if(!requireSupabase('signupStatus'))return;const form=event.currentTarget,data=Object.fromEntries(new FormData(form).entries());setStatus('signupStatus','');if(!data.firstName||!data.lastName||!data.email||!data.username||!data.password||!data.confirmPassword){setStatus('signupStatus','Complete all required fields.','error');return}const username=String(data.username).trim();if(!/^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/.test(username)){setStatus('signupStatus','Use 3–30 letters, numbers, dots, underscores or hyphens for the username.','error');return}if(String(data.password).length<8){setStatus('signupStatus','Password must contain at least 8 characters.','error');return}if(data.password!==data.confirmPassword){setStatus('signupStatus','The two passwords do not match.','error');return}form.reset();$('#signupRole').value='client';setStatus('signupStatus','Creating your secure Client account…','');const available=await supabaseClient.rpc('findat_username_available',{candidate:username});if(available.error){setStatus('signupStatus',available.error.message,'error');return}if(available.data!==true){setStatus('signupStatus','This username is already in use.','error');return}rememberSupabaseSession=true;authTransitionInProgress=true;const{data:authData,error}=await supabaseClient.auth.signUp({email:String(data.email).trim(),password:String(data.password),options:{emailRedirectTo:`${location.origin}${location.pathname}#login`,data:{username,first_name:String(data.firstName).trim(),last_name:String(data.lastName).trim(),phone:String(data.phone||'').trim(),organisation:String(data.organisation||'').trim(),country:'',role_request:'client'}}});authTransitionInProgress=false;if(error){setStatus('signupStatus',error.message||'The account could not be created.','error');return}if(authData.session&&authData.user){const account=await fetchOwnProfile(authData.user.id);setStatus('signupStatus','Account created. Opening the writing desk…','success');await enterDashboard(account)}else{setStatus('signupStatus','Account created. Confirm the email address before logging in. If no confirmation email arrives, a FINDAT Administrator can confirm the Client account from User Accounts.','success')}});
      $('#recoveryForm')?.addEventListener('submit',async event=>{event.preventDefault();if(!requireSupabase('recoveryStatus'))return;const form=event.currentTarget,data=Object.fromEntries(new FormData(form).entries()),email=String(data.email||'').trim();if(!email){setStatus('recoveryStatus','Enter the registered email address.','error');return}form.reset();setStatus('recoveryStatus','Sending a secure recovery email…','');const{error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}${location.pathname}`});if(error){setStatus('recoveryStatus',error.message||'The recovery email could not be sent.','error');return}setStatus('recoveryStatus','If an account uses that email, a recovery message has been sent.','success')});
      $('#passwordResetForm')?.addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,data=Object.fromEntries(new FormData(form).entries());if(!recoverySessionActive){setStatus('passwordResetStatus','Open this form from the secure link in your recovery email.','error');return}if(String(data.password||'').length<8||data.password!==data.confirmPassword){setStatus('passwordResetStatus','Use matching passwords of at least 8 characters.','error');return}form.reset();const{error}=await supabaseClient.auth.updateUser({password:String(data.password)});if(error){setStatus('passwordResetStatus',error.message||'The password could not be changed.','error');return}recoverySessionActive=false;setStatus('passwordResetStatus','Password updated. You can continue to your account.','success');setTimeout(async()=>{window.toggleModal?.('passwordResetPopup',false);const session=await getCurrentSession();if(session?.user){const account=await fetchOwnProfile(session.user.id);if(account)await enterDashboard(account)}},500)});

      function adminRoleBadge(role){return role==='admin'?'<span class="fd-account-role is-admin"><i class="fas fa-lock"></i> Administrator</span>':role==='consultant'?'<span class="fd-account-role is-consultant">Consultant</span>':'<span class="fd-account-role">Client</span>'}
      function accountStateBadges(user){const active=`<span class="fd-account-status ${user.active?'is-active':'is-suspended'}">${user.active?'Active':'Suspended'}</span>`;const email=user.emailConfirmed?'<span class="fd-account-status is-confirmed"><i class="fas fa-envelope-circle-check"></i> Email confirmed</span>':'<span class="fd-account-status is-unconfirmed"><i class="fas fa-envelope-open"></i> Email unconfirmed</span>';return`${active}${email}`}
      async function refreshAdminAccounts(){if(!isAdmin())return;const body=$('#fdAccountTableBody');if(body)body.innerHTML='<tr><td colspan="4">Loading accounts…</td></tr>';try{const response=await invokeFunction(FINDAT_AUTH_CONFIG.adminUsersFunction||'findat-admin-users',{action:'list'},true),users=(response.users||[]).map(profileFromRow);accountCache=[...new Map([activeAccount,...users].filter(Boolean).map(item=>[item.id,item])).values()];if($('#fdAccountNavCount'))$('#fdAccountNavCount').textContent=String(users.length);if(!body)return;body.innerHTML=users.length?users.map(user=>`<tr data-account-role="${user.role}" data-account-active="${user.active?'active':'suspended'}" data-account-confirmed="${user.emailConfirmed?'confirmed':'unconfirmed'}" class="${user.role==='admin'?'is-admin-row':''}"><td><strong>${escapeHTML(accountName(user))}</strong><small>@${escapeHTML(user.username)} · ${escapeHTML(user.email)}</small></td><td>${adminRoleBadge(user.role)}</td><td><div class="fd-account-status-stack">${accountStateBadges(user)}</div></td><td><div class="fd-account-controls">${user.role==='admin'?'<button class="fd-mini-btn is-locked" disabled type="button"><i class="fas fa-lock"></i> Protected</button>':`${user.emailConfirmed?'':`<button class="fd-mini-btn is-success" data-account-confirm="${user.id}" type="button"><i class="fas fa-envelope-circle-check"></i> Confirm email</button>`}<button class="fd-mini-btn" data-account-password="${user.id}" type="button"><i class="fas fa-key"></i> Password</button>${user.role==='consultant'?`<button class="fd-mini-btn is-admin-promote" data-account-promote="${user.id}" data-account-name="${escapeHTML(accountName(user))}" type="button"><i class="fas fa-user-shield"></i> Make Administrator</button>`:''}<button class="fd-mini-btn ${user.active?'is-danger':'is-success'}" data-account-active="${user.id}" data-next-active="${user.active?'false':'true'}" type="button">${user.active?'Suspend':'Activate'}</button>`}</div></td></tr>`).join(''):'<tr><td colspan="4">No accounts found.</td></tr>'}catch(error){if(body)body.innerHTML=`<tr><td colspan="4">${escapeHTML(error.message||'Accounts could not be loaded.')}</td></tr>`}}
      $('#fdAdminCreateAccountForm')?.addEventListener('submit',async event=>{event.preventDefault();if(!isAdmin())return;const form=event.currentTarget,data=Object.fromEntries(new FormData(form).entries());form.reset();setStatus('fdAdminAccountStatus','Creating account securely…','');try{await invokeFunction(FINDAT_AUTH_CONFIG.adminUsersFunction||'findat-admin-users',{action:'create',email:String(data.email||'').trim(),username:String(data.username||'').trim(),password:String(data.password||''),role:String(data.role||''),firstName:String(data.firstName||'').trim(),lastName:String(data.lastName||'').trim(),phone:String(data.phone||'').trim(),organisation:String(data.organisation||'').trim()},true);setStatus('fdAdminAccountStatus','Account created, activated and email-confirmed.','success');await refreshAdminAccounts();await refreshDirectory();populateCollaborators()}catch(error){setStatus('fdAdminAccountStatus',error.message||'The account could not be created.','error')}});
      $('#fdRefreshAccounts')?.addEventListener('click',refreshAdminAccounts);
      $('#fdAccountTableBody')?.addEventListener('click',async event=>{const confirmButton=event.target.closest('[data-account-confirm]'),passwordButton=event.target.closest('[data-account-password]'),promoteButton=event.target.closest('[data-account-promote]'),activeButton=event.target.closest('[data-account-active]');if(confirmButton){if(!confirm('Confirm this Client or Consultant email so the account can log in?'))return;try{await invokeFunction(FINDAT_AUTH_CONFIG.adminUsersFunction||'findat-admin-users',{action:'confirm_email',userId:confirmButton.dataset.accountConfirm},true);alert('Email confirmed. The user can now log in with the existing password.');await refreshAdminAccounts()}catch(error){alert(error.message||'The email could not be confirmed.')}return}if(passwordButton){const password=prompt('Enter the new password (at least 8 characters):');if(!password)return;if(password.length<8){alert('Password must contain at least 8 characters.');return}try{await invokeFunction(FINDAT_AUTH_CONFIG.adminUsersFunction||'findat-admin-users',{action:'change_password',userId:passwordButton.dataset.accountPassword,password},true);alert('Password changed and email confirmed. The user can now log in.');await refreshAdminAccounts()}catch(error){alert(error.message||'The password could not be changed.')}return}if(promoteButton){const name=promoteButton.dataset.accountName||'this user';if(!confirm(`Promote ${name} to Administrator? This grants full FINDAT privileges and the account will become protected.`))return;try{await invokeFunction(FINDAT_AUTH_CONFIG.adminUsersFunction||'findat-admin-users',{action:'promote_admin',userId:promoteButton.dataset.accountPromote},true);alert(`${name} is now an Administrator.`);await refreshAdminAccounts();await refreshDirectory()}catch(error){alert(error.message||'The account could not be promoted.')}return}if(activeButton){const active=activeButton.dataset.nextActive==='true';try{await invokeFunction(FINDAT_AUTH_CONFIG.adminUsersFunction||'findat-admin-users',{action:'set_active',userId:activeButton.dataset.accountActive,active},true);await refreshAdminAccounts()}catch(error){alert(error.message||'The account status could not be changed.')}}});

      $$('[data-editor-command]').forEach(button=>button.addEventListener('click',()=>{document.execCommand(button.dataset.editorCommand,false,null);$('#fdArticleEditor').focus()}));
      $$('[data-editor-block]').forEach(button=>button.addEventListener('click',()=>{document.execCommand('formatBlock',false,button.dataset.editorBlock);$('#fdArticleEditor').focus()}));
      $('#fdInsertLink')?.addEventListener('click',()=>{const url=prompt('Enter the web address:');if(url&&/^https?:\/\//i.test(url)){document.execCommand('createLink',false,url);$('#fdArticleEditor').focus()}});
      $('#fdInsertInlineImage')?.addEventListener('click',()=>$('#fdInlineImageInput').click());
      $('#fdInlineImageInput')?.addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;if(file.size>1500000){setStatus('fdArticleStatus','Use an inline image smaller than 1.5 MB.','error');event.target.value='';return}const data=await readAsDataURL(file);$('#fdArticleEditor').focus();document.execCommand('insertImage',false,data);event.target.value=''});
      $('#fdArticleTemplate')?.addEventListener('change',event=>{const template=event.target.value;$('#fdArticleEditor').className=`fd-editor-canvas template-${template}`;$('#fdTemplateHint').textContent=templateHints[template];if(!stripHTML($('#fdArticleEditor').innerHTML)&&confirm('Insert the starter structure for this template?'))$('#fdArticleEditor').innerHTML=templateStarters[template]});
      $('#fdArticleImage')?.addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;if(file.size>1500000){setStatus('fdArticleStatus','Use a cover photo smaller than 1.5 MB.','error');event.target.value='';return}pendingCover={name:file.name,type:file.type,size:file.size,data:await readAsDataURL(file)};renderCover();event.target.value=''});
      $('#fdArticleAttachment')?.addEventListener('change',async event=>{const files=[...event.target.files];for(const file of files){const item={name:file.name,type:file.type,size:file.size,data:''};if(file.size<=650000)item.data=await readAsDataURL(file);pendingAttachments.push(item)}renderCover();event.target.value=''});
      $('#fdArticleAttachmentList')?.addEventListener('click',event=>{const button=event.target.closest('[data-remove-attachment]');if(!button)return;pendingAttachments.splice(Number(button.dataset.removeAttachment),1);renderCover()});
      $('#fdSaveArticle')?.addEventListener('click',()=>saveArticle('Draft'));
      $('#fdSubmitArticle')?.addEventListener('click',()=>saveArticle('Pending approval'));
      $('#fdPublishArticle')?.addEventListener('click',()=>saveArticle('Published'));
      $('#fdCollaboratorButton')?.addEventListener('click',openCollaboratorPicker);
      $('#fdSaveCollaborators')?.addEventListener('click',saveCollaborators);
      $('#fdCollaboratorModalClose')?.addEventListener('click',()=>{window.toggleModal?.('fdCollaboratorModal',false);renderActiveCollaborators(workspaceCache.articles.find(row=>row.id===editingArticleId)||null)});
      $('#fdCollaborationInboxButton')?.addEventListener('click',async()=>{
        setStatus('fdCollaborationInboxStatus','Refreshing notifications…','');
        window.toggleModal?.('fdCollaborationInboxModal',true);
        try{
          await refreshCollaborationState();
          await markNotificationsRead();
          setStatus('fdCollaborationInboxStatus',displayNotificationRows().length?'Notifications and response history are up to date.':'No notification activity is available yet.','')
        }catch(error){setStatus('fdCollaborationInboxStatus',error.message||'Notifications could not be refreshed. Run the latest SQL update, then try again.','error')}
      });
      $('#fdCollaborationInboxClose')?.addEventListener('click',()=>window.toggleModal?.('fdCollaborationInboxModal',false));
      $('#fdNotificationCommentClose')?.addEventListener('click',()=>window.toggleModal?.('fdNotificationCommentModal',false));
      $('#fdNotificationCommentSend')?.addEventListener('click',sendNotificationComment);
      $('#fdNotificationReplyCancel')?.addEventListener('click',()=>{notificationCommentReplyId='';$('#fdNotificationReplyLabel').textContent='';$('#fdNotificationReplyCancel').hidden=true;$('#fdNotificationCommentInput')?.focus()});
      $('#fdNotificationCommentInput')?.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();sendNotificationComment()}});

      $('#fdCollaborationInboxRefresh')?.addEventListener('click',async()=>{setStatus('fdCollaborationInboxStatus','Refreshing…','');try{await refreshCollaborationState();await markNotificationsRead();setStatus('fdCollaborationInboxStatus','Notifications refreshed.','success')}catch(error){setStatus('fdCollaborationInboxStatus',error.message||'Refresh failed.','error')}});
      $('#fdCollaborationInboxClear')?.addEventListener('click',clearNotificationHistory);
      $('#fdUserProfileButton')?.addEventListener('click',()=>{renderProfilePhotoModal();window.toggleModal?.('fdProfilePhotoModal',true)});
      $('#fdProfilePhotoClose')?.addEventListener('click',()=>window.toggleModal?.('fdProfilePhotoModal',false));
      $('#fdProfilePhotoInput')?.addEventListener('change',event=>uploadProfilePhoto(event.target.files?.[0]));
      $('#fdRemoveProfilePhoto')?.addEventListener('click',removeProfilePhoto);
      $('#fdAssignPublisherButton')?.addEventListener('click',openPublisherPicker);
      $('#fdPublisherModalClose')?.addEventListener('click',()=>window.toggleModal?.('fdPublisherModal',false));
      $('#fdCollaboratorProfileList')?.addEventListener('change',event=>{const count=updateCollaboratorSelectionCount();if(count>5){event.target.checked=false;updateCollaboratorSelectionCount();setStatus('fdCollaboratorStatus','A group may contain no more than five collaborators.','error')}else setStatus('fdCollaboratorStatus',count?`${count} collaborator${count===1?'':'s'} selected. Click Send requests when ready.`:'No collaborators selected.','')});
      $('#fdContributorLayoutBoard')?.addEventListener('click',event=>{const button=event.target.closest('[data-contributor-size]');if(!button)return;const card=button.closest('[data-contributor-id]'),item=contributorLayoutDraft.find(row=>row.userId===card?.dataset.contributorId);if(!item)return;item.size=Math.max(28,Math.min(64,item.size+Number(button.dataset.contributorSize)*4));contributorLayoutDirty=true;card.style.setProperty('--contributor-size',`${item.size}px`)});
      $$('.fd-editor-tool-launchers>details').forEach(panel=>panel.addEventListener('toggle',()=>{if(!panel.open)return;$$('.fd-editor-tool-launchers>details').forEach(other=>{if(other!==panel)other.open=false})}));
      $('#fdInsertDataTable')?.addEventListener('click',()=>useArticleData('table'));
      $('#fdInsertDataSummary')?.addEventListener('click',()=>useArticleData('summary'));
      $('#fdInsertDataChart')?.addEventListener('click',()=>useArticleData('chart'));
      $('#fdPythonTemplate')?.addEventListener('change',event=>{if(event.target.value!=='custom'||!$('#fdPythonCode')?.value.trim()||confirm('Replace the current Python code with this template?'))applyPythonTemplate(event.target.value)});
      $('#fdRunPythonChart')?.addEventListener('click',runPythonChart);
      $('#fdInsertPythonChart')?.addEventListener('click',insertPythonChart);
      applyPythonTemplate($('#fdPythonTemplate')?.value||'matplotlib');renderPythonPreview();
      $('#fdNewArticle')?.addEventListener('click',()=>clearEditor(false));
      $('#fdHeroNewArticle')?.addEventListener('click',()=>{clearEditor(true);showView('writing')});
      $('#fdDashboardSearch')?.addEventListener('input',renderLibrary);
      $('#homePublicationSearch')?.addEventListener('input',renderHomepagePublications);
      $('#homePublicationType')?.addEventListener('change',renderHomepagePublications);
      $('#homePublicationClear')?.addEventListener('click',()=>{if($('#homePublicationSearch'))$('#homePublicationSearch').value='';if($('#homePublicationType'))$('#homePublicationType').value='';renderHomepagePublications()});
      $('#homePublicationsWrite')?.addEventListener('click',event=>{event.preventDefault();activeAccount?enterDashboard(activeAccount):openAuthModal('loginPopup')});
      $('#homePublicationList')?.addEventListener('keydown',event=>{const card=event.target.closest('[data-article-preview]');if(card&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openReader(card.dataset.articlePreview)}});
      window.addEventListener('focus',async()=>{await refreshPublicArticles();if(activeAccount){try{await refreshCollaborationState();await refreshArticles();renderAll()}catch(error){console.warn(error)}}});document.addEventListener('visibilitychange',async()=>{if(!document.hidden){await refreshPublicArticles();if(activeAccount){try{await refreshCollaborationState();await refreshArticles();renderAll()}catch(error){console.warn(error)}}}});

      document.addEventListener('click',async event=>{
        const nav=event.target.closest('[data-dashboard-view]');if(nav){event.preventDefault();showView(nav.dataset.dashboardView)}
        const open=event.target.closest('[data-article-open-editor]');if(open){closeReader();openEditor(open.dataset.articleOpenEditor)}
        const preview=event.target.closest('[data-article-preview]');if(preview)openReader(preview.dataset.articlePreview);
        const del=event.target.closest('[data-article-delete]');if(del)deleteArticle(del.dataset.articleDelete);
        const approve=event.target.closest('[data-article-approve]');if(approve)approveArticle(approve.dataset.articleApprove);
        const ret=event.target.closest('[data-article-return]');if(ret)returnArticle(ret.dataset.articleReturn);
        const unpublish=event.target.closest('[data-article-unpublish]');if(unpublish)unpublishArticle(unpublish.dataset.articleUnpublish);
        const readerApprove=event.target.closest('[data-reader-approve]');if(readerApprove)approveArticle(readerApprove.dataset.readerApprove);
        const readerReturn=event.target.closest('[data-reader-return]');if(readerReturn)returnArticle(readerReturn.dataset.readerReturn,$('#fdReaderReviewNote')?.value);
        const readerDelete=event.target.closest('[data-reader-delete]');if(readerDelete)deleteArticle(readerDelete.dataset.readerDelete);
        const response=event.target.closest('[data-collaboration-response]');if(response){respondCollaboration(response.dataset.collaborationArticle,response.dataset.collaborationResponse==='accept',response);return}
        const notificationOpen=event.target.closest('[data-notification-open]');if(notificationOpen){openNotificationItem(notificationOpen.dataset.notificationOpen,notificationOpen.dataset.notificationOpenKind||'');return}
        const notificationCard=event.target.closest('[data-notification-article]');if(notificationCard&&notificationCard.dataset.notificationArticle&&!event.target.closest('button')){openNotificationItem(notificationCard.dataset.notificationArticle,notificationCard.dataset.notificationKind||'');return}
        const notificationReply=event.target.closest('[data-notification-reply]');if(notificationReply){notificationCommentReplyId=notificationReply.dataset.notificationReply||'';const label=$('#fdNotificationReplyLabel');if(label)label.textContent=`Replying to ${notificationReply.dataset.notificationReplyAuthor||'comment'}`;$('#fdNotificationReplyCancel').hidden=false;$('#fdNotificationCommentInput')?.focus();return}
        const delegated=event.target.closest('[data-delegated-publish]');if(delegated)publishDelegatedArticle(delegated.dataset.delegatedPublish);
        const publisher=event.target.closest('[data-publisher-id]');if(publisher)assignPublisher(publisher.dataset.publisherId);
        const select=event.target.closest('[data-review-select]');if(select){select.checked?reviewSelection.add(select.dataset.reviewSelect):reviewSelection.delete(select.dataset.reviewSelect);renderReview()}
        const replyComment=event.target.closest('[data-comment-reply]');if(replyComment)setCommentReply(replyComment.dataset.commentReply,replyComment.dataset.commentAuthor||'comment');
        const deleteComment=event.target.closest('[data-comment-delete]');if(deleteComment)deleteArticleComment(deleteComment.dataset.commentDelete);
      });
      $('#fdAddArticleComment')?.addEventListener('click',addArticleComment);
      $('#fdCancelCommentReply')?.addEventListener('click',()=>setCommentReply());
      $('#fdArticleCommentInput')?.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();addArticleComment()}});
      $('#fdReaderClose')?.addEventListener('click',()=>closeReader());$('#fdReaderBack')?.addEventListener('click',()=>closeReader());$('#fdReaderPrint')?.addEventListener('click',()=>window.print());$('#fdArticleReader')?.addEventListener('click',event=>{if(event.target.id==='fdArticleReader')closeReader()});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('#fdArticleReader')?.classList.contains('is-open'))closeReader()});

      $$('[data-dashboard-logout]').forEach(button=>button.addEventListener('click',logout));
      const sidebar=$('#fdSidebar'),overlay=$('#fdMobileOverlay');function openSidebar(){sidebar?.classList.add('is-open');overlay?.classList.add('is-open')}function closeSidebar(){sidebar?.classList.remove('is-open');overlay?.classList.remove('is-open')}$('#fdMenuToggle')?.addEventListener('click',openSidebar);overlay?.addEventListener('click',closeSidebar);
      $('#fdOpenWebsite')?.addEventListener('click',()=>leaveDashboard(true));
      $('#utilityRegister')?.addEventListener('click',event=>{event.preventDefault();activeAccount?enterDashboard(activeAccount):openAuthModal('signupPopup')});
      $('#openLogin')?.addEventListener('click',event=>{event.preventDefault();activeAccount?enterDashboard(activeAccount):openAuthModal('loginPopup')});
      $('#forgotAccess')?.addEventListener('click',event=>{event.preventDefault();openAuthModal('recoveryPopup')});
      $$('[data-open-signup]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();openAuthModal('signupPopup')}));
      $$('[data-open-login]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();openAuthModal('loginPopup')}));
      $$('[data-open-recovery]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();openAuthModal('recoveryPopup')}));

      async function bootstrap(){if($('#fdTodayLabel'))$('#fdTodayLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'});if(!supabaseClient){syncPublicAuthBar(null);renderHomepagePublications();console.error('FINDAT Supabase Auth is not configured.');return}const googleAuthError=googleAuthErrorFromLocation();if(googleAuthError){openAuthModal('loginPopup');setStatus('loginStatus',`Google authentication was not completed: ${googleAuthError}`,'error');history.replaceState(null,'',location.pathname)}supabaseClient.auth.onAuthStateChange(async(event,session)=>{if(event==='PASSWORD_RECOVERY'){recoverySessionActive=true;openAuthModal('passwordResetPopup');return}if(event==='SIGNED_OUT'){activeAccount=null;accountCache=[];directoryCache=[];collaborationCache=[];collaborationInbox=[];workspaceCache={articles:[],audit:[]};clearInterval(collaborationRefreshTimer);syncPublicAuthBar(null);renderHomepagePublications()}if(event==='SIGNED_IN'&&session?.user&&!activeAccount&&!recoverySessionActive&&!authTransitionInProgress){try{const account=await fetchOwnProfile(session.user.id);if(account?.active)await enterDashboard(account)}catch(error){console.warn(error)}}});await refreshPublicArticles();const session=await getCurrentSession();if(session?.user){try{const account=await fetchOwnProfile(session.user.id);if(account?.active){activeAccount=account;window.FINDAT_ACTIVE_ACCOUNT=account;accountCache=[account];syncPublicAuthBar(account)}else if(account){await clearSession()}}catch(error){console.warn('FINDAT session profile unavailable',error)}}else syncPublicAuthBar(null);const publicationMatch=location.hash.match(/^#publication-(.+)$/);if(publicationMatch){openReader(publicationMatch[1],{updateHash:false});return}if(location.hash==='#recordings'){window.openRecordingsPanel?.();return}if(location.hash==='#live-training'){window.openLiveTrainingPanel?.();return}if(location.hash==='#publications'){window.openPublicationsPanel?.();return}if(activeAccount&&(location.hash==='#writing'||location.hash==='#workspace'||location.hash==='#dashboard'||location.hash==='#accounts'||location.hash==='#review'))await enterDashboard(activeAccount);clearInterval(publicRefreshTimer);publicRefreshTimer=setInterval(refreshPublicArticles,30000)}
      bootstrap();
    })();



/* ============================== Inline script 11 ============================== */

(() => {
  'use strict';
  // Certificate numbers use FINDAT-COURSE-YEAR-SEQUENCE and the issue date is captured at first pass.
  const PASS_MARK = 70;
  const COURSE_CODE = 'DAF';
  const COURSE_TITLE = 'Data Analytics Foundations';
  const LESSON_TITLE = 'Built-in lesson';
  const quizPassedKey = 'findat-recording-Data-MP4-quiz-passed';
  const quizBestKey = 'findat-recording-Data-MP4-quiz-best';
  const certificateNameKey = 'findat-recording-Data-MP4-certificate-name';
  const certificateNumberKey = 'findat-recording-Data-MP4-certificate-number';
  const certificateDateKey = 'findat-recording-Data-MP4-certificate-date';
  const certificateScoreKey = 'findat-recording-Data-MP4-certificate-score';

  const modal = document.getElementById('recordingCertificateModal');
  const closeBtn = document.getElementById('closeRecordingCertificate');
  const cancelBtn = document.getElementById('cancelRecordingCertificateName');
  const openBtn = document.getElementById('openRecordingCertificate');
  const nameStep = document.getElementById('recordingCertificateNameStep');
  const previewStep = document.getElementById('recordingCertificatePreviewStep');
  const fullNameInput = document.getElementById('recordingCertificateFullName');
  const formError = document.getElementById('recordingCertificateFormError');
  const editNameBtn = document.getElementById('editRecordingCertificateName');
  const downloadBtn = document.getElementById('downloadRecordingCertificatePDF');
  const status = document.getElementById('recordingCertificateDownloadStatus');
  const quizForm = document.getElementById('recordingQuizForm');
  const resetQuizBtn = document.getElementById('resetRecordingQuiz');
  let returnFocus = null;

  const getStore = (key, fallback = '') => { try { const value = localStorage.getItem(key); return value === null ? fallback : value; } catch { return fallback; } };
  const setStore = (key, value) => { try { localStorage.setItem(key, String(value)); } catch {} };
  const removeStore = key => { try { localStorage.removeItem(key); } catch {} };
  const hasPassed = () => getStore(quizPassedKey, '0') === '1';
  const bestScore = () => Math.max(0, Math.min(100, Number(getStore(quizBestKey, '0')) || 0));

  function validFullName(value) {
    const parts = value.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
    return parts.length >= 2 && value.trim().length >= 5;
  }
  function escapeNameForFile(value) {
    return value.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'Learner';
  }
  function formatCertificateDate(date) {
    return new Intl.DateTimeFormat('en-US', { month:'long', day:'numeric', year:'numeric' }).format(date);
  }
  function normalizeCertificateDate(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const oldFormat = text.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/);
    if (oldFormat) {
      const [, day, month, year] = oldFormat;
      return formatCertificateDate(new Date(Number(year), Number(month) - 1, Number(day)));
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? text : formatCertificateDate(parsed);
  }
  function storedCertificateNumber() {
    const value = getStore(certificateNumberKey, '').trim();
    const pattern = new RegExp(`^FINDAT-${COURSE_CODE}-(\\d{4})-(\\d{4,})$`);
    return pattern.test(value) ? value : '';
  }
  function storedIssueDate() {
    const value = getStore(certificateDateKey, '').trim();
    if (!value) return null;
    const oldFormat = value.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/);
    const parsed = oldFormat
      ? new Date(Number(oldFormat[3]), Number(oldFormat[2]) - 1, Number(oldFormat[1]))
      : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  function nextCertificateSequence(year) {
    const sequenceKey = `findat-certificate-sequence-${COURSE_CODE}-${year}`;
    const legacySequenceKey = `findat-certificate-index-${COURSE_CODE}-${year}-final`;
    const currentNumber = getStore(certificateNumberKey, '').trim();
    const currentMatch = currentNumber.match(new RegExp(`^FINDAT-${COURSE_CODE}-${year}-(\\d+)$`));
    const current = Math.max(
      0,
      Number(getStore(sequenceKey, '0')) || 0,
      Number(getStore(legacySequenceKey, '0')) || 0,
      currentMatch ? Number(currentMatch[1]) || 0 : 0
    );
    const next = current + 1;
    setStore(sequenceKey, next);
    setStore(legacySequenceKey, next);
    return next;
  }
  function ensureCertificateIssued() {
    const existingNumber = storedCertificateNumber();
    let issuedAt = storedIssueDate();

    // A certificate keeps the number and issue date assigned at the first pass.
    if (existingNumber) {
      if (!issuedAt) {
        const yearMatch = existingNumber.match(/-(\d{4})-/);
        const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
        issuedAt = new Date(year, 0, 1, 12, 0, 0);
        setStore(certificateDateKey, issuedAt.toISOString());
      }
      return { number: existingNumber, issuedAt };
    }

    // Issue a new number at the actual moment the learner first passes.
    issuedAt = new Date();
    const year = issuedAt.getFullYear();
    const sequence = nextCertificateSequence(year);
    const number = `FINDAT-${COURSE_CODE}-${year}-${String(sequence).padStart(4, '0')}`;
    setStore(certificateNumberKey, number);
    setStore(certificateDateKey, issuedAt.toISOString());
    return { number, issuedAt };
  }
  function certificateNumber() {
    return ensureCertificateIssued().number;
  }
  function certificateDate() {
    return formatCertificateDate(ensureCertificateIssued().issuedAt);
  }
  function courseDurationLabel() {
    const video = document.getElementById('findatRecordingPlayer');
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return 'On-demand video';
    const seconds = Math.floor(video.duration % 60);
    const minutes = Math.floor((video.duration / 60) % 60);
    const hours = Math.floor(video.duration / 3600);
    return hours > 0 ? `${hours}h ${String(minutes).padStart(2,'0')}m` : `${minutes}m ${String(seconds).padStart(2,'0')}s`;
  }
  function syncCertificateButton() {
    if (openBtn) openBtn.hidden = !hasPassed();
  }
  function fillCertificate() {
    const name = getStore(certificateNameKey, '').trim();
    const issued = ensureCertificateIssued();
    document.getElementById('recordingCertName').textContent = (name || 'LEARNER NAME').toUpperCase();
    document.getElementById('recordingCertNumber').innerHTML = `<strong>Certificate No:</strong> <span>${issued.number}</span>`;
    document.getElementById('recordingCertDate').innerHTML = `<strong>Date:</strong> <span>${formatCertificateDate(issued.issuedAt)}</span>`;
  }
  function showNameStep() {
    nameStep.hidden = false;
    previewStep.hidden = true;
    formError.textContent = '';
    fullNameInput.value = getStore(certificateNameKey, '');
    setTimeout(() => fullNameInput.focus(), 70);
  }
  function showPreview() {
    fillCertificate();
    nameStep.hidden = true;
    previewStep.hidden = false;
    status.textContent = '';
    setTimeout(() => downloadBtn.focus(), 70);
  }
  function openCertificate(options = {}) {
    if (!hasPassed()) return;
    returnFocus = options.trigger || document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const savedName = getStore(certificateNameKey, '');
    if (options.requestName || !validFullName(savedName)) showNameStep(); else showPreview();
  }
  function closeCertificate() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (returnFocus instanceof HTMLElement) returnFocus.focus();
  }

  document.getElementById('recordingCertificateNameStep')?.addEventListener('submit', event => {
    event.preventDefault();
    const name = fullNameInput.value.trim().replace(/\s+/g, ' ');
    if (!validFullName(name)) {
      formError.textContent = 'Please enter your full name, including at least a first name and surname.';
      fullNameInput.focus();
      return;
    }
    setStore(certificateNameKey, name);
    setStore(certificateScoreKey, bestScore());
    ensureCertificateIssued();
    showPreview();
  });
  editNameBtn?.addEventListener('click', showNameStep);
  openBtn?.addEventListener('click', () => openCertificate({ trigger: openBtn }));
  closeBtn?.addEventListener('click', closeCertificate);
  cancelBtn?.addEventListener('click', closeCertificate);
  modal?.addEventListener('click', event => { if (event.target === modal) closeCertificate(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && modal?.classList.contains('is-open')) closeCertificate(); });

  quizForm?.addEventListener('submit', () => {
    const passedBeforeSubmission = hasPassed();
    setTimeout(() => {
      syncCertificateButton();
      if (hasPassed()) {
        setStore(certificateScoreKey, bestScore());
        if (!passedBeforeSubmission) {
          ensureCertificateIssued();
          openCertificate({ requestName: true });
        }
      }
    }, 350);
  });
  resetQuizBtn?.addEventListener('click', () => {
    [certificateNameKey, certificateNumberKey, certificateDateKey, certificateScoreKey].forEach(removeStore);
    setTimeout(syncCertificateButton, 20);
  });

  function canvasText(ctx, text, x, y, options = {}) {
    const { font = '28px Arial', fill = '#333', align = 'center', maxWidth = null } = options;
    ctx.save(); ctx.font = font; ctx.fillStyle = fill; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    if (maxWidth) ctx.fillText(text, x, y, maxWidth); else ctx.fillText(text, x, y);
    ctx.restore();
  }
  function wrapLines(ctx, text, maxWidth) {
    const words = text.split(/\s+/); const lines = []; let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
    }
    if (line) lines.push(line); return lines;
  }
  function wrappedCanvasText(ctx, text, x, y, maxWidth, lineHeight, options = {}) {
    ctx.save(); ctx.font = options.font || '25px Arial'; ctx.fillStyle = options.fill || '#333'; ctx.textAlign = options.align || 'center'; ctx.textBaseline = 'alphabetic';
    const lines = wrapLines(ctx, text, maxWidth); lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight)); ctx.restore(); return y + (lines.length - 1) * lineHeight;
  }
  function drawGradientText(ctx, text, x, y, font, start, end) {
    ctx.save(); ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const gradient = ctx.createLinearGradient(x - 520, 0, x + 520, 0); gradient.addColorStop(0, start); gradient.addColorStop(.5, end); gradient.addColorStop(1, start); ctx.fillStyle = gradient; ctx.fillText(text, x, y); ctx.restore();
  }
  function waitForCertificateImage(image) {
    if (!image) return Promise.reject(new Error('A certificate image is missing.'));
    if (image.complete && image.naturalWidth > 0) return Promise.resolve(image);
    return new Promise((resolve, reject) => {
      const onLoad = () => { cleanup(); resolve(image); };
      const onError = () => { cleanup(); reject(new Error(`Certificate image failed to load: ${image.id || image.alt || 'unknown image'}`)); };
      const cleanup = () => { image.removeEventListener('load', onLoad); image.removeEventListener('error', onError); };
      image.addEventListener('load', onLoad, { once:true });
      image.addEventListener('error', onError, { once:true });
    });
  }
  function waitForCertificateImages() {
    return Promise.all([
      'recordingCertBrandImage',
      'recordingSignatureSimaunduChibbela',
      'recordingSignatureSimonJohnMwanza',
      'recordingSignatureJohnMwanza',
      'recordingCertFindatSealImage',
      'recordingCertSealImage'
    ].map(id => waitForCertificateImage(document.getElementById(id))));
  }
  function drawContainedImage(ctx, image, centerX, bottomY, maxWidth, maxHeight) {
    if (!image || !image.naturalWidth || !image.naturalHeight) return;
    const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    ctx.drawImage(image, centerX - width / 2, bottomY - height, width, height);
  }
  function drawCertificateCanvas() {
    const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1130;
    const ctx = canvas.getContext('2d'); const W = canvas.width; const H = canvas.height;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    const radial = ctx.createRadialGradient(W/2, H/2, 40, W/2, H/2, 820); radial.addColorStop(0, '#ffffff'); radial.addColorStop(1, '#f0f0ee'); ctx.fillStyle = radial; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 5; ctx.strokeRect(28, 28, W-56, H-56);
    ctx.strokeStyle = '#b18c2e'; ctx.lineWidth = 2; ctx.strokeRect(52, 52, W-104, H-104);

    const brandImage = document.getElementById('recordingCertBrandImage');
    if (brandImage && brandImage.complete) {
      const targetW = 520;
      const targetH = targetW * (brandImage.naturalHeight / brandImage.naturalWidth || 110 / 368);
      ctx.drawImage(brandImage, (W - targetW) / 2, 92, targetW, targetH);
    }

    canvasText(ctx, 'This is to Certify that', W/2, 292, { font:'25px Arial', fill:'#333' });

    const name = getStore(certificateNameKey, 'LEARNER NAME').toUpperCase();
    const nameFont = name.length > 40 ? 'bold 39px Georgia' : 'bold 45px Georgia';
    canvasText(ctx, name, W/2, 358, { font:nameFont, fill:'#172844', maxWidth:1250 });
    ctx.strokeStyle = '#bfa97a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(360, 376); ctx.lineTo(1240, 376); ctx.stroke();
    wrappedCanvasText(ctx, 'having satisfied all the requirements for the Certificate in', W/2, 432, 1250, 31, {font:'23px Arial',fill:'#333'});
    canvasText(ctx, COURSE_TITLE.toUpperCase(), W/2, 512, { font:'bold 46px Georgia', fill:'#27364b', maxWidth:1250 });
    wrappedCanvasText(ctx, 'is entitled to recognition, together with all the rights and privileges pertaining thereto', W/2, 582, 1300, 31, { font:'22px Arial', fill:'#333' });

    const signatures = [
      { name:'SIMAUNDU CHIBBELA', title:'Chair, Board of Governors', imageId:'recordingSignatureSimaunduChibbela' },
      { name:'SIMON JOHN MWANZA', title:'Chief Content Officer', imageId:'recordingSignatureSimonJohnMwanza' },
      { name:'JOHN MWANZA', title:'President and CEO', imageId:'recordingSignatureJohnMwanza' }
    ];
    [330,800,1270].forEach((x,index)=>{
      const signature = signatures[index];
      drawContainedImage(ctx, document.getElementById(signature.imageId), x, 812, 280, 82);
      ctx.strokeStyle='#6d7681';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-145,820);ctx.lineTo(x+145,820);ctx.stroke();
      canvasText(ctx, signature.name, x, 849, {font:'bold 18px Arial',fill:'#27364b'});
      canvasText(ctx, signature.title, x, 879, {font:'17px Arial',fill:'#27364b', maxWidth:250});
    });

    drawContainedImage(ctx, document.getElementById('recordingCertFindatSealImage'), 220, 1048, 190, 165);
    drawContainedImage(ctx, document.getElementById('recordingCertSealImage'), 500, 1044, 225, 155);
    ctx.strokeStyle='#ccc';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(680,944);ctx.lineTo(680,1048);ctx.stroke();
    canvasText(ctx, `Certificate No: ${certificateNumber()}`, 725, 1007, {font:'bold 18px Arial',fill:'#3e4855',align:'left',maxWidth:400});
    ctx.strokeStyle='#ccc';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(1150,944);ctx.lineTo(1150,1048);ctx.stroke();
    canvasText(ctx, `Date: ${certificateDate()}`, 1195, 1007, {font:'bold 18px Arial',fill:'#3e4855',align:'left',maxWidth:310});
    return canvas;
  }

  function asciiBytes(value) { return new TextEncoder().encode(value); }
  function joinBytes(parts) { const length = parts.reduce((n,p)=>n+p.length,0); const out = new Uint8Array(length); let offset=0; parts.forEach(p=>{out.set(p,offset);offset+=p.length}); return out; }
  function jpegDataFromCanvas(canvas) {
    const base64 = canvas.toDataURL('image/jpeg', .96).split(',')[1]; const binary = atob(base64); const bytes = new Uint8Array(binary.length); for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i); return bytes;
  }
  function buildPdfFromJpeg(jpeg, width, height) {
    const pageW = 841.89, pageH = 595.28;
    const objects = [];
    objects[1] = asciiBytes('<< /Type /Catalog /Pages 2 0 R >>');
    objects[2] = asciiBytes('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objects[3] = asciiBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`);
    const content = asciiBytes(`q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`);
    objects[4] = joinBytes([asciiBytes(`<< /Length ${content.length} >>\nstream\n`),content,asciiBytes('endstream')]);
    objects[5] = joinBytes([asciiBytes(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),jpeg,asciiBytes('\nendstream')]);
    const parts = [asciiBytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')]; const offsets=[0]; let length=parts[0].length;
    for(let i=1;i<=5;i++){offsets[i]=length;const obj=joinBytes([asciiBytes(`${i} 0 obj\n`),objects[i],asciiBytes('\nendobj\n')]);parts.push(obj);length+=obj.length;}
    const xrefOffset=length; let xref='xref\n0 6\n0000000000 65535 f \n'; for(let i=1;i<=5;i++) xref+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`; xref+=`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    parts.push(asciiBytes(xref)); return joinBytes(parts);
  }
  downloadBtn?.addEventListener('click', async () => {
    if (!validFullName(getStore(certificateNameKey, ''))) { showNameStep(); return; }
    status.textContent = 'Preparing the PDF certificate with signatures…'; downloadBtn.disabled = true;
    try {
      fillCertificate();
      await waitForCertificateImages();
      const canvas = drawCertificateCanvas(); const jpeg = jpegDataFromCanvas(canvas); const pdf = buildPdfFromJpeg(jpeg, canvas.width, canvas.height);
      const blob = new Blob([pdf], {type:'application/pdf'}); const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = `FINDAT-${COURSE_CODE}-Certificate-${escapeNameForFile(getStore(certificateNameKey,'Learner'))}.pdf`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),2000);
      status.textContent = 'Certificate PDF downloaded with all three signatures.';
    } catch (error) {
      console.error(error); status.textContent = 'The direct download could not be created. Use your browser print option and choose “Save as PDF”.';
      document.body.classList.add('recording-certificate-printing'); window.print(); setTimeout(()=>document.body.classList.remove('recording-certificate-printing'),500);
    } finally { downloadBtn.disabled = false; }
  });

  const video = document.getElementById('findatRecordingPlayer');
  video?.addEventListener('loadedmetadata', () => { if (!previewStep.hidden) fillCertificate(); });
  syncCertificateButton();
})();



/* ============================== Inline script 12 ============================== */

(()=>{
    const trigger=document.getElementById('globalInnovationNewsTrigger');
    const dropdown=document.getElementById('innovationNewsDropdown');
    const closeButton=document.getElementById('innovationNewsClose');
    const quickActions=trigger?.closest('.quick-actions');
    const galleryLink=document.getElementById('innovationGalleryLink');
    if(!trigger||!dropdown||!quickActions) return;

    const setOpen=(open,{returnFocus=false}={})=>{
      trigger.setAttribute('aria-expanded',String(open));
      trigger.classList.toggle('is-active',open);
      quickActions.classList.toggle('innovation-news-open',open);
      document.body.classList.toggle('innovation-news-menu-open',open);
      dropdown.hidden=!open;
      dropdown.setAttribute('aria-hidden',String(!open));
      if(open){
        const firstLink=dropdown.querySelector('a');
        window.requestAnimationFrame(()=>firstLink?.focus({preventScroll:true}));
      }else if(returnFocus){
        trigger.focus({preventScroll:true});
      }
    };

    trigger.addEventListener('click',event=>{
      event.preventDefault();
      const open=trigger.getAttribute('aria-expanded')!=='true';
      setOpen(open,{returnFocus:!open});
    });
    closeButton?.addEventListener('click',()=>setOpen(false,{returnFocus:true}));
    galleryLink?.addEventListener('click',()=>setOpen(false));
    dropdown.addEventListener('click',event=>{
      if(event.target.closest('.innovation-news-source')) setOpen(false);
    });
    document.addEventListener('click',event=>{
      if(trigger.getAttribute('aria-expanded')==='true'&&!quickActions.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&trigger.getAttribute('aria-expanded')==='true') setOpen(false,{returnFocus:true});
    });
  })();



/* ============================== Inline script 14 ============================== */

(()=>{
    const trigger=document.getElementById('securityWindowTrigger');
    const dropdown=document.getElementById('securityAwarenessDropdown');
    const closeButton=document.getElementById('securityAwarenessClose');
    const quickActions=trigger?.closest('.quick-actions');
    const innovationTrigger=document.getElementById('globalInnovationNewsTrigger');
    const checkButton=document.getElementById('securityCheckButton');
    const checkList=document.getElementById('securityCheckList');
    const checkResult=document.getElementById('securityCheckResult');
    if(!trigger||!dropdown||!quickActions) return;

    const setOpen=(open,{returnFocus=false}={})=>{
      if(open&&innovationTrigger?.getAttribute('aria-expanded')==='true') innovationTrigger.click();
      trigger.setAttribute('aria-expanded',String(open));
      trigger.classList.toggle('is-active',open);
      quickActions.classList.toggle('security-awareness-open',open);
      document.body.classList.toggle('security-awareness-menu-open',open);
      dropdown.hidden=!open;
      dropdown.setAttribute('aria-hidden',String(!open));
      if(open){
        window.requestAnimationFrame(()=>dropdown.querySelector('button,a,input')?.focus({preventScroll:true}));
      }else if(returnFocus){
        trigger.focus({preventScroll:true});
      }
    };

    trigger.addEventListener('click',event=>{
      event.preventDefault();
      const open=trigger.getAttribute('aria-expanded')!=='true';
      setOpen(open,{returnFocus:!open});
    });
    closeButton?.addEventListener('click',()=>setOpen(false,{returnFocus:true}));
    innovationTrigger?.addEventListener('click',()=>{
      if(trigger.getAttribute('aria-expanded')==='true') setOpen(false);
    });
    document.addEventListener('click',event=>{
      if(trigger.getAttribute('aria-expanded')==='true'&&!quickActions.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&trigger.getAttribute('aria-expanded')==='true') setOpen(false,{returnFocus:true});
    });

    checkButton?.addEventListener('click',()=>{
      const count=checkList?.querySelectorAll('input[type="checkbox"]:checked').length||0;
      checkResult.className='security-check-result';
      if(count===0){
        checkResult.textContent='No warning signs were selected. Still verify unfamiliar requests through an official contact channel before acting.';
      }else if(count<=2){
        checkResult.classList.add('is-warning');
        checkResult.textContent='This request is suspicious. Pause, do not share information or send money, and verify it independently.';
      }else{
        checkResult.classList.add('is-danger');
        checkResult.textContent='High fraud risk: do not proceed. End the contact and report it through your bank, provider, platform or regulator using verified details.';
      }
    });
  })();



/* ============================== Inline script 15 ============================== */

(()=>{
    const trigger=document.getElementById('developmentsTrigger');
    const dropdown=document.getElementById('developmentsDropdown');
    const closeButton=document.getElementById('developmentsClose');
    const quickActions=trigger?.closest('.quick-actions');
    const otherTriggers=['globalInnovationNewsTrigger','securityWindowTrigger','findatCloudTrigger'].map(id=>document.getElementById(id)).filter(Boolean);
    const bankRows=document.getElementById('x1BankRows');
    const cashRows=document.getElementById('x1CashRows');
    const bankClosing=document.getElementById('x1BankClosing');
    const cashClosing=document.getElementById('x1CashClosing');
    const status=document.getElementById('x1DemoStatus');
    const results=document.getElementById('x1Results');
    const entityName=document.getElementById('x1EntityName');
    const statementDate=document.getElementById('x1StatementDate');
    const preparedBy=document.getElementById('x1PreparedBy');
    const reportingCurrency=document.getElementById('x1ReportingCurrency');
    const accountantReport=document.getElementById('x1AccountantReport');
    let currentReportReference='';
    if(!trigger||!dropdown||!quickActions||!bankRows||!cashRows) return;

    const updateDevelopmentsViewport=()=>{
      if(dropdown.hidden) return;
      dropdown.style.setProperty('height','100dvh','important');
      dropdown.style.setProperty('max-height','none','important');
      dropdown.style.setProperty('top','0','important');
      dropdown.style.setProperty('bottom','0','important');
    };

    const currency=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:reportingCurrency?.value||'USD',minimumFractionDigits:2}).format(Number(value)||0);
    const accountingCurrency=value=>{const amount=number(value);return amount<0?`(${currency(Math.abs(amount))})`:currency(amount)};
    const number=value=>{
      const cleaned=String(value??'').replace(/[$,\s]/g,'');
      const parsed=Number(cleaned);
      return Number.isFinite(parsed)?parsed:0;
    };
    const sampleBank=[
      {date:'2026-07-01',id:'BANK-001',description:'Customer receipt',debit:'',credit:1200,balance:9100},
      {date:'2026-07-03',id:'BANK-002',description:'Supplier payment',debit:300,credit:'',balance:8800},
      {date:'2026-07-05',id:'BANK-003',description:'Collection by bank',debit:'',credit:450,balance:9250},
      {date:'2026-07-06',id:'BANK-004',description:'Service charge',debit:25,credit:'',balance:9225}
    ];
    const sampleCash=[
      {date:'2026-07-01',id:'CASH-001',description:'Customer receipt',debit:1200,credit:'',balance:9100},
      {date:'2026-07-03',id:'CASH-002',description:'Supplier payment',debit:'',credit:300,balance:8800},
      {date:'2026-07-07',id:'CASH-003',description:'Deposit in transit',debit:600,credit:'',balance:9400},
      {date:'2026-07-08',id:'CASH-004',description:'Outstanding payment',debit:'',credit:150,balance:9250}
    ];

    const setOpen=(open,{returnFocus=false}={})=>{
      if(open){
        otherTriggers.forEach(item=>{if(item.getAttribute('aria-expanded')==='true') item.click()});
      }
      trigger.setAttribute('aria-expanded',String(open));
      trigger.classList.toggle('is-active',open);
      quickActions.classList.toggle('developments-open',open);
      document.body.classList.toggle('developments-menu-open',open);
      document.documentElement.classList.toggle('developments-menu-open',open);
      dropdown.hidden=!open;
      dropdown.setAttribute('aria-hidden',String(!open));
      if(open){
        dropdown.scrollTop=0;
        window.requestAnimationFrame(()=>{
          updateDevelopmentsViewport();
          dropdown.querySelector('button,a,input')?.focus({preventScroll:true});
        });
      }else{
        dropdown.style.removeProperty('height');
        dropdown.style.removeProperty('max-height');
        if(returnFocus) trigger.focus({preventScroll:true});
      }
    };

    trigger.addEventListener('click',event=>{event.preventDefault();const open=trigger.getAttribute('aria-expanded')!=='true';setOpen(open,{returnFocus:!open})});
    window.addEventListener('resize',()=>{if(trigger.getAttribute('aria-expanded')==='true') updateDevelopmentsViewport()},{passive:true});
    closeButton?.addEventListener('click',()=>setOpen(false,{returnFocus:true}));
    otherTriggers.forEach(item=>item.addEventListener('click',()=>{if(trigger.getAttribute('aria-expanded')==='true') setOpen(false)}));
    document.addEventListener('click',event=>{if(trigger.getAttribute('aria-expanded')==='true'&&!quickActions.contains(event.target)) setOpen(false)});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&trigger.getAttribute('aria-expanded')==='true') setOpen(false,{returnFocus:true})});
    dropdown.querySelectorAll('[data-developments-scroll]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.developmentsScroll)?.scrollIntoView({behavior:'smooth',block:'start'})));

    function rowTemplate(data={}){
      const tr=document.createElement('tr');
      tr.innerHTML=`<td><input type="date" data-field="date" value="${String(data.date||'').replace(/"/g,'&quot;')}"></td><td><input type="text" data-field="id" value="${String(data.id||'').replace(/"/g,'&quot;')}" placeholder="ID"></td><td><input type="text" data-field="description" value="${String(data.description||'').replace(/"/g,'&quot;')}" placeholder="Description"></td><td><input type="number" data-field="debit" step="0.01" min="0" value="${data.debit??''}" placeholder="0.00"></td><td><input type="number" data-field="credit" step="0.01" min="0" value="${data.credit??''}" placeholder="0.00"></td><td><input type="number" data-field="balance" step="0.01" value="${data.balance??''}" placeholder="0.00"></td><td><button class="x1-row-remove" type="button" aria-label="Remove transaction"><i class="fas fa-times" aria-hidden="true"></i></button></td>`;
      tr.querySelector('.x1-row-remove').addEventListener('click',()=>tr.remove());
      return tr;
    }
    function renderRows(container,rows){container.replaceChildren(...rows.map(row=>rowTemplate(row)))}
    function addRow(container){container.appendChild(rowTemplate({date:new Date().toISOString().slice(0,10)}));container.lastElementChild?.querySelector('[data-field="id"]')?.focus()}
    function getRows(container){
      return [...container.querySelectorAll('tr')].map((tr,index)=>({
        date:tr.querySelector('[data-field="date"]')?.value||'',
        id:tr.querySelector('[data-field="id"]')?.value.trim()||`ROW-${index+1}`,
        description:tr.querySelector('[data-field="description"]')?.value.trim()||'',
        debit:number(tr.querySelector('[data-field="debit"]')?.value),
        credit:number(tr.querySelector('[data-field="credit"]')?.value),
        balance:number(tr.querySelector('[data-field="balance"]')?.value),
        matched:false
      })).filter(row=>row.debit>0||row.credit>0);
    }
    function updateCsvFileButton(input,type){
      const file=input?.files?.[0];
      const prefix=type==='Bank'?'x1BankCsv':'x1CashCsv';
      const button=document.getElementById(`${prefix}Button`);
      const label=document.getElementById(`${prefix}Label`);
      const name=document.getElementById(`${prefix}Name`);
      if(file){
        if(label) label.textContent=`${type} CSV selected`;
        if(name){name.textContent=file.name;name.title=file.name}
        if(button){button.title=`${type} file: ${file.name}`;button.setAttribute('aria-label',`${type} CSV selected: ${file.name}. Choose another file.`)}
      }else{
        if(label) label.textContent=`Import ${type.toLowerCase()} CSV`;
        if(name){name.textContent='No file selected';name.removeAttribute('title')}
        if(button){button.removeAttribute('title');button.setAttribute('aria-label',`Import ${type.toLowerCase()} CSV`)}
      }
    }
    function resetCsvFileControls(){
      const bankInput=document.getElementById('x1BankCsv');
      const cashInput=document.getElementById('x1CashCsv');
      if(bankInput) bankInput.value='';
      if(cashInput) cashInput.value='';
      updateCsvFileButton(bankInput,'Bank');
      updateCsvFileButton(cashInput,'Cash');
    }
    function loadSample(){
      renderRows(bankRows,sampleBank);renderRows(cashRows,sampleCash);bankClosing.value='9750';cashClosing.value='9775';results.hidden=true;resetCsvFileControls();
      status.textContent='The balanced sample is ready. It contains two matched transactions and four reconciliation exceptions.';status.className='x1-demo-status';
    }
    function clearDemo(){renderRows(bankRows,[]);renderRows(cashRows,[]);addRow(bankRows);addRow(cashRows);bankClosing.value='0';cashClosing.value='0';results.hidden=true;resetCsvFileControls();status.textContent='Tables cleared. Add transactions or import CSV files.';status.className='x1-demo-status'}

    function parseCsvLine(line){
      const values=[];let current='';let quoted=false;
      for(let i=0;i<line.length;i++){
        const char=line[i];
        if(char==='"'&&line[i+1]==='"'&&quoted){current+='"';i++}
        else if(char==='"'){quoted=!quoted}
        else if(char===','&&!quoted){values.push(current.trim());current=''}
        else current+=char;
      }
      values.push(current.trim());return values;
    }
    function validIsoDate(year,month,day){
      const y=Number(year),m=Number(month),d=Number(day);
      if(!Number.isInteger(y)||!Number.isInteger(m)||!Number.isInteger(d)||y<1900||y>2200||m<1||m>12||d<1||d>31) return '';
      const date=new Date(Date.UTC(y,m-1,d));
      return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d
        ?`${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`:'';
    }
    function normalizeCsvDate(value){
      const raw=String(value??'').trim().replace(/^['"]|['"]$/g,'');
      if(!raw) return '';

      // Excel/financial-system serial date values exported to CSV.
      if(/^\d+(?:\.\d+)?$/.test(raw)){
        const serial=Number(raw);
        if(serial>=20000&&serial<=90000){
          const date=new Date(Date.UTC(1899,11,30)+Math.floor(serial)*86400000);
          return date.toISOString().slice(0,10);
        }
      }

      // ISO or year-first formats, with or without a time component.
      let match=raw.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
      if(match) return validIsoDate(match[1],match[2],match[3]);

      // Day-first formats are the default for FINDAT/Zambian financial records.
      // If the second component is greater than 12, the value is treated as month/day/year.
      match=raw.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
      if(match){
        let first=Number(match[1]),second=Number(match[2]),year=Number(match[3]);
        if(year<100) year+=year>=70?1900:2000;
        const day=second>12?second:first;
        const month=second>12?first:second;
        return validIsoDate(year,month,day);
      }

      const months={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
      const words=raw.replace(/,/g,' ').replace(/\s+/g,' ').trim();
      match=words.match(/^(\d{1,2})[ -]([A-Za-z]{3,9})[ -](\d{2,4})/);
      if(match){
        let year=Number(match[3]);if(year<100) year+=year>=70?1900:2000;
        return validIsoDate(year,months[match[2].toLowerCase()],match[1]);
      }
      match=words.match(/^([A-Za-z]{3,9})[ -](\d{1,2})[ -](\d{2,4})/);
      if(match){
        let year=Number(match[3]);if(year<100) year+=year>=70?1900:2000;
        return validIsoDate(year,months[match[1].toLowerCase()],match[2]);
      }

      const parsed=new Date(raw);
      if(!Number.isNaN(parsed.getTime())) return validIsoDate(parsed.getFullYear(),parsed.getMonth()+1,parsed.getDate());
      return '';
    }
    function detectCsvDelimiter(headerLine){
      const candidates=[',',';','\t','|'];
      return candidates.sort((a,b)=>parseCsvLineWithDelimiter(headerLine,b).length-parseCsvLineWithDelimiter(headerLine,a).length)[0];
    }
    function parseCsvLineWithDelimiter(line,delimiter){
      const values=[];let current='';let quoted=false;
      for(let i=0;i<line.length;i++){
        const char=line[i];
        if(char==='"'&&line[i+1]==='"'&&quoted){current+='"';i++}
        else if(char==='"'){quoted=!quoted}
        else if(char===delimiter&&!quoted){values.push(current.trim());current=''}
        else current+=char;
      }
      values.push(current.trim());return values;
    }
    function csvToRows(text){
      const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(line=>line.trim());
      if(lines.length<2) throw new Error('The CSV needs a header row and at least one transaction.');
      const delimiter=detectCsvDelimiter(lines[0]);
      const parseLine=line=>parseCsvLineWithDelimiter(line,delimiter);
      const headers=parseLine(lines[0]).map(item=>item.toLowerCase().replace(/[^a-z0-9]/g,''));
      const indexFor=(...names)=>headers.findIndex(header=>names.includes(header));
      const dateIndex=indexFor('date','transactiondate','txndate','transdate','postingdate','posteddate','dateposted','valuedate','effectivedate','documentdate','entrydate','journaldate','processdate');
      const idIndex=indexFor('transactionid','transactionnumber','journalnumber','documentnumber','txnid','transid','id','reference','referencenumber');
      const descriptionIndex=indexFor('description','transactiondescription','details','narration','memo','memodescription');
      const debitIndex=indexFor('debit','debitamount','amountdebit','usddebit');
      const creditIndex=indexFor('credit','creditamount','amountcredit','usdcredit');
      const balanceIndex=indexFor('balance','closingbalance','runningbalance','runningtotal','usdrunningtotal');
      if(debitIndex<0&&creditIndex<0) throw new Error('CSV headers must include Debit and/or Credit.');
      const rows=lines.slice(1).map((line,rowIndex)=>{
        const cells=parseLine(line);
        const originalDate=dateIndex>=0?(cells[dateIndex]||''):'';
        return {
          date:normalizeCsvDate(originalDate),
          originalDate,
          id:idIndex>=0?(cells[idIndex]||`CSV-${rowIndex+1}`):`CSV-${rowIndex+1}`,
          description:descriptionIndex>=0?(cells[descriptionIndex]||''):'',
          debit:debitIndex>=0?number(cells[debitIndex]):'',
          credit:creditIndex>=0?number(cells[creditIndex]):'',
          balance:balanceIndex>=0?number(cells[balanceIndex]):null
        };
      }).filter(row=>number(row.debit)>0||number(row.credit)>0);
      if(!rows.length) throw new Error('No debit or credit amounts were found in the CSV.');
      rows.dateColumnFound=dateIndex>=0;
      rows.dateCount=rows.filter(row=>row.date).length;
      rows.unparsedDateCount=rows.filter(row=>row.originalDate&&!row.date).length;
      return rows;
    }
    async function importCsv(file,container,closingInput,label){
      if(!file) return;
      try{
        const rows=csvToRows(await file.text());
        renderRows(container,rows);
        const balances=rows.map(row=>row.balance).filter(value=>value!==null&&Number.isFinite(value));
        if(balances.length) closingInput.value=String(balances[balances.length-1]);
        const dateMessage=!rows.dateColumnFound
          ?' No recognised date column was found; use Date, Transaction Date, Posting Date or Value Date.'
          :rows.dateCount===rows.length
            ?` All ${rows.dateCount} date(s) were captured.`
            :` ${rows.dateCount} date(s) were captured${rows.unparsedDateCount?`; ${rows.unparsedDateCount} date value(s) need manual review`:''}.`;
        results.hidden=true;
        status.textContent=`${label} CSV imported: ${rows.length} transaction(s).${dateMessage} Review the values and run the reconciliation.`;
        status.className=rows.dateColumnFound&&rows.unparsedDateCount===0?'x1-demo-status is-success':'x1-demo-status';
      }catch(error){status.textContent=`Could not import ${label.toLowerCase()} CSV: ${error.message}`;status.className='x1-demo-status is-error'}
    }

    function matchTransactions(source,sourceField,target,targetField){
      if(window.X1TransformEngine?.smartMatchTransactions){
        window.X1TransformEngine.smartMatchTransactions(source,sourceField,target,targetField);
        return;
      }
      source.forEach(sourceRow=>{
        if(sourceRow.matched||sourceRow[sourceField]<=0) return;
        const match=target.find(targetRow=>!targetRow.matched&&targetRow[targetField]>0&&Math.abs(targetRow[targetField]-sourceRow[sourceField])<0.005);
        if(match){sourceRow.matched=true;match.matched=true}
      });
    }
    function sum(rows,field){return rows.reduce((total,row)=>total+(number(row[field])||0),0)}
    function setText(id,value){const element=document.getElementById(id);if(element) element.textContent=value}
    function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
    function formatReportDate(value){if(!value) return '—';const date=new Date(`${value}T00:00:00`);return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'long',year:'numeric'}).format(date)}
    function generateReportReference(){const date=(statementDate?.value||new Date().toISOString().slice(0,10)).replace(/-/g,'');const token=Math.random().toString(36).slice(2,7).toUpperCase();return `X1-BRS-${date}-${token}`}
    function updateReportMetadata(){setText('x1ReportEntity',entityName?.value.trim()||'Unnamed Entity');setText('x1ReportDate',formatReportDate(statementDate?.value));setText('x1ReportReference',currentReportReference||'—');setText('x1PreparedByDisplay',preparedBy?.value.trim()||'Not specified');setText('x1PreparedDateDisplay',formatReportDate(statementDate?.value))}
    function renderAdjustmentRows(id,rows,field){const body=document.getElementById(id);if(!body) return;if(!rows.length){body.innerHTML='<tr><td class="x1-support-empty" colspan="3">No reconciling items identified</td></tr>';return}body.innerHTML=rows.map(row=>`<tr><td>${escapeHtml(row.date||'—')}</td><td>${escapeHtml(row.id||'—')}</td><td>${escapeHtml(currency(row[field]))}</td></tr>`).join('')}
    function populateAccountantReport({bankClosingBalance,cashClosingBalance,depositTransit,outstandingChecks,bankCollections,serviceCharges,adjustedBank,adjustedCash,balanced,unmatchedCashDebits,unmatchedCashCredits,unmatchedBankCredits,unmatchedBankDebits}){
      currentReportReference=generateReportReference();updateReportMetadata();
      const difference=adjustedBank-adjustedCash;
      const values={
        x1StatementBankClosing:currency(bankClosingBalance),x1StatementDeposits:currency(depositTransit),x1StatementOutstanding:accountingCurrency(-outstandingChecks),x1StatementAdjustedBank:currency(adjustedBank),x1StatementCashClosing:currency(cashClosingBalance),x1StatementCollections:currency(bankCollections),x1StatementCharges:accountingCurrency(-serviceCharges),x1StatementUpdatedCash:currency(adjustedCash),x1StatementDifference:accountingCurrency(difference),
        x1BankAccountClosing:currency(bankClosingBalance),x1BankAccountDeposits:currency(depositTransit),x1BankAccountOutstanding:accountingCurrency(-outstandingChecks),x1BankAccountAdjusted:currency(adjustedBank),x1CashAccountClosing:currency(cashClosingBalance),x1CashAccountCollections:currency(bankCollections),x1CashAccountCharges:accountingCurrency(-serviceCharges),x1CashAccountAdjusted:currency(adjustedCash),
        x1DepositScheduleTotal:currency(depositTransit),x1OutstandingScheduleTotal:currency(outstandingChecks),x1CollectionScheduleTotal:currency(bankCollections),x1ChargeScheduleTotal:currency(serviceCharges)
      };
      Object.entries(values).forEach(([id,value])=>setText(id,value));
      renderAdjustmentRows('x1DepositDetails',unmatchedCashDebits,'debit');renderAdjustmentRows('x1OutstandingDetails',unmatchedCashCredits,'credit');renderAdjustmentRows('x1CollectionDetails',unmatchedBankCredits,'credit');renderAdjustmentRows('x1ChargeDetails',unmatchedBankDebits,'debit');
      const reportStatus=document.getElementById('x1ReportStatus');if(reportStatus){reportStatus.textContent=balanced?'Reconciled':'Unreconciled';reportStatus.className=`x1-report-status ${balanced?'is-reconciled':'is-unreconciled'}`}
      setText('x1ReportConclusion',balanced?`The adjusted bank balance and updated cash-account balance both agree at ${currency(adjustedBank)}. Subject to review of the listed reconciling items and supporting evidence, the bank account is reconciled as at ${formatReportDate(statementDate?.value)}.`:`The adjusted bank balance is ${currency(adjustedBank)} while the updated cash-account balance is ${currency(adjustedCash)}, leaving an unreconciled difference of ${accountingCurrency(difference)}. The difference must be investigated and corrected before this working paper is approved.`)
    }
    function printAccountantStatement(){
      if(results.hidden||!accountantReport){status.textContent='Run the reconciliation before printing the accountant statement.';status.className='x1-demo-status is-error';return}
      const printWindow=window.open('','_blank','width=1100,height=820');if(!printWindow){status.textContent='The print window was blocked. Allow pop-ups for this page and try again.';status.className='x1-demo-status is-error';return}printWindow.opener=null;
      printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(entityName?.value||'x1')} - Bank Reconciliation Statement</title><style>@page{size:A4;margin:15mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#24344b;margin:0;font-size:11px}.x1-accountant-report{border:1px solid #9da8b4}.x1-report-letterhead{display:flex;justify-content:space-between;gap:20px;padding:18px;border-bottom:3px solid #26364d}.x1-report-brand{display:flex;gap:12px}.x1-report-mark{width:42px;height:42px;background:#f58220;color:#fff;display:grid;place-items:center;border-radius:4px 4px 16px 4px}.x1-report-brand h3{font-family:Georgia,serif;margin:0 0 4px;font-size:19px}.x1-report-brand p,.x1-report-meta{margin:0;color:#5f6d80;font-size:10px;line-height:1.5}.x1-report-meta{text-align:right}.x1-report-status{display:inline-block;margin-top:5px;padding:4px 8px;border:1px solid #8f99a6;border-radius:999px;font-weight:bold}.x1-report-body{padding:18px}.x1-report-title{text-align:center;margin-bottom:14px}.x1-report-title h4{font-family:Georgia,serif;text-transform:uppercase;letter-spacing:.05em;margin:0;font-size:17px}.x1-report-title p{margin:4px 0;color:#667487}.x1-report-table{width:100%;border-collapse:collapse}.x1-report-table th,.x1-report-table td{border:1px solid #b8c0c8;padding:7px}.x1-report-table th{background:#26364d!important;color:#fff!important;text-align:left;-webkit-print-color-adjust:exact;print-color-adjust:exact}.x1-report-table th:last-child,.x1-report-table td:last-child{text-align:right}.is-subtotal td,.is-final td,.is-difference td{font-weight:bold}.is-final td{border-top:3px double #26364d;border-bottom:3px double #26364d;background:#fff5e9!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.x1-account-schedules,.x1-support-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.x1-account-card,.x1-support-card{border:1px solid #bdc5cd}.x1-account-card h5,.x1-support-card h6{margin:0;padding:8px;background:#eef1f4!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.x1-supporting-schedules>h5{font-family:Georgia,serif;font-size:13px;margin:16px 0 8px}.x1-support-table{width:100%;border-collapse:collapse;font-size:9px}.x1-support-table th,.x1-support-table td{padding:6px;border-top:1px solid #d5dbe1;text-align:left}.x1-support-table th:last-child,.x1-support-table td:last-child{text-align:right}.x1-report-conclusion{margin-top:16px;padding:12px;border-left:4px solid #26364d;background:#f2f4f6!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.x1-report-conclusion i{display:none}.x1-report-conclusion strong{display:block;margin-bottom:3px}.x1-report-conclusion p{margin:0;line-height:1.45}.x1-report-signoff{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:30px}.x1-signature-line{border-top:1px solid #333;padding-top:6px}.x1-signature-line strong{display:block}.x1-report-indent{padding-left:22px!important}.x1-report-negative{color:#9a3524}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body>${accountantReport.outerHTML}</body></html>`);printWindow.document.close();printWindow.focus();setTimeout(()=>printWindow.print(),250)
    }
    function runDemo(){
      window.X1TransformEngine?.beginReconciliation?.();
      const bank=getRows(bankRows);const cash=getRows(cashRows);
      if(!bank.length||!cash.length){status.textContent='Add at least one bank transaction and one cash transaction before running the test.';status.className='x1-demo-status is-error';results.hidden=true;return}
      matchTransactions(cash,'debit',bank,'credit');
      matchTransactions(cash,'credit',bank,'debit');
      const unmatchedCashDebits=cash.filter(row=>row.debit>0&&!row.matched);
      const unmatchedCashCredits=cash.filter(row=>row.credit>0&&!row.matched);
      const unmatchedBankCredits=bank.filter(row=>row.credit>0&&!row.matched);
      const unmatchedBankDebits=bank.filter(row=>row.debit>0&&!row.matched);
      const depositTransit=sum(unmatchedCashDebits,'debit');
      const outstandingChecks=sum(unmatchedCashCredits,'credit');
      const bankCollections=sum(unmatchedBankCredits,'credit');
      const serviceCharges=sum(unmatchedBankDebits,'debit');
      const bankClosingBalance=number(bankClosing.value);
      const cashClosingBalance=number(cashClosing.value);
      const adjustedBank=bankClosingBalance+depositTransit-outstandingChecks;
      const adjustedCash=cashClosingBalance+bankCollections-serviceCharges;
      const balanced=Math.abs(adjustedBank-adjustedCash)<0.005;
      const matchedRows=bank.filter(row=>row.matched).length+cash.filter(row=>row.matched).length;
      const unmatchedRows=bank.length+cash.length-matchedRows;
      setText('x1MatchedCount',String(matchedRows));setText('x1UnmatchedCount',String(unmatchedRows));setText('x1AdjustedBank',currency(adjustedBank));setText('x1AdjustedCash',currency(adjustedCash));setText('x1BalanceStatus',balanced?'Balanced':'Review required');
      const metric=document.getElementById('x1BalanceMetric');metric?.classList.toggle('is-good',balanced);metric?.classList.toggle('is-warning',!balanced);
      setText('x1DepositTransit',currency(depositTransit));setText('x1OutstandingChecks',currency(outstandingChecks));setText('x1BankCollections',currency(bankCollections));setText('x1ServiceCharges',currency(serviceCharges));
      setText('x1DepositCount',`${unmatchedCashDebits.length} cash debit item(s)`);setText('x1OutstandingCount',`${unmatchedCashCredits.length} cash credit item(s)`);setText('x1CollectionCount',`${unmatchedBankCredits.length} bank credit item(s)`);setText('x1ServiceCount',`${unmatchedBankDebits.length} bank debit item(s)`);
      setText('x1BankBarValue',currency(adjustedBank));setText('x1CashBarValue',currency(adjustedCash));
      const max=Math.max(Math.abs(adjustedBank),Math.abs(adjustedCash),1);document.getElementById('x1BankBar').style.width=`${Math.max(3,Math.abs(adjustedBank)/max*100)}%`;document.getElementById('x1CashBar').style.width=`${Math.max(3,Math.abs(adjustedCash)/max*100)}%`;
      populateAccountantReport({bankClosingBalance,cashClosingBalance,depositTransit,outstandingChecks,bankCollections,serviceCharges,adjustedBank,adjustedCash,balanced,unmatchedCashDebits,unmatchedCashCredits,unmatchedBankCredits,unmatchedBankDebits});
      const mlSettings=window.X1TransformEngine?.getMachineLearningSettings?.();
      const mlSummary=window.X1TransformEngine?.getLastMatchSummary?.();
      const mlMessage=mlSettings?.enabled?` Machine learning accepted ${mlSummary?.approximate||0} approximate match(es) within the configured tolerance.`:' Exact one-to-one amount matching was used.';
      results.hidden=false;status.textContent=(balanced?'Reconciliation complete: the full Bank Reconciliation Statement and updated accounts have been prepared.':'Reconciliation complete: the accountant statement has been prepared, but the remaining difference requires investigation.')+mlMessage;status.className=`x1-demo-status ${balanced?'is-success':'is-error'}`;results.scrollIntoView({behavior:'smooth',block:'nearest'});
    }

    document.getElementById('x1LoadSample')?.addEventListener('click',loadSample);
    document.getElementById('x1ClearDemo')?.addEventListener('click',clearDemo);
    document.getElementById('x1AddBankRow')?.addEventListener('click',()=>addRow(bankRows));
    document.getElementById('x1AddCashRow')?.addEventListener('click',()=>addRow(cashRows));
    document.getElementById('x1RunDemo')?.addEventListener('click',runDemo);
    document.getElementById('x1BankCsv')?.addEventListener('change',event=>{updateCsvFileButton(event.target,'Bank');importCsv(event.target.files?.[0],bankRows,bankClosing,'Bank')});
    document.getElementById('x1CashCsv')?.addEventListener('change',event=>{updateCsvFileButton(event.target,'Cash');importCsv(event.target.files?.[0],cashRows,cashClosing,'Cash')});
    document.getElementById('x1PrintStatement')?.addEventListener('click',printAccountantStatement);
    [entityName,statementDate,preparedBy].forEach(element=>element?.addEventListener('input',updateReportMetadata));
    reportingCurrency?.addEventListener('change',()=>{if(!results.hidden) runDemo()});
    if(statementDate&&!statementDate.value) statementDate.value=new Date().toISOString().slice(0,10);
    updateReportMetadata();
    loadSample();
  })();



/* ============================== Inline script 16 ============================== */

(()=>{
    const store=document.getElementById('developmentsStoreView');
    const workspace=document.getElementById('x1AppWorkspace');
    const appSearch=document.getElementById('developmentsAppSearch');
    const results=document.getElementById('x1Results');
    const runButton=document.getElementById('x1RunDemo');
    const workspaceTabs=[...document.querySelectorAll('[data-x1-workspace-tab]')];
    const workspacePanels=[...document.querySelectorAll('[data-x1-workspace-panel]')];
    const stageButtons=[...document.querySelectorAll('[data-x1-stage]')];
    const stagePanels=[...document.querySelectorAll('[data-x1-stage-panel]')];

    function selectWorkspacePanel(name,focus=false){
      workspaceTabs.forEach(button=>button.classList.toggle('is-active',button.dataset.x1WorkspaceTab===name));
      document.querySelectorAll('[data-x1-open-workflow]').forEach(button=>button.classList.remove('is-active'));
      workspacePanels.forEach(panel=>panel.hidden=panel.dataset.x1WorkspacePanel!==name);
      if(focus){workspace?.scrollIntoView({behavior:'smooth',block:'start'});}
    }
    function openX1(){
      store.hidden=true;workspace.hidden=false;selectWorkspacePanel('home');
      workspace.scrollIntoView({behavior:'smooth',block:'start'});
    }
    function closeX1(){
      workspace.hidden=true;store.hidden=false;store.scrollIntoView({behavior:'smooth',block:'start'});
    }
    function selectStage(name){
      if((name==='review'||name==='statement')&&results?.hidden)return;
      stageButtons.forEach(button=>button.classList.toggle('is-active',button.dataset.x1Stage===name));
      stagePanels.forEach(panel=>panel.hidden=panel.dataset.x1StagePanel!==name);
      document.getElementById('x1Demo')?.scrollIntoView({behavior:'smooth',block:'start'});
    }
    function enableResultStages(){
      stageButtons.filter(button=>button.dataset.x1Stage!=='data').forEach(button=>button.disabled=false);
    }
    function resetResultStages(){
      stageButtons.filter(button=>button.dataset.x1Stage!=='data').forEach(button=>button.disabled=true);
      selectStage('data');
    }
    function invalidateResults(){
      if(results&&!results.hidden){
        results.hidden=true;
        resetResultStages();
        const message=document.getElementById('x1DemoStatus');
        if(message){message.textContent='The records changed. Run the reconciliation again to refresh the review and accountant statement.';message.className='x1-demo-status';}
      }
    }

    document.querySelectorAll('[data-open-x1-app]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();openX1();}));
    const availableCard=document.querySelector('.dev-app-card.is-available');
    availableCard?.addEventListener('click',event=>{if(!event.target.closest('button,a,input,label'))openX1();});
    availableCard?.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openX1();}});
    document.getElementById('x1BackToApps')?.addEventListener('click',closeX1);
    workspaceTabs.forEach(button=>button.addEventListener('click',()=>selectWorkspacePanel(button.dataset.x1WorkspaceTab,true)));
    document.querySelectorAll('[data-x1-go-workbench]').forEach(button=>button.addEventListener('click',()=>selectWorkspacePanel('workbench',true)));
    stageButtons.forEach(button=>button.addEventListener('click',()=>selectStage(button.dataset.x1Stage)));
    document.querySelectorAll('[data-x1-stage-next]').forEach(button=>button.addEventListener('click',()=>selectStage(button.dataset.x1StageNext)));
    runButton?.addEventListener('click',()=>setTimeout(()=>{if(results&&!results.hidden){enableResultStages();selectStage('review');}},0));
    document.getElementById('x1LoadSample')?.addEventListener('click',()=>setTimeout(resetResultStages,0));
    document.getElementById('x1ClearDemo')?.addEventListener('click',()=>setTimeout(resetResultStages,0));
    document.getElementById('x1BankCsv')?.addEventListener('change',resetResultStages);
    document.getElementById('x1CashCsv')?.addEventListener('change',resetResultStages);
    document.getElementById('x1BankRows')?.addEventListener('input',invalidateResults);
    document.getElementById('x1CashRows')?.addEventListener('input',invalidateResults);
    document.getElementById('x1BankClosing')?.addEventListener('input',invalidateResults);
    document.getElementById('x1CashClosing')?.addEventListener('input',invalidateResults);
    appSearch?.addEventListener('input',()=>{
      const query=appSearch.value.trim().toLowerCase();
      document.querySelectorAll('#developmentsAppGrid [data-app-name]').forEach(card=>{card.hidden=Boolean(query)&&!card.dataset.appName.toLowerCase().includes(query);});
    });
  })();



/* ============================== Inline script 17 ============================== */

(()=>{
  if(window.FindatOCR)return;
  const DEFAULT_SCALE=1.9;
  let workerPromise=null;
  let activeProgress=null;

  function cleanText(value){
    return String(value||'').replace(/\u0000/g,' ').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  }
  function needsOcr(text,itemCount=0){
    const source=cleanText(text),compact=source.replace(/\s/g,'');
    const readable=(source.match(/[A-Za-z0-9]/g)||[]).length/Math.max(compact.length,1);
    return itemCount<6||source.length<120||readable<.55;
  }
  function parseTsv(tsv){
    const rows=String(tsv||'').split(/\r?\n/);if(rows.length<2)return[];
    const headers=rows.shift().split('\t');
    const index=name=>headers.indexOf(name);
    const level=index('level'),text=index('text'),conf=index('conf'),left=index('left'),top=index('top'),width=index('width'),height=index('height');
    return rows.map(row=>row.split('\t')).filter(cells=>Number(cells[level])===5&&String(cells[text]||'').trim()).map(cells=>({
      text:String(cells[text]||'').trim(),confidence:Number(cells[conf]||0),bbox:{x0:Number(cells[left]||0),y0:Number(cells[top]||0),x1:Number(cells[left]||0)+Number(cells[width]||0),y1:Number(cells[top]||0)+Number(cells[height]||0)}
    }));
  }
  function nestedWords(data){
    if(Array.isArray(data?.words)&&data.words.length)return data.words.map(word=>({text:String(word.text||'').trim(),confidence:Number(word.confidence??word.conf??0),bbox:word.bbox})).filter(word=>word.text&&word.bbox);
    const words=[];
    const visit=node=>{
      if(!node)return;
      if(Array.isArray(node)){node.forEach(visit);return;}
      if(typeof node!=='object')return;
      if(node.text&&node.bbox&&!node.words&&!node.symbols)words.push({text:String(node.text).trim(),confidence:Number(node.confidence??node.conf??0),bbox:node.bbox});
      ['blocks','paragraphs','lines','words','symbols'].forEach(key=>visit(node[key]));
    };
    visit(data?.blocks);
    return words.filter(word=>word.text&&word.bbox);
  }
  async function getWorker(){
    if(!window.Tesseract?.createWorker)throw new Error('The OCR text-recognition engine could not load. Check the internet connection and reload the page.');
    if(!workerPromise){
      workerPromise=(async()=>{
        const worker=await window.Tesseract.createWorker('eng',1,{logger:message=>{
          try{activeProgress?.(message);}catch(error){}
          try{document.dispatchEvent(new CustomEvent('findat:ocr-progress',{detail:message}));}catch(error){}
        }});
        try{await worker.setParameters({preserve_interword_spaces:'1',user_defined_dpi:'300'});}catch(error){}
        return worker;
      })().catch(error=>{workerPromise=null;throw error;});
    }
    return workerPromise;
  }
  async function recognizeCanvas(canvas,{onProgress}={}){
    activeProgress=typeof onProgress==='function'?onProgress:null;
    try{
      const worker=await getWorker();
      let result;
      try{result=await worker.recognize(canvas,{}, {text:true,tsv:true,blocks:true});}
      catch(error){result=await worker.recognize(canvas);}
      const data=result?.data||result||{};
      let words=nestedWords(data);
      if(!words.length&&data.tsv)words=parseTsv(data.tsv);
      const confidence=Number(data.confidence||0);
      return{text:cleanText(data.text),words,confidence};
    }finally{activeProgress=null;}
  }
  async function recognizePdfPage(page,{scale=DEFAULT_SCALE,onProgress}={}){
    const pdfViewport=page.getViewport({scale:1});
    const renderViewport=page.getViewport({scale});
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.ceil(renderViewport.width));
    canvas.height=Math.max(1,Math.ceil(renderViewport.height));
    const context=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
    context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
    await page.render({canvasContext:context,viewport:renderViewport,background:'#ffffff'}).promise;
    const result=await recognizeCanvas(canvas,{onProgress});
    const items=result.words.map(word=>{
      const box=word.bbox||{};
      const x0=Number(box.x0??box.left??0),y0=Number(box.y0??box.top??0),x1=Number(box.x1??(x0+(box.width||0))),y1=Number(box.y1??(y0+(box.height||0)));
      const x=x0/canvas.width*pdfViewport.width;
      const width=Math.max(1,(x1-x0)/canvas.width*pdfViewport.width);
      const height=Math.max(1,(y1-y0)/canvas.height*pdfViewport.height);
      const y=pdfViewport.height-y1/canvas.height*pdfViewport.height;
      return{str:word.text,transform:[1,0,0,height,x,y],width,height,confidence:word.confidence,hasEOL:false};
    }).filter(item=>item.str);
    canvas.width=1;canvas.height=1;
    return{...result,items,viewport:pdfViewport};
  }
  function mergeText(nativeText,ocrText){
    const nativeClean=cleanText(nativeText),ocrClean=cleanText(ocrText);
    if(!nativeClean)return ocrClean;if(!ocrClean)return nativeClean;
    const norm=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const nativeNorm=norm(nativeClean),ocrNorm=norm(ocrClean);
    if(nativeNorm.includes(ocrNorm.slice(0,Math.min(120,ocrNorm.length))))return nativeClean.length>=ocrClean.length?nativeClean:ocrClean;
    if(ocrNorm.includes(nativeNorm.slice(0,Math.min(120,nativeNorm.length))))return ocrClean.length>=nativeClean.length?ocrClean:nativeClean;
    const nativeWords=new Set(nativeNorm.split(' ').filter(Boolean));
    const ocrWords=ocrNorm.split(' ').filter(Boolean);
    const newRatio=ocrWords.filter(word=>!nativeWords.has(word)).length/Math.max(ocrWords.length,1);
    return newRatio>.28?`${nativeClean}\n\n${ocrClean}`:(nativeClean.length>=ocrClean.length?nativeClean:ocrClean);
  }
  window.FindatOCR={recognizeCanvas,recognizePdfPage,needsOcr,mergeText,cleanText,getWorker};
})();



/* ============================== Inline script 18 ============================== */

(()=>{
  const workspace=document.getElementById('x1AppWorkspace');
  const composer=document.getElementById('x1FintechComposer');
  const promptInput=document.getElementById('x1PromptInput');
  const sendButton=document.getElementById('x1ComposerSend');
  const chatThread=document.getElementById('x1ChatThread');
  const brainStatus=document.getElementById('x1BrainStatus');
  const brainStatusText=document.getElementById('x1BrainStatusText');
  const brainModeLabel=document.getElementById('x1BrainModeLabel');
  const recent=document.getElementById('x1RecentAnalyses');
  const clearRecentButton=document.getElementById('x1ClearRecentAnalyses');
  const clearConversationButton=document.getElementById('x1ClearConversation');
  const recentEmpty=document.getElementById('x1RecentAnalysesEmpty');
  const resultBox=document.getElementById('x1Results');
  const knowledgeModal=document.getElementById('x1KnowledgeModal');
  const knowledgeManagerButton=document.getElementById('x1KnowledgeManager');
  const knowledgeUpload=document.getElementById('x1KnowledgeUpload');
  const localLlmToggle=document.getElementById('x1LocalLlmToggle');
  const endpointInput=document.getElementById('x1OllamaEndpoint');
  const modelInput=document.getElementById('x1OllamaModel');
  const recentStorageKey='findat_x1_recent_analyses_v3';
  const conversationStorageKey='findat_x1_rag_conversation_v2';
  const importedStorageKey='findat_x1_imported_knowledge_v2';
  const ollamaStorageKey='findat_x1_ollama_settings_v1';
  const BUILT_IN_KB=[{"id":"identity","title":"x1 identity and reasoning architecture","tags":["identity","brain","ai","assistant","conscious","self aware","self-aware","reasoning"],"text":"x1 is an embedded browser-based financial reasoning assistant. It combines an application-control layer, an indexed knowledge base, BM25 and fuzzy retrieval, a compact neural intent classifier, a response planner, a structured writer, a quality reviewer and local conversation memory. It can inspect software state, but it does not have feelings, subjective awareness or genuine consciousness.","points":["Runs inside the HTML file by default.","Uses retrieved evidence before composing an answer.","Can open FINDAT workspaces only when the prompt is an explicit instruction."],"source":"FINDAT x1 application knowledge","kind":"system"},{"id":"rag_architecture","title":"retrieval-augmented chatbot architecture","tags":["rag","retrieval augmented generation","chatbot architecture","planner writer reviewer","knowledge base","embedding","vector database"],"text":"A reliable knowledge chatbot separates document ingestion, chunking, indexing, retrieval, planning, answer composition and review. In this HTML build, source material is summarised into evidence units, indexed locally, ranked for each question and passed through a planner–writer–reviewer pipeline. Optional local Ollama generation can use the same retrieved evidence when a compatible local model is running.","steps":["Ingest and clean source documents.","Split material into focused evidence units.","Build a searchable local index.","Retrieve the most relevant units for the prompt.","Plan the answer and select a response mode.","Write and review the final response."],"source":"Adapted chatbot and PDF-RAG architecture","kind":"system"},{"id":"capabilities","title":"x1 application capabilities","tags":["capabilities","what can you do","features","help","financial assistant"],"text":"x1 can explain financial, accounting and forensic-investigation concepts; ingest local knowledge documents; transform CSV, Excel, JSON and PDF data, including scanned PDFs through automatic OCR; build visual workflows; reconcile bank and cash records; review exceptions; update accounts; and prepare accountant-ready reports. Explicit commands can open the relevant FINDAT workspace.","points":["Knowledge Q&A stays in the assistant workspace.","Operational commands can open Transform Data, Workflows, Reconciliation or Reporting.","Imported knowledge remains in the current browser unless cleared."],"source":"FINDAT x1 application knowledge","kind":"system"},{"id":"workflow_overview","title":"visual workflow design","tags":["workflow","nodes","pipeline","automation","alteryx","knime","n8n","drag drop"],"text":"The Workflows workspace is a node-based data pipeline. Document inputs feed preparation, combination and financial-operation nodes, and the flow ends in preview, export or reporting nodes. Connections define dependency order, while Join and Reconcile nodes accept two incoming streams.","steps":["Add source-document nodes.","Connect outputs to the next required inputs.","Clean and standardise fields before combining data.","Run reconciliation or aggregation.","Preview exceptions and export governed outputs."],"source":"FINDAT x1 application knowledge","kind":"application"},{"id":"workflow_nodes","title":"available workflow nodes","tags":["workflow node","document input","manual data","clean data","filter","select columns","formula","join","union","reconcile","aggregate","export"],"text":"Available workflow nodes include Document Input, Manual Data, Clean Data, Filter Rows, Select Columns, Formula, Join, Union, Reconcile, Aggregate, Data Preview, Export CSV and Report. The editor supports drag-and-drop placement, pull-to-connect ports, zoom, fit, auto-layout, run logs, browser saving and JSON workflow import or export.","source":"FINDAT x1 application knowledge","kind":"application"},{"id":"workflow_method","title":"recommended financial workflow pattern","tags":["build workflow","workflow steps","pipeline design","control totals","governance"],"text":"A dependable financial workflow preserves source evidence, validates structure early, standardises data before matching, records exceptions separately and produces control totals before export. Each processing node should have a clear input, transformation rule, output and review purpose.","steps":["Load source documents without altering the originals.","Validate headers, dates, amounts and identifiers.","Remove empty rows and identify duplicates.","Select and standardise required fields.","Join or reconcile datasets.","Review unmatched records and control totals.","Preview, approve and export the result."],"source":"FINDAT x1 application knowledge","kind":"application"},{"id":"transform","title":"data transformation","tags":["transform","clean","csv","excel","xlsx","json","pdf","import","upload","data preparation"],"text":"Transform Data prepares records for analysis by recognising headers, normalising dates and amounts, trimming text, identifying missing values, checking duplicates, filtering rows, applying formulas and producing structured datasets for reconciliation or reporting.","source":"FINDAT x1 application knowledge","kind":"application"},{"id":"file_formats","title":"supported knowledge and transaction documents","tags":["file","csv","xlsx","xls","excel","json","pdf","txt","markdown","document"],"text":"The transaction workspace supports structured financial data inputs. The assistant document manager accepts PDF, Excel XLS/XLSX and Microsoft Word DOCX files. PDF pages use selectable-text extraction and automatically switch to OCR text recognition for scanned, image-only or low-text pages. It creates executive summaries, searchable evidence, spreadsheet profiling, management insights and visual reports. OCR results should be reviewed against the original document because image quality can affect recognition accuracy.","source":"FINDAT x1 application knowledge","kind":"application"},{"id":"reconciliation","title":"bank reconciliation","tags":["bank reconciliation","reconcile","bank","cash book","cash ledger","balance"],"text":"Bank reconciliation compares the bank statement with the entity cash book or cash ledger for the same period. It identifies timing differences, bank-originated entries and errors, then calculates adjusted bank and adjusted cash balances. A complete reconciliation explains every difference and ends with equal adjusted balances.","steps":["Confirm the period and closing balances.","Match deposits and payments across both records.","Classify timing differences and bank-originated entries.","Correct book errors and record missing bank items.","Calculate adjusted balances.","Investigate and support every remaining exception."],"source":"FINDAT x1 application knowledge","kind":"finance"},{"id":"recon_formula","title":"bank reconciliation formulas","tags":["adjusted bank","adjusted cash","formula","reconciliation calculation"],"text":"Adjusted bank balance generally starts with the bank-statement closing balance, adds deposits in transit, subtracts outstanding payments and corrects bank errors. Adjusted cash-book balance generally starts with the cash-book closing balance, adds direct bank credits and interest, subtracts charges, direct debits and dishonoured receipts, and corrects book errors.","source":"FINDAT x1 application knowledge","kind":"finance"},{"id":"exceptions","title":"reconciling items and exceptions","tags":["exception","unmatched","deposit in transit","outstanding cheque","bank charge","direct credit","dishonoured"],"text":"Common reconciling items include deposits in transit, outstanding cheques or electronic payments, bank charges, interest, direct deposits, standing orders, dishonoured receipts, duplicates, amount differences, date differences and errors by either the bank or the entity.","redFlags":["Old unmatched items that roll forward repeatedly.","Duplicate references or duplicated amounts.","Large round-sum transactions without clear descriptions.","Transactions posted outside the expected period.","Manual adjustments lacking approval or evidence."],"source":"FINDAT x1 application knowledge","kind":"finance"},{"id":"journal_entries","title":"journal treatment of reconciliation items","tags":["journal","entry","bank charges","direct deposit","cash book adjustment","correction"],"text":"Timing items already recorded in the cash book, such as deposits in transit and outstanding payments, normally do not require a new journal entry. Bank-originated items not yet in the books normally require cash-book or general-ledger entries. Errors are corrected by the party that made them and should retain an audit trail.","source":"FINDAT x1 application knowledge","kind":"finance"},{"id":"reports","title":"accountant-ready reconciliation reporting","tags":["report","statement","updated bank","updated cash","accountant","audit evidence"],"text":"The reporting stage should present the Bank Reconciliation Statement, Updated Bank Account, Updated Cash Account, supporting exception schedules, control totals, preparation metadata, approvals and a report reference. Outputs should be retained with source evidence and reviewed before reliance.","source":"FINDAT x1 application knowledge","kind":"finance"},{"id":"ml","title":"machine learning and deep-learning components in x1","tags":["machine learning","deep learning","neural","ml","fuzzy matching","confidence","classifier"],"text":"Traditional machine-learning methods rank knowledge and transaction similarities. A compact two-hidden-layer neural network classifies prompt intent inside the browser. The system also uses rules and structured planning because a small neural classifier alone cannot provide dependable financial reasoning.","points":["BM25 ranks exact and related terminology.","Character similarity helps with spelling and wording variations.","The neural classifier predicts broad prompt intent.","Rules protect calculations and application commands."],"source":"FINDAT x1 application knowledge","kind":"system"},{"id":"ml_limits","title":"AI and model limitations","tags":["limitations","mistakes","hallucination","accuracy","risk","human review"],"text":"The embedded model is compact and domain-limited. It can misunderstand unusual wording, incomplete facts or poor-quality data, and it cannot independently verify external information. Optional local Ollama generation is more flexible but still depends on retrieved evidence and can make mistakes. Material accounting, legal and statutory conclusions require qualified human review.","source":"FINDAT x1 application knowledge","kind":"system"},{"id":"privacy","title":"local processing and privacy","tags":["privacy","offline","local","security","data","local storage"],"text":"The embedded assistant, built-in knowledge and default response engine run inside the HTML file. Conversation history and imported knowledge are stored in browser localStorage when available. No prompt is sent externally unless the user deliberately enables the optional local Ollama connection.","source":"FINDAT x1 application knowledge","kind":"system"},{"id":"accounting_equation","title":"accounting equation","tags":["accounting equation","assets","liabilities","equity"],"text":"The core accounting equation is Assets = Liabilities + Equity. Double-entry bookkeeping keeps the equation balanced by recording equal debit and credit effects for each financial event.","source":"FINDAT accounting knowledge","kind":"accounting"},{"id":"debit_credit","title":"debits and credits","tags":["debit","credit","double entry","journal entry"],"text":"Debits normally increase assets and expenses and reduce liabilities, equity and revenue. Credits normally increase liabilities, equity and revenue and reduce assets and expenses. Each balanced journal entry has equal total debits and credits.","source":"FINDAT accounting knowledge","kind":"accounting"},{"id":"general_ledger","title":"general ledger and chart of accounts","tags":["general ledger","ledger","chart of accounts","account mapping"],"text":"The chart of accounts defines the coded accounts used by an entity. The general ledger accumulates journal entries by account and provides balances for the trial balance and financial statements. Consistent coding and references make reconciliation and investigation more reliable.","source":"FINDAT accounting knowledge","kind":"accounting"},{"id":"trial_balance","title":"trial balance","tags":["trial balance","account balances","debit total","credit total"],"text":"A trial balance lists general-ledger balances at a point in time. Equal debit and credit totals confirm arithmetic balance but do not prove completeness, correct classification or absence of offsetting errors.","source":"FINDAT accounting knowledge","kind":"accounting"},{"id":"financial_statements","title":"primary financial statements","tags":["income statement","balance sheet","statement of financial position","cash flow","financial statements"],"text":"The income statement reports revenue and expenses over a period. The statement of financial position reports assets, liabilities and equity at a date. The cash-flow statement classifies cash movements into operating, investing and financing activities, while notes explain policies and material balances.","source":"FINDAT accounting knowledge","kind":"accounting"},{"id":"accruals","title":"accrual accounting adjustments","tags":["accrual","prepayment","depreciation","adjusting entries","period cut off"],"text":"Accruals recognise income or expenses in the period earned or incurred before cash settlement. Prepayments defer recognition for future benefits, while depreciation allocates a depreciable asset amount over its useful life. Adjusting entries align records with the correct reporting period.","source":"FINDAT accounting knowledge","kind":"accounting"},{"id":"receivables_payables","title":"receivables and payables controls","tags":["accounts receivable","accounts payable","receivables","payables","ageing"],"text":"Accounts receivable are amounts owed by customers; accounts payable are amounts owed to suppliers. Ageing analysis, statement reconciliation, credit notes, unapplied receipts, unmatched invoices and unusual write-offs are common review areas.","source":"FINDAT accounting knowledge","kind":"accounting"},{"id":"cash_controls","title":"cash and bank internal controls","tags":["cash controls","internal control","segregation of duties","bank access","approval"],"text":"Strong cash controls separate initiation, approval, custody, recording and reconciliation. Access should be limited, changes should be logged, supporting evidence should be retained and reconciliations should be independently reviewed.","redFlags":["One person controls payment creation, approval and reconciliation.","Dormant users retain banking access.","Supplier or bank details change without independent verification.","Reconciliations are delayed or lack reviewer sign-off."],"source":"FINDAT accounting knowledge","kind":"control"},{"id":"data_quality","title":"financial data quality controls","tags":["data quality","duplicate","missing value","validation","bad date","control total"],"text":"Financial data should be tested for required fields, valid dates, numeric amounts, duplicates, consistent signs, stable identifiers, period cut-off and agreement to source control totals. Transformation rules should be reproducible and logged.","steps":["Profile the source file.","Validate required columns and data types.","Normalise dates, signs and currency values.","Identify missing values and duplicates.","Compare record counts and control totals before and after transformation."],"source":"FINDAT x1 application knowledge","kind":"control"},{"id":"forensic_accounting","title":"forensic accounting in financial investigations","tags":["forensic accounting","financial investigation","documentary evidence","financial crime"],"text":"Forensic accounting applies accounting analysis and investigative methods to reconstruct financial activity, identify who benefited, explain how transactions occurred and present findings for legal, regulatory or disciplinary use. Financial documents function as evidence in much the same way that physical traces support other investigations.","points":["Reconstruct events from records and testimony.","Trace ownership, movement and use of money or property.","Relate financial facts to the elements of the allegation.","Present a logical, supportable explanation of findings."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapter 1","kind":"forensic"},{"id":"white_collar_opportunity","title":"opportunity and sophistication in financial crime","tags":["white collar crime","opportunity","position of trust","control over records","industry knowledge"],"text":"Complex financial offences often depend on access, authority or specialised knowledge. A person who controls records, approvals or financial processes has greater opportunity to conceal manipulation, so investigators must understand both the industry and the organisation’s normal record-keeping system.","redFlags":["Excessive access concentrated in one role.","Unusual overrides by senior or trusted personnel.","Transactions structured around known control gaps.","Records controlled by the same person who benefits from them."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapter 1","kind":"forensic"},{"id":"legal_elements_intent","title":"elements, intent and circumstantial proof","tags":["elements of crime","intent","willful","circumstantial evidence","proof"],"text":"An investigation should connect evidence to each legally required element of the suspected offence and distinguish deliberate conduct from accident or negligence. Intent is often inferred from patterns, concealment, repeated conduct, false records and the surrounding circumstances rather than a direct admission.","source":"Criminal Financial Investigations — summarised","chapter":"Chapter 1","jurisdiction":"United States source; verify local law","kind":"legal"},{"id":"business_operations","title":"understanding normal business operations","tags":["business operations","industry knowledge","manufacturing","retail","services","profit model"],"text":"A financial investigator must understand how the relevant business normally earns income, incurs expenses, records transactions and protects assets. The expected operating model provides the baseline for identifying abnormal entries, impossible margins, fabricated activity or manipulated records.","steps":["Map how the business makes money.","Identify normal source documents and accounting records.","Understand key expenses, inventory or service-delivery processes.","Compare reported activity with operational reality."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapter 2","kind":"forensic"},{"id":"record_retention","title":"record retention, access and confidentiality","tags":["record retention","privacy","confidentiality","court order","third party records"],"text":"Financial records are retained for different periods under tax, regulatory, contractual and organisational rules. Investigators should identify what records exist, who controls them, how long they are kept and what legal authority or consent is required to obtain them. The uploaded source uses United States examples, so local requirements must be checked.","source":"Criminal Financial Investigations — summarised","chapter":"Chapter 2","jurisdiction":"United States source; verify Zambia and other applicable law","kind":"legal"},{"id":"financial_crime_characteristics","title":"characteristics of financial crimes","tags":["financial crime characteristics","concealment","ongoing scheme","long period","deception"],"text":"Financial crimes are often planned, concealed and repeated over time. Schemes may begin with small amounts, grow when undetected and continue while the investigation is underway. This requires a chronological analysis that explains changes in method, scale and financial effect.","redFlags":["Gradual growth in unexplained activity.","Repeated modifications to records or processes.","Lifestyle or assets inconsistent with known income.","Transactions continuing after concerns are raised."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapter 3","kind":"forensic"},{"id":"income_reconstruction","title":"reconstructing unexplained or illegal income","tags":["unexplained income","illegal proceeds","legitimate income","financial reconstruction","source of funds"],"text":"A common investigative approach establishes total financial resources or expenditures, identifies legitimate sources and analyses the unexplained balance. The conclusion depends on complete records, reasonable treatment of non-income sources and a documented method rather than simply assuming every difference is criminal proceeds.","steps":["Establish the relevant period.","Measure funds received, assets acquired or expenditures made.","Identify verified legitimate income and non-income sources.","Investigate the unexplained difference.","Document assumptions, exclusions and corroborating evidence."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapter 3","kind":"forensic"},{"id":"spending_saving_net_worth","title":"spending, saving and changes in net worth","tags":["spending","saving","net worth","assets","liabilities","lifestyle analysis"],"text":"Money received is generally spent, saved, used to acquire assets or used to reduce liabilities. Durable assets, bank and investment accounts and debt reductions usually leave stronger documentary trails than routine cash living expenses. Comparing these changes with known income can reveal areas requiring explanation.","source":"Criminal Financial Investigations — summarised","chapter":"Chapter 3","kind":"forensic"},{"id":"categories_theft","title":"concealing gains through income and expense manipulation","tags":["theft categories","understated income","overstated expenses","concealed gains","false expenses"],"text":"Financial gains may be concealed by understating income, overstating expenses, diverting assets or creating false transactions. The investigation should determine which route increased the subject’s wealth and then trace the records, approvals and beneficiaries connected to that route.","redFlags":["Sales or receipts missing from recorded income.","Expenses unsupported by genuine goods or services.","Payments to related or unknown entities.","Inventory, payroll or purchasing activity inconsistent with operations."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapter 4","kind":"fraud"},{"id":"fraud_schemes","title":"investment and Ponzi-type schemes","tags":["ponzi scheme","investment fraud","unrealistic returns","new investors","fraud scheme"],"text":"Ponzi-type schemes use money from later participants to create the appearance of returns for earlier participants. They commonly rely on unusually high or consistent promised returns, weak or fabricated underlying activity, persuasive promoters and pressure to reinvest rather than withdraw.","redFlags":["Returns are high, stable and difficult to explain.","The promoter resists independent verification.","Investor payments depend on continuing new inflows.","Records do not support the claimed business or investment activity."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapter 4","kind":"fraud"},{"id":"embezzlement","title":"embezzlement and abuse of entrusted access","tags":["embezzlement","misappropriation","employee fraud","position of trust","diversion"],"text":"Embezzlement is the dishonest diversion of money or property by a person entrusted to handle it. Investigation focuses on the person’s access, the method of diversion, concealment in records, the destination of funds and the control weakness that allowed the activity.","source":"Criminal Financial Investigations — summarised","chapter":"Chapter 4","kind":"fraud"},{"id":"paper_trail","title":"the financial paper trail","tags":["paper trail","documents","source records","transaction evidence","ownership"],"text":"The paper trail is the collection of records produced by financial activity. A single transaction may appear in contracts, invoices, receipts, bank records, ledgers, registrations, correspondence and third-party systems. Comparing independent copies helps reconstruct what actually happened and detect altered or incomplete records.","steps":["Identify every party to the transaction.","List records each party should hold.","Obtain independent copies where lawful.","Compare dates, amounts, descriptions and authorisations.","Resolve gaps and inconsistencies."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapter 5","kind":"evidence"},{"id":"public_records","title":"public and third-party records","tags":["public records","property records","corporate filings","court records","licenses","liens"],"text":"Public and regulated records can provide independent evidence of ownership, transfers, corporate relationships, licences, litigation, liens and major transactions. Their relevance and accessibility vary by jurisdiction, so investigators should document the legal basis and reliability of each source.","source":"Criminal Financial Investigations — summarised","chapter":"Chapter 5","jurisdiction":"Verify local access and privacy rules","kind":"evidence"},{"id":"bank_records","title":"financial-institution and account records","tags":["bank records","account statements","deposit slips","cancelled checks","wire transfers","beneficial owner"],"text":"Financial-institution records can show account ownership, deposits, payments, transfers, counterparties and balances. They are most useful when linked to source documents and other accounts, and they normally require consent or lawful authority because institutions hold records for third parties.","source":"Criminal Financial Investigations — summarised","chapter":"Chapter 5","jurisdiction":"Verify local banking secrecy and evidence rules","kind":"evidence"},{"id":"evidence_collection","title":"collecting and preserving financial evidence","tags":["collect evidence","preserve evidence","original documents","digital evidence","integrity"],"text":"Financial evidence should be collected under proper authority, protected from alteration and recorded so another reviewer can understand where it came from and how it was handled. Originals should be preserved when required, while working copies can be used for analysis.","steps":["Define the legal and investigative authority.","Record the source, date, custodian and method of collection.","Protect original physical and digital evidence.","Create verified working copies.","Maintain an evidence inventory and access log."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapter 6","kind":"evidence"},{"id":"chain_custody","title":"chain of custody and evidence integrity","tags":["chain of custody","evidence log","integrity","hash","custodian"],"text":"Chain of custody documents possession and handling from collection through analysis and presentation. A defensible record identifies the item, collector, date, transfers, storage, access and any changes. For digital material, hashes and read-only preservation strengthen integrity controls.","source":"Criminal Financial Investigations — summarised","chapter":"Chapter 6","kind":"evidence"},{"id":"gathering_documents","title":"planning documentary evidence requests","tags":["document request","subpoena","search warrant","records request","evidence gathering"],"text":"Document gathering should be targeted to the allegation, relevant period, entities, accounts and transactions. Requests should describe records clearly, avoid unnecessary collection and anticipate how each record will be authenticated and connected to the analysis. Compulsory powers depend on applicable law.","source":"Criminal Financial Investigations — summarised","chapter":"Chapter 7","jurisdiction":"Legal authority differs by jurisdiction","kind":"evidence"},{"id":"interviews","title":"interviews in financial investigations","tags":["interview","witness","custodian","statement","financial investigation"],"text":"Interviews help explain records, establish business processes, identify custodians, test inconsistencies and locate additional evidence. Questions should move from background and normal procedures to specific transactions, and important statements should be documented and corroborated.","steps":["Prepare from the available records.","Establish the person’s role and normal process.","Use open questions before specific documents.","Clarify inconsistencies without suggesting an answer.","Record leads and obtain corroboration."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapter 8","kind":"evidence"},{"id":"observation","title":"observation and operational corroboration","tags":["observation","surveillance","business activity","corroboration","operations"],"text":"Lawful observation can test whether reported business activity exists and whether people, premises, inventory or customer traffic are consistent with financial claims. Observation should be planned, documented and used as corroboration rather than as a substitute for records and lawful evidence procedures.","source":"Criminal Financial Investigations — summarised","chapter":"Chapter 8","jurisdiction":"Use only under applicable law and authority","kind":"evidence"},{"id":"investigation_plan","title":"financial investigation planning process","tags":["financial investigation plan","scope","hypothesis","leads","timeline"],"text":"A financial investigation converts an allegation into testable questions, identifies relevant people, entities, accounts and periods, collects records, reconstructs transactions and evaluates whether the facts support or contradict the hypothesis. The plan should be updated as evidence changes the understanding of the case.","steps":["Define the allegation and legal or policy criteria.","Set the period, entities and accounts in scope.","Map expected records and custodians.","Build a transaction chronology and financial profile.","Test explanations and pursue corroborating leads.","Prepare schedules, findings and unresolved limitations."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapter 9","kind":"forensic"},{"id":"indirect_requirements","title":"requirements for indirect methods of financial proof","tags":["indirect method","circumstantial evidence","opening net worth","likely source","negate leads"],"text":"Indirect methods infer unreported or unexplained funds from a complete financial reconstruction rather than a single direct transaction. Their reliability depends on a sound opening position, consistent accounting treatment, investigation of reasonable explanations, support for major figures and a method that can be reproduced and explained.","points":["Define the period and financial universe.","Establish opening balances and known sources.","Avoid double counting transfers and non-income receipts.","Investigate leads that could explain the difference.","Corroborate the likely source and present the method transparently."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapter 10","jurisdiction":"Court requirements differ by jurisdiction","kind":"forensic"},{"id":"standard_methods","title":"standard methods of financial proof","tags":["methods of proof","specific items","bank deposits","cash expenditures","net worth","indirect methods"],"text":"Common methods include tracing specific transactions, analysing bank deposits and cash expenditures, and measuring changes in net worth and personal expenditures. The method should fit the available records and allegation; investigators may use more than one method to corroborate results.","source":"Criminal Financial Investigations — summarised","chapter":"Chapter 11","kind":"forensic"},{"id":"common_processes","title":"common processes across indirect methods","tags":["common processes","lead sheets","schedules","financial profile","source and application"],"text":"Indirect methods share core work: define the period and entities, identify accounts and assets, verify opening balances, classify transfers and loans correctly, trace major receipts and expenditures, maintain lead sheets and build schedules that reconcile to supporting evidence.","steps":["Create an entity and account map.","Prepare lead sheets for each information source.","Classify receipts, transfers, loans and asset transactions.","Reconcile schedules to bank and ledger records.","Document investigated leads and unresolved limitations."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapter 12","kind":"forensic"},{"id":"specific_items","title":"specific-items method","tags":["specific items method","direct transactions","unreported income item","false deduction"],"text":"The specific-items method proves selected transactions or false entries individually. It is strongest when a particular receipt, payment, asset transfer or fabricated expense can be traced through documents, witnesses and accounts to show its nature and treatment.","steps":["Identify the specific transaction.","Trace it through source documents and accounts.","Establish the parties and economic purpose.","Compare actual treatment with reported treatment.","Corroborate knowledge, benefit and concealment."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapter 13","kind":"forensic"},{"id":"bank_deposits","title":"bank-deposits method","tags":["bank deposits method","total deposits","non-income deposits","transfers","unreported income"],"text":"The bank-deposits method begins with deposits to accounts under the subject’s control, then removes transfers, verified loans, gifts, asset-sale proceeds and other non-income items. The remaining amount is compared with reported or known income, with cash activity and undisclosed accounts considered separately.","steps":["Identify all relevant accounts and the investigation period.","Total deposits and reconcile them to statements.","Remove inter-account transfers and verified non-income sources.","Add relevant cash receipts not deposited when supportable.","Compare the result with reported or legitimate income."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapter 14","kind":"forensic"},{"id":"cash_expenditures","title":"cash-expenditures method","tags":["cash expenditures method","cash spending","currency","expenditures","unreported funds"],"text":"The cash-expenditures method analyses spending not reflected in bank withdrawals or other identified sources. It can complement the bank-deposits method when the subject uses substantial currency, but the investigator must avoid counting the same funds twice and must distinguish opening cash, loans and other legitimate sources.","source":"Criminal Financial Investigations — summarised","chapter":"Chapter 14","kind":"forensic"},{"id":"net_worth","title":"net-worth and personal-expenditures method","tags":["net worth method","personal expenditures","assets minus liabilities","opening net worth","unreported income"],"text":"The net-worth method measures the increase in assets minus liabilities over a period, adds nondeductible personal expenditures and then subtracts verified nontaxable or non-income sources. A reliable opening net worth and complete identification of assets, liabilities and reasonable leads are critical.","steps":["Establish a defensible opening net worth.","Measure closing assets and liabilities consistently.","Calculate the change in net worth.","Add personal expenditures not already reflected.","Subtract verified non-income sources and compare with known income."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapter 15","kind":"forensic"},{"id":"tax_investigations","title":"indirect methods in tax investigations","tags":["tax investigation","unreported income","tax fraud","indirect method","tax return"],"text":"Indirect methods can test whether reported income is consistent with deposits, spending and changes in net worth. Tax conclusions require careful treatment of taxable versus nontaxable items, deductions, accounting periods and jurisdiction-specific law. The uploaded source is United States-oriented and should not be treated as Zambian tax law.","source":"Criminal Financial Investigations — summarised","chapter":"Chapter 16","jurisdiction":"United States source; obtain local tax advice","kind":"tax"},{"id":"criminal_tax_unique","title":"unique safeguards in criminal tax investigations","tags":["criminal tax","willfulness","tax due","reasonable leads","government burden"],"text":"Criminal tax cases require proof of the applicable tax obligation and deliberate violation, not merely an accounting difference. Investigators must treat reasonable explanations fairly, calculate the alleged deficiency under the governing rules and maintain a method that can withstand legal scrutiny.","source":"Criminal Financial Investigations — summarised","chapter":"Chapter 17","jurisdiction":"United States source; verify local criminal and tax law","kind":"tax"},{"id":"case_report","title":"financial-investigation case report","tags":["case report","investigation report","narrative","schedules","findings"],"text":"The case report explains how the investigation was conducted, how evidence connects to the allegation and how financial schedules support the conclusions. A useful report identifies scope and method, presents facts in logical sequence, distinguishes evidence from inference, addresses material explanations and states limitations.","steps":["Introduce the subject, period, allegation and method.","Describe sources and investigative actions.","Present the transaction chronology and schedules.","Explain how facts support or contradict each issue.","Address alternative explanations and limitations.","State conclusions and recommended action."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapter 18","kind":"reporting"},{"id":"trial_prep","title":"preparation of financial evidence for hearing or trial","tags":["trial preparation","witness files","exhibits","court presentation","evidence package"],"text":"Complex financial evidence should be organised so each document can be found, authenticated and explained quickly. Witness files, exhibit numbering, cross-references to schedules and rehearsed visual explanations help present the financial story clearly without changing the underlying evidence.","source":"Criminal Financial Investigations — summarised","chapter":"Chapter 19","jurisdiction":"Follow applicable court and evidence rules","kind":"reporting"},{"id":"forfeiture","title":"forfeiture and recovery of crime-related property","tags":["forfeiture","asset recovery","proceeds of crime","instrumentality","property"],"text":"Forfeiture and asset-recovery processes seek property derived from, used in or connected to unlawful activity. Financial analysis helps trace acquisition, ownership, control and value, but legal thresholds, third-party rights and procedures differ substantially by jurisdiction.","source":"Criminal Financial Investigations — summarised","chapter":"Chapter 20","jurisdiction":"Obtain jurisdiction-specific legal authority","kind":"forensic"},{"id":"money_laundering","title":"money laundering and transaction layering","tags":["money laundering","placement","layering","integration","shell entities","criminal proceeds"],"text":"Money laundering conceals the criminal source, ownership, movement or purpose of funds. Analysis commonly looks for movement through multiple accounts or entities, conversion into assets, mixing with legitimate activity and transactions that lack a reasonable economic purpose.","redFlags":["Rapid movement through several accounts.","Payments involving unrelated entities or jurisdictions.","Transactions inconsistent with the customer or business profile.","Frequent cash activity followed by transfers or asset purchases.","Complex structures without a clear commercial purpose."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapter 20","kind":"aml"},{"id":"terrorist_finance","title":"financial analysis of suspected terrorist financing","tags":["terrorist financing","financial flows","charities","small transactions","asset freezing"],"text":"Terrorist-financing analysis follows money, assets and support networks to identify who provides, moves or controls resources. Unlike profit-motivated laundering, funding may involve lawful-origin money and relatively small transactions, so conclusions require corroborated evidence and the applicable legal designation process.","source":"Criminal Financial Investigations — summarised","chapter":"Chapter 20","jurisdiction":"Use competent authorities and applicable law","kind":"aml"},{"id":"asset_tracing","title":"asset tracing and beneficial ownership","tags":["asset tracing","beneficial ownership","nominee","related entity","flow of funds"],"text":"Asset tracing links funds from origin through transfers to final use or ownership. The analysis should distinguish legal title from beneficial control, identify related parties and nominees, reconcile flows across accounts and support each link with records rather than assumption.","steps":["Map people, entities, accounts and assets.","Trace each material transfer chronologically.","Identify consideration and economic purpose.","Test legal ownership against actual control and benefit.","Reconcile the traced flow to source records."],"source":"Criminal Financial Investigations — summarised","chapter":"Chapters 5, 9 and 20","kind":"forensic"},{"id":"fraud_red_flags","title":"general financial-fraud warning signs","tags":["fraud red flags","warning signs","indicators","suspicious pattern"],"text":"A red flag is a reason to investigate, not proof of wrongdoing. Strong conclusions come from patterns that combine unusual transactions, control weaknesses, inconsistent explanations and supporting documentary evidence.","redFlags":["Lifestyle or asset growth inconsistent with known income.","Missing, altered or duplicate documents.","Unusual related-party or round-sum payments.","Repeated control overrides and unsupported journals.","Business activity inconsistent with reported sales or expenses.","Resistance to independent confirmation or record access."],"source":"Criminal Financial Investigations — summarised","chapter":"Multiple chapters","kind":"fraud"},{"id":"evidence_matrix","title":"evidence matrix for financial allegations","tags":["evidence matrix","allegation","element","document","witness","finding"],"text":"An evidence matrix links each allegation or required element to supporting and contradictory evidence, source documents, witnesses, analytical schedules and unresolved gaps. It reduces the risk that a strong financial pattern is presented without proving the actual issue under review.","steps":["List each allegation, element or control criterion.","Link direct and circumstantial evidence.","Record contradictory information and alternative explanations.","Identify missing evidence and further actions.","Cross-reference the final report and schedules."],"source":"FINDAT synthesis from financial-investigation methodology","kind":"forensic"},{"id":"legal_caution","title":"jurisdiction and professional-review caution","tags":["legal advice","jurisdiction","zambia","united states","professional review","tax law"],"text":"The embedded financial-investigation source is United States-oriented and may be dated in some legal or regulatory details. It supports methodology and concepts, not current Zambian law or case-specific legal advice. Verify statutory powers, evidence rules, privacy, tax treatment, reporting obligations and professional standards with current competent local sources.","source":"FINDAT knowledge governance","kind":"legal"}];
  const MAX_IMPORTED_CHUNKS=850;
  const MAX_IMPORT_CHARS=2800000;
  let importedKnowledge=[];
  let knowledgeBase=[];
  let indexState={documents:[],df:Object.create(null),avgLength:1};
  let recentItems=[];
  let conversation=[];
  let conversationGeneration=0;
  window.__x1ConversationGeneration=conversationGeneration;
  let toastTimer;
  let lastIntent='general';
  let lastTopic='x1';
  let currentEvidence=[];
  const ollama={enabled:false,available:false,checking:false,endpoint:'http://127.0.0.1:11434',model:'llama3.1:8b-instruct'};

  const clickWorkspace=name=>document.querySelector(`[data-x1-workspace-tab="${name}"]`)?.click();
  const clickStage=name=>document.querySelector(`[data-x1-stage="${name}"]`)?.click();
  const runReconciliation=()=>document.getElementById('x1RunDemo')?.click();
  const resultsAvailable=()=>resultBox&&!resultBox.hidden;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

  function normalise(value){
    return String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9%+\-./ ]+/g,' ').replace(/\s+/g,' ').trim();
  }
  const stopWords=new Set('a an and are as at be been by can could did do does for from had has have how i if in into is it its may might of on or our should that the their them then there these this those to was were what when where which who why will with would you your'.split(' '));
  function stem(word){
    let w=word;
    if(w.length>6&&w.endsWith('ments'))w=w.slice(0,-5);
    else if(w.length>5&&w.endsWith('ing'))w=w.slice(0,-3);
    else if(w.length>5&&w.endsWith('ed'))w=w.slice(0,-2);
    else if(w.length>5&&w.endsWith('ies'))w=w.slice(0,-3)+'y';
    else if(w.length>4&&w.endsWith('es'))w=w.slice(0,-2);
    else if(w.length>4&&w.endsWith('s'))w=w.slice(0,-1);
    return w;
  }
  function tokens(value){
    return normalise(value).split(' ').filter(Boolean).filter(token=>!stopWords.has(token)).map(stem);
  }
  function charGrams(value,size=3){
    const text=`  ${normalise(value)}  `;const set=new Set();for(let i=0;i<=text.length-size;i++)set.add(text.slice(i,i+size));return set;
  }
  function jaccard(a,b){if(!a.size||!b.size)return 0;let hit=0;a.forEach(x=>{if(b.has(x))hit++});return hit/(a.size+b.size-hit)}
  const expansions={
    fraud:['deception','scheme','misrepresentation','embezzlement'],
    investigate:['investigation','evidence','trace','reconstruct'],
    investigation:['investigate','evidence','trace','reconstruct'],
    paper:['document','record','evidence'],trail:['document','record','transaction'],
    bank:['account','deposit','statement'], deposits:['receipts','income','account'],
    money:['funds','cash','proceeds'], laundering:['layering','criminal proceeds','shell entity'],
    workflow:['pipeline','node','automation'], reconcile:['reconciliation','matching','exception'],
    red:['warning','indicator','suspicious'], flag:['warning','indicator','suspicious'],
    forensic:['investigative','evidence','financial crime']
  };
  function expandedTokens(value){
    const base=tokens(value);const set=new Set(base);base.forEach(t=>(expansions[t]||[]).forEach(x=>tokens(x).forEach(y=>set.add(y))));return [...set];
  }
  function entryText(item){return `${item.title||''} ${(item.tags||[]).join(' ')} ${item.text||''} ${(item.points||[]).join(' ')} ${(item.steps||[]).join(' ')} ${(item.redFlags||[]).join(' ')} ${item.source||''} ${item.chapter||''}`}
  function buildKnowledgeIndex(){
    knowledgeBase=[...BUILT_IN_KB,...importedKnowledge];
    const df=Object.create(null);let totalLength=0;
    const documents=knowledgeBase.map((item,index)=>{
      const ts=tokens(entryText(item));const tf=Object.create(null);ts.forEach(token=>tf[token]=(tf[token]||0)+1);Object.keys(tf).forEach(token=>df[token]=(df[token]||0)+1);totalLength+=ts.length;
      return{item,index,tokens:ts,tf,length:ts.length||1,grams:charGrams(`${item.title} ${(item.tags||[]).join(' ')}`),normal:normalise(entryText(item))};
    });
    indexState={documents,df,avgLength:documents.length?totalLength/documents.length:1};
    renderKnowledgeManager();
    const imported=importedKnowledge.length;
    return knowledgeBase.length;
  }
  function bm25Score(queryTokens,doc){
    const N=indexState.documents.length||1,k1=1.45,b=.72;let score=0;
    queryTokens.forEach(token=>{const f=doc.tf[token]||0;if(!f)return;const n=indexState.df[token]||0;const idf=Math.log(1+((N-n+.5)/(n+.5)));const denom=f+k1*(1-b+b*(doc.length/indexState.avgLength));score+=idf*((f*(k1+1))/denom)});
    return score;
  }
  function tokenSet(value){return new Set(Array.isArray(value)?value:tokens(value))}
  function documentSimilarity(a,b){return jaccard(tokenSet(a.tokens||entryText(a.item||a)),tokenSet(b.tokens||entryText(b.item||b)))}
  function retrieveKnowledge(query,limit=8){
    const joined=String(query||''),qTokens=expandedTokens(joined),qNormal=normalise(query),qGrams=charGrams(query);
    const scored=indexState.documents.map(doc=>{
      let raw=bm25Score(qTokens,doc);
      const title=normalise(doc.item.title),tags=normalise((doc.item.tags||[]).join(' '));
      if(qNormal&&title.includes(qNormal))raw+=4.5;
      if(qNormal&&tags.includes(qNormal))raw+=3.2;
      const words=normalise(query).split(' ').filter(w=>w.length>3);words.forEach(word=>{if(title.includes(word))raw+=.42;if(tags.includes(word))raw+=.30;if(doc.normal.includes(` ${word} `))raw+=.08});
      const fuzzy=jaccard(qGrams,doc.grams);raw+=fuzzy*2.2;
      if(doc.item.kind==='imported')raw+=.08;
      const score=1-Math.exp(-Math.max(0,raw)/4.5);
      return{item:doc.item,doc,score,rawScore:raw};
    }).filter(candidate=>candidate.rawScore>0).sort((a,b)=>b.rawScore-a.rawScore).slice(0,48);

    const selected=[];const sourceCounts=new Map();
    while(selected.length<limit&&scored.length){
      let bestIndex=-1,bestValue=-Infinity;
      scored.forEach((candidate,index)=>{
        const redundancy=selected.length?Math.max(...selected.map(chosen=>documentSimilarity(candidate.doc,chosen.doc))):0;
        const source=candidate.item.source||'Embedded knowledge';
        const sourcePenalty=(sourceCounts.get(source)||0)*.22;
        const importedBoost=candidate.item.kind==='imported'?.12:0;
        const value=candidate.rawScore-(redundancy*2.15)-sourcePenalty+importedBoost;
        if(value>bestValue){bestValue=value;bestIndex=index}
      });
      if(bestIndex<0)break;
      const chosen=scored.splice(bestIndex,1)[0],source=chosen.item.source||'Embedded knowledge';
      selected.push(chosen);sourceCounts.set(source,(sourceCounts.get(source)||0)+1);
    }
    return selected;
  }

  function splitEvidenceSentences(value){
    const clean=String(value||'').replace(/\s+/g,' ').trim();
    if(!clean)return[];
    const found=clean.match(/[^.!?]+(?:[.!?]+|$)/g)||[clean];
    return found.map(text=>text.trim()).filter(text=>text.length>=28&&text.length<=680);
  }
  function sentenceRelevance(text,queryTokens){
    const sentenceTokens=tokens(text),set=new Set(sentenceTokens);let overlap=0;
    queryTokens.forEach(token=>{if(set.has(token))overlap+=1});
    const density=overlap/Math.max(1,Math.sqrt(sentenceTokens.length));
    return density+(overlap>=2?.45:0)+(sentenceTokens.length>7&&sentenceTokens.length<55?.12:0);
  }
  function collectEvidenceSegments(prompt,matches,limit=14){
    const qTokens=expandedTokens(prompt),pool=[];
    matches.forEach((match,rank)=>{
      const item=match.item,parts=[item.text,...(item.points||[]),...(item.steps||[]),...(item.redFlags||[])];
      parts.flatMap(splitEvidenceSentences).forEach((text,index)=>pool.push({
        text,
        score:sentenceRelevance(text,qTokens)+(match.score*.9)-(rank*.025)-(index*.004),
        source:item.source||'Knowledge base',
        title:item.title||'Knowledge section',
        pageStart:item.pageStart||item.page||null,
        pageEnd:item.pageEnd||item.pageStart||item.page||null,
        jurisdiction:item.jurisdiction||''
      }));
    });
    pool.sort((a,b)=>b.score-a.score);
    const kept=[],topScore=pool[0]?.score||0,minimumScore=Math.max(.12,topScore*.3);
    for(const candidate of pool){
      if(kept.length>=limit)break;
      if(candidate.score<minimumScore)continue;
      const cTokens=tokenSet(candidate.text),cGrams=charGrams(candidate.text);
      const duplicate=kept.some(existing=>jaccard(cTokens,tokenSet(existing.text))>.78||jaccard(cGrams,charGrams(existing.text))>.86);
      if(duplicate)continue;
      kept.push(candidate);
    }
    return kept;
  }



  const intentExamples={
    greeting:['hello','hi x1','good morning','good evening','hey assistant'],
    identity:['who are you','are you conscious','are you self aware','how does your brain work','what model are you','do you think'],
    capabilities:['what can you do','show your capabilities','how can you help','list your features'],
    workflow:['explain workflows','how do workflow nodes connect','alteryx pipeline','knime workflow','n8n nodes','drag and drop automation'],
    transform:['clean csv data','transform excel file','prepare data','import xlsx','clean duplicates'],
    reconciliation:['what is bank reconciliation','reconcile bank and cash','adjusted bank balance','cash ledger balance'],
    exceptions:['unmatched transactions','deposits in transit','outstanding cheques','bank charges'],
    report:['prepare reconciliation statement','generate accountant report','updated bank account','case report'],
    accounting:['explain debit and credit','accounting equation','trial balance','financial statements','general ledger'],
    machine_learning:['machine learning','deep learning model','neural network','retrieval augmented generation','rag chatbot'],
    privacy:['is my data private','does this send data online','offline processing','local storage'],
    data_quality:['validate data','data quality checks','find duplicates','missing values','bad dates'],
    forensic:['forensic accounting','financial investigation','paper trail','indirect method','asset tracing'],
    evidence:['collect evidence','chain of custody','documentary evidence','witness interview','public records'],
    fraud:['fraud scheme','embezzlement','ponzi scheme','money laundering','red flags'],
    legal:['elements of crime','intent','tax investigation','court evidence','forfeiture law'],
    app_state:['where am i','what workspace is open','current application state'],
    gratitude:['thank you','thanks','great job','that helps']
  };
  const intentLabels=Object.keys(intentExamples);const allTraining=[];intentLabels.forEach(label=>intentExamples[label].forEach(text=>allTraining.push({label,text})));
  const vocabulary=[...new Set(allTraining.flatMap(row=>tokens(row.text)))].slice(0,160);const vocabIndex=Object.fromEntries(vocabulary.map((word,index)=>[word,index]));
  function inputVector(text){const vector=new Array(vocabulary.length).fill(0);tokens(text).forEach(word=>{const index=vocabIndex[word];if(index!==undefined)vector[index]+=1});const norm=Math.sqrt(vector.reduce((sum,value)=>sum+value*value,0))||1;return vector.map(value=>value/norm)}
  function seededRandom(seed=81473){let state=seed>>>0;return()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296}}
  function makeMatrix(rows,cols,random,scale=.12){return Array.from({length:rows},()=>Array.from({length:cols},()=>((random()*2)-1)*scale))}
  const brain={ready:false,vocabulary,intentLabels,predict:()=>[]};
  function trainNeuralBrain(){
    const random=seededRandom(),inputSize=vocabulary.length,h1=20,h2=12,outputSize=intentLabels.length,W1=makeMatrix(h1,inputSize,random,.13),b1=new Array(h1).fill(0),W2=makeMatrix(h2,h1,random,.13),b2=new Array(h2).fill(0),W3=makeMatrix(outputSize,h2,random,.13),b3=new Array(outputSize).fill(0),examples=allTraining.map(row=>({x:inputVector(row.text),y:intentLabels.indexOf(row.label)})),lr=.04;
    for(let epoch=0;epoch<125;epoch++)examples.forEach(example=>{const z1=W1.map((row,i)=>row.reduce((sum,w,j)=>sum+w*example.x[j],b1[i])),a1=z1.map(x=>Math.max(0,x)),z2=W2.map((row,i)=>row.reduce((sum,w,j)=>sum+w*a1[j],b2[i])),a2=z2.map(x=>Math.max(0,x)),logits=W3.map((row,i)=>row.reduce((sum,w,j)=>sum+w*a2[j],b3[i])),max=Math.max(...logits),exp=logits.map(v=>Math.exp(v-max)),total=exp.reduce((a,b)=>a+b,0),probs=exp.map(v=>v/total),d3=probs.slice();d3[example.y]-=1;const d2=new Array(h2).fill(0);for(let j=0;j<h2;j++){for(let i=0;i<outputSize;i++)d2[j]+=W3[i][j]*d3[i];if(z2[j]<=0)d2[j]=0}const d1=new Array(h1).fill(0);for(let j=0;j<h1;j++){for(let i=0;i<h2;i++)d1[j]+=W2[i][j]*d2[i];if(z1[j]<=0)d1[j]=0}for(let i=0;i<outputSize;i++){for(let j=0;j<h2;j++)W3[i][j]-=lr*d3[i]*a2[j];b3[i]-=lr*d3[i]}for(let i=0;i<h2;i++){for(let j=0;j<h1;j++)W2[i][j]-=lr*d2[i]*a1[j];b2[i]-=lr*d2[i]}for(let i=0;i<h1;i++){for(let j=0;j<inputSize;j++)W1[i][j]-=lr*d1[i]*example.x[j];b1[i]-=lr*d1[i]}});
    brain.predict=text=>{const x=inputVector(text),a1=W1.map((row,i)=>Math.max(0,row.reduce((sum,w,j)=>sum+w*x[j],b1[i]))),a2=W2.map((row,i)=>Math.max(0,row.reduce((sum,w,j)=>sum+w*a1[j],b2[i]))),logits=W3.map((row,i)=>row.reduce((sum,w,j)=>sum+w*a2[j],b3[i])),max=Math.max(...logits),exp=logits.map(v=>Math.exp(v-max)),total=exp.reduce((a,b)=>a+b,0);return exp.map((v,index)=>({label:intentLabels[index],score:v/total})).sort((a,b)=>b.score-a.score)};
    brain.ready=true;brainStatus?.classList.add('is-ready');
  }

  function showToast(message){let toast=document.getElementById('x1FintechToast');if(!toast){toast=document.createElement('div');toast.id='x1FintechToast';toast.className='x1-fintech-toast';toast.setAttribute('role','status');document.body.appendChild(toast)}toast.textContent=message;toast.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('is-visible'),3000)}
  function saveRecentItems(){try{localStorage.setItem(recentStorageKey,JSON.stringify(recentItems))}catch(error){}}
  function renderRecentItems(){
    if(!recent)return;
    recent.innerHTML='';
    recentItems.forEach(text=>{
      const entry=document.createElement('div');
      entry.className='x1-recent-entry';
      const openButton=document.createElement('button');
      openButton.type='button';
      openButton.className='x1-recent-item';
      openButton.dataset.x1SavedPrompt=text;
      openButton.textContent=text.length>54?`${text.slice(0,54)}…`:text;
      openButton.title=text;
      const deleteButton=document.createElement('button');
      deleteButton.type='button';
      deleteButton.className='x1-recent-delete';
      deleteButton.dataset.x1DeletePrompt=text;
      deleteButton.setAttribute('aria-label',`Delete analysis: ${text}`);
      deleteButton.title='Delete analysis and start a new conversation';
      deleteButton.innerHTML='<i class="fas fa-trash-alt" aria-hidden="true"></i>';
      entry.append(openButton,deleteButton);
      recent.appendChild(entry);
    });
    if(recentEmpty)recentEmpty.hidden=recentItems.length>0;
    if(clearRecentButton)clearRecentButton.disabled=false;
  }
  function initialiseRecentItems(){try{const stored=localStorage.getItem(recentStorageKey);recentItems=stored===null?[]:JSON.parse(stored);if(!Array.isArray(recentItems))recentItems=[]}catch(error){recentItems=[]}recentItems=[...new Set(recentItems.map(item=>String(item).trim()).filter(Boolean))].slice(0,8);saveRecentItems();renderRecentItems()}
  function addRecent(text){const clean=String(text||'').trim();if(!clean)return;recentItems=recentItems.filter(item=>item.toLowerCase()!==clean.toLowerCase());recentItems.unshift(clean);recentItems=recentItems.slice(0,8);saveRecentItems();renderRecentItems()}
  function saveConversation(){
    try{
      if(conversation.length)localStorage.setItem(conversationStorageKey,JSON.stringify(conversation.slice(-30)));
      else localStorage.removeItem(conversationStorageKey);
    }catch(error){}
  }
  function clearConversationStorage(){
    try{localStorage.removeItem(conversationStorageKey)}catch(error){}
    try{sessionStorage.removeItem(conversationStorageKey)}catch(error){}
  }
  function purgeChatThread(){
    if(!chatThread)return;
    chatThread.replaceChildren();
    chatThread.scrollTop=0;
    chatThread.removeAttribute('aria-busy');
    chatThread.dataset.x1Generation=String(conversationGeneration);
  }
  function showFreshConversationHome(){
    const appWorkspace=document.getElementById('x1AppWorkspace');
    const storeView=document.getElementById('developmentsStoreView');
    const homePanel=document.querySelector('[data-x1-workspace-panel="home"]');
    if(storeView)storeView.hidden=true;
    if(appWorkspace)appWorkspace.hidden=false;
    document.querySelectorAll('[data-x1-workspace-panel]').forEach(panel=>{panel.hidden=panel!==homePanel});
    document.querySelectorAll('[data-x1-workspace-tab]').forEach(button=>{
      button.classList.toggle('is-active',button.dataset.x1WorkspaceTab==='home');
      if(button.dataset.x1WorkspaceTab==='home')button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-x1-open-workflow]').forEach(button=>button.classList.remove('is-active'));
    const homeCenter=homePanel?.querySelector('.x1-chatgpt-home');
    const freshElements=[
      homePanel?.querySelector('.x1-chatgpt-intro'),
      homePanel?.querySelector('.x1-composer-wrap'),
      homePanel?.querySelector('.x1-brain-suggestions')
    ];
    freshElements.forEach(element=>{
      if(!element)return;
      element.hidden=false;
      element.removeAttribute('aria-hidden');
      element.style.removeProperty('display');
      element.style.removeProperty('visibility');
      element.style.removeProperty('opacity');
    });
    ['has-conversation','has-messages','is-chatting','is-conversation','is-busy'].forEach(className=>{
      homePanel?.classList.remove(className);
      homeCenter?.classList.remove(className);
    });
    if(homePanel)homePanel.scrollTop=0;
    const content=document.querySelector('.x1-fintech-content');
    if(content)content.scrollTop=0;
  }
  function startNewConversation(){
    conversationGeneration+=1;
    window.__x1ConversationGeneration=conversationGeneration;
    conversation=[];
    clearConversationStorage();
    purgeChatThread();
    showFreshConversationHome();
    if(promptInput){promptInput.value='';promptInput.style.height='auto';promptInput.dispatchEvent(new Event('input',{bubbles:true}))}
    if(sendButton){sendButton.disabled=true;sendButton.setAttribute('aria-disabled','true')}
    currentEvidence=[];
    lastIntent='general';
    lastTopic='x1';
    const resetGeneration=conversationGeneration;
    window.dispatchEvent(new CustomEvent('x1:conversation-reset',{detail:{generation:resetGeneration}}));
    queueMicrotask(()=>{
      if(resetGeneration!==conversationGeneration)return;
      purgeChatThread();
      showFreshConversationHome();
    });
    requestAnimationFrame(()=>{
      if(resetGeneration!==conversationGeneration)return;
      purgeChatThread();
      showFreshConversationHome();
      promptInput?.focus({preventScroll:true});
      document.getElementById('x1AppWorkspace')?.scrollIntoView({behavior:'smooth',block:'start'});
    });
    setTimeout(()=>{
      if(resetGeneration!==conversationGeneration)return;
      purgeChatThread();
      showFreshConversationHome();
    },80);
  }
  function removeRecentAnalysis(text){
    const clean=String(text||'').trim();
    recentItems=recentItems.filter(item=>item.toLowerCase()!==clean.toLowerCase());
    saveRecentItems();
    renderRecentItems();
    startNewConversation();
    showToast('Analysis deleted. A new conversation is ready.');
  }
  function clearRecentAnalyses(){
    const hasCurrentConversation=Boolean(conversation.length||chatThread?.children.length||promptInput?.value.trim());
    if(!recentItems.length&&!hasCurrentConversation){startNewConversation();showToast('No recent analyses yet. A new conversation is ready.');return}
    if(!window.confirm('Clear all recent analyses and the current x1 conversation?'))return;
    recentItems=[];
    saveRecentItems();
    renderRecentItems();
    startNewConversation();
    showToast('Recent analyses and conversation cleared. A new conversation is ready.');
  }
  function addChatMessage(role,text,meta='',persist=true){
    if(!chatThread)return null;
    const wrapper=document.createElement('div');
    wrapper.className=`x1-chat-message is-${role}`;
    wrapper.dataset.x1Generation=String(conversationGeneration);
    const icon=document.createElement('div');icon.className='x1-chat-message-icon';icon.textContent=role==='assistant'?'x1':role==='user'?'You':'…';
    const body=document.createElement('div');body.className='x1-chat-message-body';body.textContent=text;
    if(meta){const note=document.createElement('span');note.className='x1-chat-message-meta';note.textContent=meta;body.appendChild(note)}
    wrapper.append(icon,body);chatThread.appendChild(wrapper);chatThread.scrollTop=chatThread.scrollHeight;
    if(persist&&(role==='assistant'||role==='user')){conversation.push({role,text,meta,time:Date.now()});conversation=conversation.slice(-30);saveConversation()}
    return wrapper;
  }
  function addThinking(label='Retrieving and planning'){
    if(!chatThread)return null;
    const wrapper=document.createElement('div');wrapper.className='x1-chat-message is-assistant is-thinking';wrapper.dataset.x1Generation=String(conversationGeneration);
    const icon=document.createElement('div');icon.className='x1-chat-message-icon';icon.textContent='x1';
    const body=document.createElement('div');body.className='x1-chat-message-body';body.append(label);
    for(let i=0;i<3;i++){const dot=document.createElement('span');dot.className='x1-thinking-dot';body.appendChild(dot)}
    wrapper.append(icon,body);chatThread.appendChild(wrapper);chatThread.scrollTop=chatThread.scrollHeight;return wrapper;
  }
  function initialiseConversation(){
    purgeChatThread();
    try{const stored=JSON.parse(localStorage.getItem(conversationStorageKey)||'[]');conversation=Array.isArray(stored)?stored.slice(-20):[]}catch(error){conversation=[]}
    if(conversation.length)conversation.forEach(item=>addChatMessage(item.role,item.text,item.meta||'',false));
  }
  function clearConversation(){startNewConversation();showToast('A new conversation is ready.')}

  function focusWorkflowTarget(stage,target=''){let destination=null;if(target==='accounts')destination=document.getElementById('x1AccountSchedules');else if(target==='report')destination=document.getElementById('x1AccountantReport');else if(target==='exceptions')destination=document.querySelector('[data-x1-stage-panel="review"] .x1-exception-list');else destination=document.querySelector(`[data-x1-stage-panel="${stage}"]`);if(!destination)return;destination.scrollIntoView({behavior:'smooth',block:target==='report'?'start':'center'});if(!destination.hasAttribute('tabindex'))destination.setAttribute('tabindex','-1');try{destination.focus({preventScroll:true})}catch(error){destination.focus()}}
  function openWorkflow(stage,{sample=false,autorun=false,target=''}={}){clickWorkspace('workbench');const selector=target?`[data-x1-open-workflow="${stage}"][data-x1-target="${target}"]`:`[data-x1-open-workflow="${stage}"]`;const workflowButton=document.querySelector(selector);document.querySelectorAll('[data-x1-open-workflow]').forEach(button=>button.classList.toggle('is-active',button===workflowButton));if(sample)document.getElementById('x1LoadSample')?.click();if(stage==='data'){clickStage('data');setTimeout(()=>focusWorkflowTarget('data',target),120);showToast(sample?'Balanced test data loaded.':'Reconciliation data workspace opened.');return}const reveal=()=>{clickStage(stage);setTimeout(()=>focusWorkflowTarget(stage,target),140);showToast(target==='exceptions'?'Exception review opened.':target==='accounts'?'Updated accounts opened.':'Accountant-ready report opened.')};if(!resultsAvailable()&&autorun){runReconciliation();setTimeout(reveal,180);return}if(resultsAvailable())reveal();else{clickStage('data');showToast('Enter or import records, then run the reconciliation.')}}
  function getAppState(){const activePanel=document.querySelector('[data-x1-workspace-panel]:not([hidden])')?.dataset.x1WorkspacePanel||'home',panelNames={home:'Financial assistant',transform:'Transform Data',workbench:'Reconciliation workspace',workflows:'Workflows',overview:'Application capabilities'},nodes=document.querySelectorAll('#wfNodeLayer .wf-node').length,connections=document.querySelectorAll('#wfConnectionLayer path').length;return{panel:activePanel,panelName:panelNames[activePanel]||activePanel,reconciliationReady:resultsAvailable(),workflowNodes:nodes,workflowConnections:connections,neuralReady:brain.ready,knowledgeUnits:knowledgeBase.length,importedUnits:importedKnowledge.length,deepModel:ollama.enabled&&ollama.available}}
  function explicitCommand(q){return /^(please\s+)?(open|show|take me to|go to|launch|start|load|run|create|build|prepare|generate|review|import)\b/i.test(q.trim())||/\b(open it|take me there|do it now)\b/i.test(q)}
  function detectAction(q,intent){if(!explicitCommand(q))return null;if(/workflow|node|pipeline|alteryx|knime|n8n/.test(q)||intent==='workflow')return()=>clickWorkspace('workflows');if(/transform|clean|csv|excel|xlsx|json|pdf|import|upload/.test(q)||intent==='transform')return()=>clickWorkspace('transform');if(/exception|unmatched|investigate|review/.test(q)||intent==='exceptions')return()=>openWorkflow('review',{autorun:true,target:'exceptions'});if(/report|statement/.test(q)||intent==='report')return()=>openWorkflow('statement',{autorun:true,target:'report'});if(/updated bank|updated cash|account/.test(q))return()=>openWorkflow('statement',{autorun:true,target:'accounts'});if(/sample|demo/.test(q))return()=>openWorkflow('data',{sample:true});if(/reconcil|bank|cash ledger|cash book/.test(q)||intent==='reconciliation')return()=>openWorkflow('data');if(/capabilit|overview|about/.test(q)||intent==='capabilities')return()=>clickWorkspace('overview');return null}
  function evaluateArithmeticExpression(expression){const compact=expression.replace(/\s+/g,''),parts=compact.match(/\d+(?:\.\d+)?|[()+\-*/]/g)||[];if(parts.join('')!==compact)return null;let position=0;function parseExpression(){let value=parseTerm();while(parts[position]==='+'||parts[position]==='-'){const operator=parts[position++],right=parseTerm();value=operator==='+'?value+right:value-right}return value}function parseTerm(){let value=parseFactor();while(parts[position]==='*'||parts[position]==='/'){const operator=parts[position++],right=parseFactor();value=operator==='*'?value*right:value/right}return value}function parseFactor(){const token=parts[position++];if(token==='-')return-parseFactor();if(token==='+')return parseFactor();if(token==='('){const value=parseExpression();if(parts[position++]!==')')throw new Error('Unbalanced expression');return value}const value=Number(token);if(!Number.isFinite(value))throw new Error('Invalid number');return value}try{const value=parseExpression();return position===parts.length&&Number.isFinite(value)?value:null}catch(error){return null}}
  function safeArithmetic(q){const match=q.match(/(?:calculate|compute|what is|work out)\s+([0-9.,+\-*/()%\s]+)$/i);if(!match)return null;const expr=match[1].replace(/,/g,'').replace(/(\d+(?:\.\d+)?)%/g,'($1/100)');if(!/^[0-9+\-*/().\s]+$/.test(expr))return null;return evaluateArithmeticExpression(expr)}

  function intentFromRules(q){const rules=[['identity',/conscious|self.?aware|who are you|your brain|do you think|sentient/],['app_state',/where am i|current workspace|what are you doing|application state/],['privacy',/privacy|offline|send.*online|local storage|external ai|ollama/],['machine_learning',/machine learning|deep learning|neural|rag|retrieval augmented|model/],['workflow',/workflow|node|pipeline|alteryx|knime|n8n|drag.?and.?drop/],['transform',/transform|clean|csv|xlsx|excel|json|pdf|pivot|data mining|upload|import/],['exceptions',/unmatched|exception|deposit in transit|outstanding|bank charge|dishonou?r/],['report',/statement|report|updated bank|updated cash|case report|accountant/],['reconciliation',/reconcil|cash book|cash ledger|adjusted bank|bank balance/],['data_quality',/data quality|duplicate|missing value|validation|bad date/],['forensic',/forensic|financial investigation|paper trail|indirect method|asset tracing|net worth method|bank deposits method/],['evidence',/evidence|chain of custody|document request|interview|public record/],['fraud',/fraud|embezzlement|ponzi|money laundering|red flag|criminal proceeds/],['legal',/law|legal|tax investigation|elements|intent|forfeiture|court/],['accounting',/debit|credit|ledger|trial balance|accounting equation|financial statement|accrual|prepayment|depreciation|receivable|payable/],['capabilities',/what can|capabilit|features|help/],['greeting',/^(hello|hi|hey|good morning|good afternoon|good evening)\b/],['gratitude',/thank|thanks|great job|helpful/]];for(const [intent,pattern] of rules)if(pattern.test(q))return{intent,confidence:.97,source:'rule'};return null}
  function classifyIntent(prompt){const q=normalise(prompt),ruled=intentFromRules(q);if(ruled)return ruled;if(brain.ready){const ranked=brain.predict(prompt);if(ranked[0]?.score>.23)return{intent:ranked[0].label,confidence:ranked[0].score,source:'neural'}}const retrieved=retrieveKnowledge(prompt,1)[0];return{intent:retrieved?.item.kind||lastIntent||'capabilities',confidence:retrieved?.score||.2,source:'retrieval'}}
  function followUpContext(prompt,intent){const q=normalise(prompt);if(/^(and|what about|how about|explain that|tell me more|give examples)\b/.test(q)&&lastIntent!=='general')return lastIntent;return intent}
  function detectAnswerMode(prompt){const q=normalise(prompt);if(/^(what is|who is|define|meaning of|explain the meaning)/.test(q))return'definition';if(/red flag|warning sign|indicator|suspicious/.test(q))return'red_flags';if(/how do|how to|steps|process|procedure|method/.test(q))return'steps';if(/difference|compare| versus | vs /.test(` ${q} `))return'comparison';if(/analyse|analyze|assess|evaluate|review/.test(q))return'analysis';if(/should|recommend|advice|advise/.test(q))return'advisory';return'general'}
  function planResponse(prompt,classification,matches){const mode=detectAnswerMode(prompt),top=matches[0],confidence=top?clamp((top.score*.72)+(classification.confidence*.28),0,1):classification.confidence*.4;return{intent:classification.intent,mode,confidence,goal:mode==='steps'?'Provide a practical ordered method':mode==='red_flags'?'Identify warning signs without treating them as proof':mode==='comparison'?'Explain the key distinction':mode==='definition'?'Give a clear definition and practical meaning':'Answer directly from the strongest evidence',evidenceIds:matches.slice(0,5).map(x=>x.item.id),caution:matches.some(x=>x.item.jurisdiction)?'Jurisdiction-specific details require local verification':'',source:classification.source}}
  function unique(values){const seen=new Set();return values.filter(value=>{const key=normalise(value);if(!key||seen.has(key))return false;seen.add(key);return true})}
  function sentence(value){const text=String(value||'').trim();return text&&!/[.!?]$/.test(text)?`${text}.`:text}
  function compareAnswer(prompt){const q=normalise(prompt);let parts=null;let m=q.match(/difference between (.+?) and (.+)$/);if(m)parts=[m[1],m[2]];else{m=q.match(/(.+?)\s+(?:vs|versus)\s+(.+)/);if(m)parts=[m[1],m[2]]}if(!parts)return null;const a=retrieveKnowledge(parts[0],1)[0]?.item,b=retrieveKnowledge(parts[1],1)[0]?.item;if(!a||!b||a.id===b.id)return null;return `${a.title}: ${a.text}\n\n${b.title}: ${b.text}\n\nKey distinction: the first concept focuses on ${a.tags?.slice(0,3).join(', ')||a.title}, while the second focuses on ${b.tags?.slice(0,3).join(', ')||b.title}.`}
  function localRephrase(value,index=0){
    let text=sentence(value).replace(/^The investigator must\b/i,'A sound investigation should').replace(/^The investigator should\b/i,'A sound investigation should').replace(/^It is necessary to\b/i,'The practical requirement is to').replace(/\bis the process of\b/i,'refers to').replace(/\bis used to\b/i,'helps to');
    if(index>0&&/^This\b/.test(text))text=text.replace(/^This\b/,'That approach');
    return text;
  }
  function writeLocalAnswer(prompt,plan,matches){
    const useful=matches.filter(match=>match.score>.045);
    if(!useful.length)return'I do not have enough reliable material in the current knowledge base to answer that precisely. Add a relevant document or narrow the question to a financial process, record type, transaction pattern or investigative method.';
    const primary=useful[0].item,allSegments=collectEvidenceSegments(prompt,useful,10),sameSourceSegments=allSegments.filter(segment=>segment.source===primary.source),segments=primary.kind==='imported'&&sameSourceSegments.length?sameSourceSegments:allSegments;
    if(!segments.length)return'I do not have enough reliable material in the current knowledge base to answer that precisely. Add a relevant document or narrow the question to a financial process, record type, transaction pattern or investigative method.';
    const secondary=useful.slice(1,4).map(x=>x.item);let answer='';
    if(plan.mode==='comparison'){const compared=compareAnswer(prompt);if(compared)answer=compared}
    if(!answer&&plan.mode==='definition')answer=localRephrase(segments[0].text);
    if(!answer&&plan.mode==='steps'){
      const steps=unique([...(primary.steps||[]),...secondary.flatMap(item=>item.steps||[]),...segments.slice(1).map(item=>item.text)]).slice(0,7);
      answer=localRephrase(segments[0].text);if(steps.length)answer+=`\n\nPractical method:\n${steps.map((step,index)=>`${index+1}. ${localRephrase(step,index)}`).join('\n')}`;
    }
    if(!answer&&plan.mode==='red_flags'){
      const flags=unique([...(primary.redFlags||[]),...secondary.flatMap(item=>item.redFlags||[]),...(primary.points||[]),...segments.slice(1).map(item=>item.text)]).slice(0,7);
      answer=localRephrase(segments[0].text);if(flags.length)answer+=`\n\nWarning signs to investigate:\n${flags.map((flag,index)=>`• ${localRephrase(flag,index)}`).join('\n')}`;answer+='\n\nA red flag is an investigative lead, not proof by itself.';
    }
    if(!answer&&(plan.mode==='analysis'||plan.mode==='advisory')){
      const points=unique([...(primary.points||[]),...(primary.steps||[]),...segments.slice(1).map(item=>item.text)]).slice(0,6);answer=localRephrase(segments[0].text);if(points.length)answer+=`\n\nAnalytical focus:\n${points.map((point,index)=>`• ${localRephrase(point,index)}`).join('\n')}`;
    }
    if(!answer){answer=localRephrase(segments[0].text);segments.slice(1,3).forEach((item,index)=>{answer+=`\n\n${index===0?'Related point':'Additional consideration'}: ${localRephrase(item.text,index+1)}`})}
    if(plan.intent==='workflow')answer+='\n\nIn FINDAT, begin with document-input nodes, clean each source, connect both prepared streams to Reconcile, then finish with Data Preview or Report.';
    if(plan.intent==='reconciliation')answer+='\n\nControl objective: the adjusted bank and adjusted cash-book balances should agree, and every difference should be supported and classified.';
    if(plan.caution)answer+=`\n\nCaution: ${plan.caution}.`;
    return answer;
  }

  function reviewAnswer(draft,prompt,plan){
    let text=String(draft||'').replace(/\*\*/g,'').replace(/\baccording to (the|this) (document|text|passage)\b/gi,'').replace(/\s+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
    const paragraphs=text.split(/\n\n+/),keptParagraphs=[],seenParagraphs=[];
    paragraphs.forEach(paragraph=>{
      const lines=paragraph.split('\n'),keptLines=[];
      lines.forEach(line=>{
        const key=normalise(line),set=tokenSet(line);
        if(!key)return;
        const repeated=seenParagraphs.some(previous=>key===previous.key||jaccard(set,previous.set)>.88);
        if(!repeated){seenParagraphs.push({key,set});keptLines.push(line.trim())}
      });
      if(keptLines.length)keptParagraphs.push(keptLines.join('\n'));
    });
    text=keptParagraphs.join('\n\n').replace(/\b([a-z]+)(?:\s+\1){2,}\b/gi,'$1');
    if(text.length>3200)text=text.slice(0,3150).replace(/\s+\S*$/,'')+'…';
    if(/\b(zambia|law|legal|tax|court|prosecution|forfeiture)\b/i.test(prompt)&&!/qualified|jurisdiction|local law/i.test(text))text+='\n\nVerify the legal or tax treatment under current applicable Zambian and other relevant jurisdictional requirements.';
    if(plan.confidence<.22&&!/not enough|cannot/i.test(text))text=`I have limited confidence in the match for that wording. ${text}`;
    return text;
  }


  async function ollamaRequest(system,user,options={}){
    const payload={model:ollama.model,system,prompt:user,stream:false,options:{temperature:options.temperature??.18,top_p:options.top_p??.88,repeat_penalty:options.repeat_penalty??1.18,num_predict:options.num_predict??650,num_ctx:options.num_ctx??12288}};
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),options.timeout??120000);
    try{
      const response=await fetch(`${ollama.endpoint.replace(/\/$/,'')}/api/generate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();return String(data.response||'').trim()||null;
    }finally{clearTimeout(timer)}
  }

  async function callOllama(prompt,plan,matches){
    if(!ollama.enabled||!ollama.available)return null;
    const segments=collectEvidenceSegments(prompt,matches,12);
    if(!segments.length)return null;
    const evidence=segments.map((segment,index)=>({
      id:index+1,fact:segment.text,source:segment.source,section:segment.title,
      pages:segment.pageStart?segment.pageStart===segment.pageEnd?String(segment.pageStart):`${segment.pageStart}-${segment.pageEnd}`:'',
      jurisdiction:segment.jurisdiction
    }));
    const recentContext=conversation.slice(-8).map(turn=>`${turn.role}: ${turn.text}`).join('\n');
    const previousAnswers=conversation.filter(turn=>turn.role==='assistant').slice(-3).map(turn=>turn.text).join('\n---\n');
    const synthesisSystem=`You are x1, the local Ollama reasoning and writing engine inside FINDAT. You receive a user question, a response plan, recent conversation and retrieved evidence from documents stored in the Knowledge area.\n\nYour task is synthesis, not extraction.\n- Use only facts supported by the evidence packet and explicit application facts.\n- Combine related facts from several passages into one coherent answer.\n- Restate the meaning in fresh, natural wording. Do not copy complete source sentences or reuse a sequence of 10 or more source words unless it is an unavoidable technical term, name, number or legal phrase.\n- Do not repeat the same idea in different words. Every paragraph or bullet must add new information.\n- Vary sentence openings and structure; avoid formulaic phrases and repeated transitions.\n- Preserve exact amounts, dates, names, formulas and technical distinctions when material.\n- Start with the direct answer, then explain the reasoning or practical steps.\n- If the evidence is insufficient, say exactly what cannot be established; do not invent facts, sources, laws or citations.\n- Do not mention the evidence packet, retrieval process, hidden planning or page chunks unless the user asks about sources.\n- Do not claim consciousness or sentience.\n- For legal, tax or investigative conclusions, make jurisdictional limits clear.\n- Keep the answer under 450 words and return only the answer.`;
    const synthesisPrompt=`Response plan:\n${JSON.stringify(plan,null,2)}\n\nRetrieved evidence:\n${JSON.stringify(evidence,null,2)}\n\nRecent conversation:\n${recentContext||'None'}\n\nUser question:\n${prompt}`;
    try{
      const draft=await ollamaRequest(synthesisSystem,synthesisPrompt,{temperature:.22,top_p:.9,repeat_penalty:1.2,num_predict:760,num_ctx:12288,timeout:135000});
      if(!draft)return null;
      const reviewSystem=`You are x1's final answer editor. Rewrite the draft without changing any supported fact.\n- Remove repeated ideas, duplicated clauses, circular explanations and filler.\n- Replace source-like or copied wording with a genuinely restructured explanation.\n- Avoid reusing distinctive phrases from the recent answers.\n- Vary vocabulary and sentence rhythm while keeping technical terms accurate.\n- Preserve numbers, dates, names, formulas, cautions and jurisdiction limits.\n- Do not add new claims.\n- Keep the clearest structure for the question: concise paragraphs, or short steps/bullets when useful.\n- Return only the polished final answer.`;
      const reviewPrompt=`User question:\n${prompt}\n\nEvidence facts that must control the answer:\n${JSON.stringify(evidence,null,2)}\n\nRecent assistant wording to avoid repeating:\n${previousAnswers||'None'}\n\nDraft answer:\n${draft}`;
      let finalText=null;
      try{finalText=await ollamaRequest(reviewSystem,reviewPrompt,{temperature:.16,top_p:.86,repeat_penalty:1.24,num_predict:720,num_ctx:12288,timeout:135000})}catch(error){finalText=null}
      return{text:finalText||draft,evidenceCount:evidence.length,sourceCount:new Set(evidence.map(item=>item.source)).size,rewritten:Boolean(finalText)};
    }catch(error){
      ollama.available=false;updateOllamaUi('Connection lost','error');showToast('Local model unavailable. x1 used the embedded RAG answer instead.');return null;
    }
  }

  function buildResponse(prompt){
    const q=normalise(prompt),classification=classifyIntent(prompt);classification.intent=followUpContext(prompt,classification.intent);const intent=classification.intent,state=getAppState(),action=detectAction(q,intent),arithmetic=safeArithmetic(prompt);
    if(arithmetic!==null)return{localText:`The calculated result is ${arithmetic.toLocaleString(undefined,{maximumFractionDigits:8})}.`,intent:'calculation',topic:'calculation',action:null,meta:'Rule-based arithmetic',plan:{confidence:1},matches:[]};
    if(intent==='greeting')return{localText:'Hello. My embedded financial-investigation knowledge base is ready. Ask a question, add a document, or give a direct FINDAT command.',intent,topic:'x1',action:null,meta:'Conversation intent',plan:{confidence:1},matches:[]};
    if(intent==='gratitude')return{localText:'You’re welcome. I will keep the current topic and retrieved context for your next question.',intent,topic:lastTopic,action:null,meta:'Conversation context retained',plan:{confidence:1},matches:[]};
    if(intent==='identity')return{localText:'I am x1’s embedded RAG reasoning engine. I retrieve relevant evidence, classify intent with a compact neural network, create a response plan, compose an answer and review it for consistency. I am application-aware but not conscious or sentient.',intent,topic:'identity',action:null,meta:'Architecture explanation',plan:{confidence:1},matches:[]};
    if(intent==='app_state')return{localText:`You are in ${state.panelName}. The knowledge base contains ${state.knowledgeUnits} evidence units, including ${state.importedUnits} imported units. Reconciliation results are ${state.reconciliationReady?'available':'not yet generated'}. The workflow canvas contains ${state.workflowNodes} nodes and ${state.workflowConnections} rendered connections. The optional deep model is ${state.deepModel?'connected':'off or unavailable'}.`,intent,topic:'state',action:null,meta:'Live application-state inspection',plan:{confidence:1},matches:[]};
    if(action){const names={workflow:'Workflows',transform:'Transform Data',exceptions:'exception review',report:'reporting',reconciliation:'Reconciliation workspace',capabilities:'Application capabilities'},destination=names[intent]||'the requested workspace';return{localText:`I understood this as an instruction to open ${destination}. I will perform it inside FINDAT without navigating to the website home page.`,intent,topic:intent,action,meta:`Application command · ${Math.round(classification.confidence*100)}% confidence`,plan:{confidence:classification.confidence},matches:[]}}
    const isFollowUp=/^(and|what about|how about|explain that|tell me more|give examples)\b/.test(q),retrievalPrompt=isFollowUp?`${prompt} ${lastTopic}`:prompt,matches=retrieveKnowledge(retrievalPrompt,6),plan=planResponse(prompt,classification,matches),localText=reviewAnswer(writeLocalAnswer(prompt,plan,matches),prompt,plan);return{localText,intent,topic:matches[0]?.item.id||intent,action:null,plan,matches,meta:`Embedded RAG · ${plan.mode} · ${matches.length} evidence units · ${Math.round(plan.confidence*100)}% confidence`}
  }

  async function respond(raw){
    const prompt=String(raw||'').trim();if(!prompt)return;
    const generation=conversationGeneration;
    addRecent(prompt);addChatMessage('user',prompt,'Prompt input');if(promptInput)promptInput.value='';if(sendButton)sendButton.disabled=true;
    const thinking=addThinking(ollama.enabled&&ollama.available?'Retrieving PDF evidence, synthesising and rewriting with Ollama':'Planning the instruction and inspecting x1 tools');
    await sleep(120+Math.min(260,prompt.length*2));
    if(generation!==conversationGeneration){thinking?.remove();return}
    if(window.X1AgenticRuntime?.execute){
      try{
        const agentResult=await window.X1AgenticRuntime.execute(prompt);
        if(generation!==conversationGeneration){thinking?.remove();return}
        if(agentResult?.handled){
          thinking?.remove();
          addChatMessage('assistant',agentResult.text||'The requested x1 operation is complete.',agentResult.meta||'Agentic execution');
          lastIntent=agentResult.intent||'agentic_command';lastTopic=agentResult.topic||'x1 operations';
          if(sendButton)sendButton.disabled=false;
          showToast(agentResult.toast||'x1 completed the requested operation.');
          promptInput?.focus();
          return;
        }
      }catch(error){
        if(generation!==conversationGeneration){thinking?.remove();return}
        console.error('x1 agentic runtime error',error);
        thinking?.remove();
        addChatMessage('assistant',`I could not complete the operational instruction: ${error.message||'unknown execution error'}. No hidden action was taken.`, 'Agentic execution error');
        if(sendButton)sendButton.disabled=false;promptInput?.focus();return;
      }
    }
    await sleep(60);
    if(generation!==conversationGeneration){thinking?.remove();return}
    const result=buildResponse(prompt);currentEvidence=result.matches||[];let finalText=result.localText,meta=result.meta;
    if(ollama.enabled&&ollama.available&&result.matches?.length){
      const generated=await callOllama(prompt,result.plan,result.matches);
      if(generation!==conversationGeneration){thinking?.remove();return}
      if(generated?.text){finalText=reviewAnswer(generated.text,prompt,result.plan);meta=`Local Ollama ${ollama.model} · ${generated.rewritten?'synthesis + rewrite':'synthesis'} · ${generated.evidenceCount} evidence passages · ${generated.sourceCount} source${generated.sourceCount===1?'':'s'}`}
    }
    if(generation!==conversationGeneration){thinking?.remove();return}
    thinking?.remove();addChatMessage('assistant',finalText,meta);lastIntent=result.intent||lastIntent;lastTopic=result.topic||lastTopic;
    if(sendButton)sendButton.disabled=false;showToast(result.action?'Instruction understood. Opening workspace…':ollama.enabled&&ollama.available?'Answer synthesised from retrieved knowledge.':'Response generated from the local knowledge base.');
    if(result.action)setTimeout(result.action,420);promptInput?.focus();
  }


  function saveImportedKnowledge(){try{localStorage.setItem(importedStorageKey,JSON.stringify(importedKnowledge.slice(0,MAX_IMPORTED_CHUNKS)))}catch(error){showToast('Browser storage is full. Remove some imported knowledge documents.')}}
  function loadImportedKnowledge(){try{const stored=JSON.parse(localStorage.getItem(importedStorageKey)||'[]');importedKnowledge=Array.isArray(stored)?stored.slice(0,MAX_IMPORTED_CHUNKS):[]}catch(error){importedKnowledge=[]}}
  function hashText(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
  function cleanKnowledgeText(value){
    return String(value||'').replace(/\u0000/g,' ').replace(/(\p{L})-\s*\n\s*(\p{L})/gu,'$1$2').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/^\s*(?:page\s+)?\d+\s*$/gim,'').replace(/\n{3,}/g,'\n\n').trim();
  }
  function sentenceAwareChunks(text,{sourceName,pageStart=null,pageEnd=null,sequenceStart=0}={}){
    const clean=cleanKnowledgeText(text);if(!clean)return[];
    const sentences=(clean.match(/[^.!?\n]+(?:[.!?]+|(?=\n)|$)/g)||[clean]).map(item=>item.trim()).filter(Boolean);
    const chunks=[];let current=[],length=0,sequence=sequenceStart;
    const flush=()=>{
      const body=current.join(' ').replace(/\s+/g,' ').trim();if(body.length>=70){chunks.push({
        id:`user_${hashText(`${sourceName}|${pageStart||''}|${sequence}|${body.slice(0,180)}`)}`,
        title:pageStart?`${sourceName} · page ${pageStart}${pageEnd&&pageEnd!==pageStart?`-${pageEnd}`:''}`:`${sourceName} · knowledge section ${sequence+1}`,
        tags:[...new Set(tokens(`${sourceName} ${body}`).slice(0,24))],text:body.slice(0,2400),source:sourceName,
        chapter:pageStart?`PDF page ${pageStart}${pageEnd&&pageEnd!==pageStart?`-${pageEnd}`:''}`:`Imported section ${sequence+1}`,
        pageStart,pageEnd:pageEnd||pageStart,sequence,kind:'imported'
      });sequence++}
    };
    sentences.forEach(sentenceText=>{
      const addition=sentenceText.length+1;
      if(length+addition>1450&&current.length){const overlap=current.slice(-2);flush();current=overlap;length=overlap.join(' ').length}
      if(sentenceText.length>1900){if(current.length){flush();current=[];length=0}for(let pos=0;pos<sentenceText.length;pos+=1350){current=[sentenceText.slice(pos,pos+1450)];length=current[0].length;flush();current=[];length=0}return}
      current.push(sentenceText);length+=addition;
    });
    if(current.length)flush();return chunks;
  }
  const DOCUMENT_FILE_TYPES=new Set(['pdf','xls','xlsx','docx']);
  const DOCUMENT_STOP_WORDS=new Set('about after again against also among because been before being between both could does doing down during each few from further have having into itself just more most other over same should some such than that their theirs them themselves then there these they this those through under until very what when where which while with would your yours document documents report reports page pages sheet sheets table tables data information'.split(' '));
  function documentExtension(file){return(file?.name?.split('.').pop()||'').toLowerCase()}
  function formatAnalysisNumber(value){const number=Number(value);if(!Number.isFinite(number))return String(value??'—');return number.toLocaleString(undefined,{maximumFractionDigits:2})}
  function documentTokens(text){return(String(text||'').toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g)||[]).filter(word=>!DOCUMENT_STOP_WORDS.has(word)&&!/^\d+$/.test(word))}
  function topDocumentKeywords(text,limit=8){const counts=new Map();documentTokens(text).forEach(word=>counts.set(word,(counts.get(word)||0)+1));return[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit).map(([label,value])=>({label,value}))}
  function documentSentences(text){return(cleanKnowledgeText(text).match(/[^.!?\n]+(?:[.!?]+|(?=\n)|$)/g)||[]).map(value=>value.replace(/\s+/g,' ').trim()).filter(value=>value.length>=45&&value.length<=520)}
  function summariseDocumentText(text,limit=4){
    const sentences=documentSentences(text);if(!sentences.length)return cleanKnowledgeText(text).slice(0,900);
    const frequencies=new Map();documentTokens(text).forEach(word=>frequencies.set(word,(frequencies.get(word)||0)+1));
    const ranked=sentences.map((sentence,index)=>{const words=documentTokens(sentence);const score=words.reduce((sum,word)=>sum+(frequencies.get(word)||0),0)/Math.sqrt(Math.max(words.length,1))+(index<3?5-index:0)+(sentence.match(/\b(?:total|increase|decrease|result|finding|conclusion|recommend|risk|variance|balance|revenue|cost|profit|loss)\b/gi)||[]).length*2;return{sentence,index,score}}).sort((a,b)=>b.score-a.score);
    const selected=[];for(const item of ranked){if(selected.some(existing=>existing.sentence.toLowerCase().includes(item.sentence.toLowerCase().slice(0,60))))continue;selected.push(item);if(selected.length>=limit)break}
    return selected.sort((a,b)=>a.index-b.index).map(item=>item.sentence).join(' ');
  }
  function extractDocumentFigures(text,limit=6){const matches=String(text||'').match(/(?:K|ZMW|USD|\$|£|€)?\s?\(?-?\d[\d,]*(?:\.\d+)?\)?%?/g)||[];return[...new Set(matches.map(value=>value.trim()).filter(value=>value&&value.replace(/\D/g,'').length>=2))].slice(0,limit)}
  function buildTextAnalysis(text,{sourceName,format,pages=0,paragraphs=0,ocrPages=0}={}){
    const clean=cleanKnowledgeText(text),words=clean.split(/\s+/).filter(Boolean),keywords=topDocumentKeywords(clean,8),summary=summariseDocumentText(clean,4),figures=extractDocumentFigures(clean,8);
    const keyPoints=[];if(keywords.length)keyPoints.push(`Dominant themes: ${keywords.slice(0,6).map(item=>item.label).join(', ')}.`);if(figures.length)keyPoints.push(`Notable figures detected: ${figures.join(', ')}.`);if(ocrPages)keyPoints.push(`Automatic OCR text recognition was applied to ${ocrPages} scanned or low-text PDF page${ocrPages===1?'':'s'}.`);keyPoints.push('The full extracted text has been indexed for detailed follow-up questions and evidence-based responses.');
    const metrics=[{label:'Words',value:words.length},{label:pages?'Pages':'Paragraphs',value:pages||paragraphs||documentSentences(clean).length},{label:'Key themes',value:keywords.length},{label:ocrPages?'OCR pages':'Figures found',value:ocrPages||figures.length}];
    const formatLabel=format==='pdf'?'PDF':'Microsoft Word';
    const reportText=`DOCUMENT ANALYSIS REPORT\nFile: ${sourceName}\nFormat: ${formatLabel}\nExecutive summary: ${summary}\nKey insights: ${keyPoints.join(' ')}\nDocument profile: ${words.length} words${pages?`, ${pages} processed page(s)`:''}${ocrPages?`, ${ocrPages} OCR-recognised page(s)`:''}${paragraphs?`, ${paragraphs} paragraph(s)`:''}.`;
    return{kind:format,title:sourceName,formatLabel,summary,metrics,keyPoints,chart:keywords.length?{title:'Most prominent themes',items:keywords.slice(0,8)}:null,reportText};
  }
  function excelCellText(value){if(value instanceof Date&&!Number.isNaN(value.getTime()))return value.toISOString().slice(0,10);if(value===null||value===undefined)return'';return String(value).replace(/\s+/g,' ').trim()}
  function excelNumber(value){if(typeof value==='number'&&Number.isFinite(value))return value;let text=excelCellText(value);if(!text)return null;const percent=/%$/.test(text),negative=/^\(.*\)$/.test(text);text=text.replace(/[(),%\s]/g,'').replace(/[^0-9.\-]/g,'');if(!text||text==='-'||!Number.isFinite(Number(text)))return null;let number=Number(text);if(negative)number=-Math.abs(number);if(percent)number/=100;return number}
  function uniqueExcelHeaders(row){const used=new Map();return row.map((value,index)=>{const base=excelCellText(value)||`Column ${index+1}`,key=base.toLowerCase(),count=(used.get(key)||0)+1;used.set(key,count);return count===1?base:`${base} ${count}`})}
  function excelHeaderIndex(matrix){let best=0,bestScore=-Infinity;matrix.slice(0,20).forEach((row,index)=>{const values=row.map(excelCellText).filter(Boolean),strings=values.filter(value=>excelNumber(value)===null).length,unique=new Set(values.map(value=>value.toLowerCase())).size,score=values.length*2+strings+unique-index*.2;if(values.length>=2&&score>bestScore){best=index;bestScore=score}});return best}
  function analyseExcelSheet(name,matrix){
    const nonEmpty=matrix.filter(row=>row.some(value=>excelCellText(value)));if(!nonEmpty.length)return{name,rows:0,columns:0,text:'',insights:[`${name} is empty.`],missing:0,duplicates:0,chart:null};
    const headerIndex=excelHeaderIndex(nonEmpty),headers=uniqueExcelHeaders(nonEmpty[headerIndex]||[]),dataRows=nonEmpty.slice(headerIndex+1).map(row=>headers.map((_,index)=>row[index]??'')).filter(row=>row.some(value=>excelCellText(value)));
    const profiles=headers.map((header,index)=>{const values=dataRows.map(row=>row[index]),nonBlank=values.filter(value=>excelCellText(value)!==''),numbers=nonBlank.map(excelNumber).filter(value=>value!==null),textValues=nonBlank.map(excelCellText);return{header,index,nonBlank:nonBlank.length,missing:dataRows.length-nonBlank.length,numbers,unique:new Set(textValues.map(value=>value.toLowerCase())).size}});
    const numericProfiles=profiles.filter(profile=>profile.numbers.length>=Math.max(2,Math.ceil(profile.nonBlank*.55))).map(profile=>({header:profile.header,sum:profile.numbers.reduce((a,b)=>a+b,0),average:profile.numbers.reduce((a,b)=>a+b,0)/profile.numbers.length,min:Math.min(...profile.numbers),max:Math.max(...profile.numbers)}));
    const missing=profiles.reduce((sum,profile)=>sum+profile.missing,0),signatures=dataRows.map(row=>JSON.stringify(row.map(excelCellText))),duplicates=signatures.length-new Set(signatures).size;
    const insights=[`${name} contains ${dataRows.length.toLocaleString()} data row(s) across ${headers.length} column(s).`,missing?`${missing.toLocaleString()} blank cell(s) were detected across the used data range.`:'No blank cells were detected across the used data range.',duplicates?`${duplicates.toLocaleString()} exact duplicate row(s) should be reviewed.`:'No exact duplicate rows were detected.'];
    numericProfiles.slice(0,4).forEach(profile=>insights.push(`${profile.header}: total ${formatAnalysisNumber(profile.sum)}, average ${formatAnalysisNumber(profile.average)}, range ${formatAnalysisNumber(profile.min)} to ${formatAnalysisNumber(profile.max)}.`));
    let chart=null;const numeric=profiles.find(profile=>profile.numbers.length>=Math.max(3,Math.ceil(profile.nonBlank*.55))),category=profiles.find(profile=>profile!==numeric&&profile.nonBlank>=3&&profile.unique>=2&&profile.unique<=12&&profile.numbers.length<profile.nonBlank*.45);
    if(numeric&&category){const totals=new Map();dataRows.forEach(row=>{const label=excelCellText(row[category.index])||'Unspecified',value=excelNumber(row[numeric.index]);if(value!==null)totals.set(label,(totals.get(label)||0)+value)});const items=[...totals.entries()].map(([label,value])=>({label,value})).sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,10);if(items.length>=2)chart={title:`${numeric.header} by ${category.header}`,items}}
    if(!chart&&numeric){const items=dataRows.map((row,index)=>({label:`Row ${index+1}`,value:excelNumber(row[numeric.index])})).filter(item=>item.value!==null).slice(0,10);if(items.length>=2)chart={title:`${numeric.header} — first ${items.length} records`,items}}
    const preview=[headers.join('\t'),...dataRows.slice(0,1500).map(row=>row.map(excelCellText).join('\t'))].join('\n');return{name,rows:dataRows.length,columns:headers.length,text:`WORKSHEET: ${name}\n${preview}`,insights,missing,duplicates,chart};
  }
  function buildExcelAnalysis(file,workbook){
    const sheets=workbook.SheetNames.slice(0,40).map(name=>analyseExcelSheet(name,window.XLSX.utils.sheet_to_json(workbook.Sheets[name],{header:1,defval:'',raw:true,dateNF:'yyyy-mm-dd'}))),rows=sheets.reduce((sum,sheet)=>sum+sheet.rows,0),columns=sheets.reduce((sum,sheet)=>sum+sheet.columns,0),missing=sheets.reduce((sum,sheet)=>sum+sheet.missing,0),duplicates=sheets.reduce((sum,sheet)=>sum+sheet.duplicates,0),keyPoints=sheets.flatMap(sheet=>sheet.insights).slice(0,10),chart=sheets.find(sheet=>sheet.chart)?.chart||null;
    const summary=`The workbook contains ${sheets.length} worksheet(s), ${rows.toLocaleString()} data row(s) and ${columns.toLocaleString()} combined columns. ${missing?`${missing.toLocaleString()} blank cell(s) require attention.`:'The used ranges are complete with no blank cells detected.'} ${duplicates?`${duplicates.toLocaleString()} exact duplicate row(s) were identified.`:'No exact duplicate rows were identified.'}`;
    const metrics=[{label:'Worksheets',value:sheets.length},{label:'Data rows',value:rows},{label:'Blank cells',value:missing},{label:'Duplicate rows',value:duplicates}],reportText=`EXCEL ANALYSIS REPORT\nFile: ${file.name}\nExecutive summary: ${summary}\nKey findings:\n${keyPoints.map(point=>`- ${point}`).join('\n')}`,text=`${reportText}\n\n${sheets.map(sheet=>sheet.text).join('\n\n')}`.slice(0,Math.min(MAX_IMPORT_CHARS,700000));
    return{sourceName:file.name,format:'excel',text,analysis:{kind:'excel',title:file.name,formatLabel:'Microsoft Excel',summary,metrics,keyPoints,chart,reportText}};
  }
  function escapeDocumentReport(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
  function downloadDocumentAnalysis(analysis){
    const maximum=Math.max(...(analysis.chart?.items||[]).map(item=>Math.abs(Number(item.value)||0)),1),chart=analysis.chart?.items?.length?`<section><h2>${escapeDocumentReport(analysis.chart.title)}</h2>${analysis.chart.items.map(item=>`<div style="display:grid;grid-template-columns:180px 1fr 100px;gap:12px;margin:9px 0;align-items:center"><span>${escapeDocumentReport(item.label)}</span><i style="display:block;height:18px;background:#f58220;width:${Math.max(2,Math.abs(Number(item.value)||0)/maximum*100)}%"></i><strong style="text-align:right">${escapeDocumentReport(formatAnalysisNumber(item.value))}</strong></div>`).join('')}</section>`:'';
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>${escapeDocumentReport(analysis.title)} — Analysis Report</title><style>body{font-family:Arial,sans-serif;color:#26384f;max-width:1000px;margin:40px auto;padding:0 28px;line-height:1.6}h1,h2{color:#253750}header{border-bottom:4px solid #f58220;padding-bottom:16px;margin-bottom:28px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.metric{border:1px solid #dde3e9;border-radius:12px;padding:14px}.metric strong{display:block;font-size:22px}.metric span{color:#718095;font-size:12px}li{margin:7px 0}</style></head><body><header><small>FINDAT x1 DOCUMENT INTELLIGENCE</small><h1>${escapeDocumentReport(analysis.title)}</h1><p>${escapeDocumentReport(analysis.formatLabel)}</p></header><h2>Executive summary</h2><p>${escapeDocumentReport(analysis.summary)}</p><div class="metrics">${analysis.metrics.map(metric=>`<div class="metric"><strong>${escapeDocumentReport(formatAnalysisNumber(metric.value))}</strong><span>${escapeDocumentReport(metric.label)}</span></div>`).join('')}</div><h2>Key findings</h2><ul>${analysis.keyPoints.map(point=>`<li>${escapeDocumentReport(point)}</li>`).join('')}</ul>${chart}<p><small>Generated locally by FINDAT x1. Review source documents before relying on material decisions.</small></p></body></html>`;
    const url=URL.createObjectURL(new Blob([html],{type:'text/html'})),link=document.createElement('a');link.href=url;link.download=`${analysis.title.replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]+/gi,'_')}_analysis_report.html`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function addDocumentAnalysisMessage(analysis){
    if(!chatThread||!analysis)return;const wrapper=document.createElement('div');wrapper.className='x1-chat-message is-assistant';wrapper.dataset.x1Generation=String(conversationGeneration);const icon=document.createElement('div');icon.className='x1-chat-message-icon';icon.textContent='x1';const body=document.createElement('div');body.className='x1-chat-message-body';const card=document.createElement('div');card.className='x1-doc-analysis';
    const head=document.createElement('div');head.className='x1-doc-analysis-head';const title=document.createElement('h4');title.textContent=`Analysis complete: ${analysis.title}`;const badge=document.createElement('span');badge.className='x1-doc-analysis-badge';badge.innerHTML='<i class="fas fa-check-circle" aria-hidden="true"></i>';badge.append(` ${analysis.formatLabel}`);head.append(title,badge);
    const summary=document.createElement('p');summary.className='x1-doc-analysis-summary';summary.textContent=analysis.summary;const metrics=document.createElement('div');metrics.className='x1-doc-metrics';analysis.metrics.forEach(metric=>{const item=document.createElement('div');item.className='x1-doc-metric';const strong=document.createElement('strong');strong.textContent=formatAnalysisNumber(metric.value);const span=document.createElement('span');span.textContent=metric.label;item.append(strong,span);metrics.appendChild(item)});
    const list=document.createElement('ul');list.className='x1-doc-insights';analysis.keyPoints.slice(0,8).forEach(point=>{const li=document.createElement('li');li.textContent=point;list.appendChild(li)});card.append(head,summary,metrics,list);
    if(analysis.chart?.items?.length){const chart=document.createElement('div');chart.className='x1-doc-chart';const chartTitle=document.createElement('h5');chartTitle.textContent=analysis.chart.title;chart.appendChild(chartTitle);const max=Math.max(...analysis.chart.items.map(item=>Math.abs(Number(item.value)||0)),1);analysis.chart.items.slice(0,10).forEach(item=>{const row=document.createElement('div');row.className='x1-doc-chart-row';const label=document.createElement('span');label.className='x1-doc-chart-label';label.textContent=item.label;label.title=item.label;const track=document.createElement('span');track.className='x1-doc-chart-track';const bar=document.createElement('i');bar.style.width=`${Math.max(2,Math.abs(Number(item.value)||0)/max*100)}%`;track.appendChild(bar);const value=document.createElement('strong');value.className='x1-doc-chart-value';value.textContent=formatAnalysisNumber(item.value);row.append(label,track,value);chart.appendChild(row)});card.appendChild(chart)}
    const actions=document.createElement('div');actions.className='x1-doc-actions';const download=document.createElement('button');download.type='button';download.className='x1-doc-action';download.innerHTML='<i class="fas fa-download" aria-hidden="true"></i> Download analysis report';download.addEventListener('click',()=>downloadDocumentAnalysis(analysis));actions.appendChild(download);const note=document.createElement('span');note.className='x1-chat-message-meta';note.textContent='Document indexed. Ask follow-up questions, request comparisons, or instruct x1 to prepare a deeper report.';card.append(actions,note);body.appendChild(card);wrapper.append(icon,body);chatThread.appendChild(wrapper);chatThread.scrollTop=chatThread.scrollHeight;
  }
  function chunkKnowledgeDocument(document){
    const chunks=[];let sequence=0;if(document.analysis?.reportText){const reportChunks=sentenceAwareChunks(document.analysis.reportText,{sourceName:document.sourceName,sequenceStart:sequence});chunks.push(...reportChunks);sequence+=reportChunks.length}
    if(document.format==='pdf'){document.pages.forEach(page=>{const pageChunks=sentenceAwareChunks(page.text,{sourceName:document.sourceName,pageStart:page.page,pageEnd:page.page,sequenceStart:sequence});chunks.push(...pageChunks);sequence+=pageChunks.length});return chunks}
    chunks.push(...sentenceAwareChunks(document.text,{sourceName:document.sourceName,sequenceStart:sequence}));return chunks;
  }
  async function readKnowledgeFile(file){
    const ext=documentExtension(file);if(!DOCUMENT_FILE_TYPES.has(ext))throw new Error('Only PDF, Excel (.xls/.xlsx) and Microsoft Word (.docx) files are supported.');
    if(ext==='pdf'||file.type==='application/pdf'){
      if(!window.pdfjsLib)throw new Error('The PDF reader is unavailable. Check the connection and reload the page.');
      if(!window.FindatOCR)throw new Error('The OCR text-recognition engine is unavailable. Check the connection and reload the page.');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const loading=window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}),pdf=await loading.promise,pages=[];
      let totalChars=0,ocrPages=0,ocrNoticeShown=false;
      for(let pageNo=1;pageNo<=Math.min(pdf.numPages,500);pageNo++){
        const page=await pdf.getPage(pageNo),content=await page.getTextContent({normalizeWhitespace:false,disableCombineTextItems:false});
        let pageText='',line='';
        content.items.forEach(item=>{line+=`${item.str||''} `;if(item.hasEOL){pageText+=`${line.trim()}\n`;line=''}});if(line.trim())pageText+=line.trim();
        pageText=cleanKnowledgeText(pageText);
        let pageUsedOcr=false;
        if(window.FindatOCR.needsOcr(pageText,content.items.length)){
          if(!ocrNoticeShown){showToast('Scanned or low-text PDF pages detected. x1 is running automatic OCR text recognition.');ocrNoticeShown=true;}
          const recognised=await window.FindatOCR.recognizePdfPage(page,{onProgress:message=>{
            if(message?.status==='recognizing text'&&brainStatusText)brainStatusText.textContent=`OCR scanning ${file.name} · page ${pageNo}/${pdf.numPages} · ${Math.round((message.progress||0)*100)}%`;
          }});
          if(recognised.text){pageText=cleanKnowledgeText(window.FindatOCR.mergeText(pageText,recognised.text));ocrPages++;pageUsedOcr=true;}
        }
        if(pageText)pages.push({page:pageNo,text:pageText,ocr:pageUsedOcr});
        totalChars+=pageText.length;page.cleanup();
        if(totalChars>MAX_IMPORT_CHARS)break;
      }
      if(brainStatusText)brainStatusText.textContent='Document analysis and evidence indexing ready';
      if(!pages.length)throw new Error('No readable text could be extracted, even after OCR. Improve the scan quality or remove PDF security restrictions and try again.');
      const fullText=pages.map(page=>page.text).join('\n\n'),analysis=buildTextAnalysis(fullText,{sourceName:file.name,format:'pdf',pages:pages.length,ocrPages});
      return{sourceName:file.name,format:'pdf',pages,totalPages:pdf.numPages,ocrPages,analysis};
    }
    if(ext==='docx'){if(!window.mammoth)throw new Error('The Microsoft Word reader could not load. Check the connection and reload the page.');const result=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()}),text=cleanKnowledgeText(result.value).slice(0,MAX_IMPORT_CHARS);if(!text)throw new Error('No readable text was found in this Word document.');const paragraphs=result.value.split(/\n+/).map(value=>value.trim()).filter(Boolean).length,analysis=buildTextAnalysis(text,{sourceName:file.name,format:'docx',paragraphs});return{sourceName:file.name,format:'docx',text:`${analysis.reportText}\n\nSOURCE DOCUMENT\n${text}`,analysis}}
    if(ext==='xls'||ext==='xlsx'){if(!window.XLSX)throw new Error('The Excel reader could not load. Check the connection and reload the page.');const workbook=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});if(!workbook.SheetNames.length)throw new Error('No worksheets were found in this Excel workbook.');return buildExcelAnalysis(file,workbook)}
    throw new Error('Unsupported document format.');
  }
  async function importKnowledgeFiles(files){
    const selected=[...files];if(!selected.length)return;showToast(`Analysing ${selected.length} document${selected.length===1?'':'s'} with PDF text recognition and OCR where required…`);let added=0,pagesRead=0,ocrPagesRead=0,analysed=0;
    for(const file of selected){try{const document=await readKnowledgeFile(file),chunks=chunkKnowledgeDocument(document);if(document.format==='pdf'){pagesRead+=document.pages.length;ocrPagesRead+=document.ocrPages||0;}for(const chunk of chunks){if(importedKnowledge.length>=MAX_IMPORTED_CHUNKS)break;if(!importedKnowledge.some(item=>item.id===chunk.id)){importedKnowledge.push(chunk);added++}}if(document.analysis){addDocumentAnalysisMessage(document.analysis);analysed++}if(importedKnowledge.length>=MAX_IMPORTED_CHUNKS){showToast(`Knowledge capacity reached at ${MAX_IMPORTED_CHUNKS} sections. Clear older imported documents before adding more.`);break}}catch(error){showToast(`${file.name}: ${error.message}`);addChatMessage('assistant',`${file.name} could not be analysed: ${error.message}`,'Upload PDF, Excel or Word files only.')}}
    saveImportedKnowledge();buildKnowledgeIndex();showToast(`${analysed} document${analysed===1?'':'s'} analysed and ${added} searchable evidence section${added===1?'':'s'} indexed${pagesRead?` from ${pagesRead} PDF page${pagesRead===1?'':'s'}`:''}${ocrPagesRead?`, including OCR recognition on ${ocrPagesRead} page${ocrPagesRead===1?'':'s'}`:''}.`);
  }

  function sourceSummary(){const map=new Map();knowledgeBase.forEach(item=>{const source=item.source||'Embedded knowledge';const row=map.get(source)||{source,count:0,imported:item.kind==='imported'};row.count++;row.imported=row.imported||item.kind==='imported';map.set(source,row)});return[...map.values()].sort((a,b)=>Number(a.imported)-Number(b.imported)||b.count-a.count)}
  function renderKnowledgeManager(){const count=document.getElementById('x1KbEntryCount'),sourceCount=document.getElementById('x1KbSourceCount'),importedCount=document.getElementById('x1KbImportedCount'),list=document.getElementById('x1KbSourceList');if(count)count.textContent=knowledgeBase.length;if(importedCount)importedCount.textContent=importedKnowledge.length;const sources=sourceSummary();if(sourceCount)sourceCount.textContent=sources.length;if(list){list.innerHTML='';sources.forEach(row=>{const card=document.createElement('article');card.className='x1-kb-source';const icon=document.createElement('i');icon.className=row.imported?'fas fa-file-import':'fas fa-book';const copy=document.createElement('div');const strong=document.createElement('strong');strong.textContent=row.source;const span=document.createElement('span');span.textContent=row.imported?'Imported knowledge':'Built-in knowledge';copy.append(strong,span);const badge=document.createElement('b');badge.textContent=row.count;card.append(icon,copy,badge);list.appendChild(card)})}}
  function openKnowledgeManager(){if(!knowledgeModal)return;renderKnowledgeManager();knowledgeModal.hidden=false;knowledgeModal.setAttribute('aria-hidden','false');document.getElementById('x1KbClose')?.focus()}
  function closeKnowledgeManager(){if(!knowledgeModal)return;knowledgeModal.hidden=true;knowledgeModal.setAttribute('aria-hidden','true');knowledgeManagerButton?.focus()}
  function clearImportedKnowledge(){if(!importedKnowledge.length){showToast('There is no imported knowledge to clear.');return}if(!window.confirm('Remove all documents imported into the x1 knowledge base on this browser?'))return;importedKnowledge=[];saveImportedKnowledge();buildKnowledgeIndex();showToast('Imported knowledge cleared. Built-in knowledge remains available.')}

  function loadOllamaSettings(){try{const stored=JSON.parse(localStorage.getItem(ollamaStorageKey)||'{}');if(stored.endpoint)ollama.endpoint=stored.endpoint;if(stored.model)ollama.model=stored.model;if(stored.enabled===true)ollama.enabled=true}catch(error){}if(endpointInput)endpointInput.value=ollama.endpoint;if(modelInput)modelInput.value=ollama.model;updateOllamaUi(ollama.enabled?'Connection not yet tested':'Not connected','idle')}
  function saveOllamaSettings(){ollama.endpoint=(endpointInput?.value||ollama.endpoint).trim().replace(/\/$/,'');ollama.model=(modelInput?.value||ollama.model).trim()||'llama3.1:8b-instruct';try{localStorage.setItem(ollamaStorageKey,JSON.stringify({endpoint:ollama.endpoint,model:ollama.model,enabled:ollama.enabled}))}catch(error){}}
  function updateOllamaUi(text,state='idle'){const status=document.getElementById('x1OllamaStatus'),dot=document.getElementById('x1OllamaDot');if(status)status.textContent=text;if(dot){dot.classList.toggle('is-ready',state==='ready');dot.classList.toggle('is-error',state==='error')}if(localLlmToggle){localLlmToggle.setAttribute('aria-pressed',String(ollama.enabled&&ollama.available));localLlmToggle.innerHTML=`<i class="fas fa-brain" aria-hidden="true"></i> ${ollama.enabled&&ollama.available?'Advanced synthesis active':'Advanced synthesis'}`}}
  async function testOllama(enableOnSuccess=true){if(ollama.checking)return false;saveOllamaSettings();ollama.checking=true;updateOllamaUi('Testing local endpoint…','idle');try{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000),response=await fetch(`${ollama.endpoint}/api/tags`,{signal:controller.signal});clearTimeout(timer);if(!response.ok)throw new Error(`HTTP ${response.status}`);const data=await response.json(),models=(data.models||[]).map(item=>item.name);ollama.available=true;if(enableOnSuccess)ollama.enabled=true;const exact=models.find(name=>name===ollama.model||name.startsWith(`${ollama.model}:`));updateOllamaUi(exact?`Connected · ${exact}`:`Connected · model will be requested`, 'ready');saveOllamaSettings();showToast('Ollama is ready for PDF synthesis and rewrite review.');return true}catch(error){ollama.available=false;if(enableOnSuccess)ollama.enabled=false;updateOllamaUi('Connection failed · embedded RAG remains active','error');saveOllamaSettings();showToast('Could not connect to Ollama. Embedded RAG remains active.');return false}finally{ollama.checking=false}}
  async function toggleOllama(){if(ollama.enabled&&ollama.available){ollama.enabled=false;updateOllamaUi('Connected but disabled','idle');saveOllamaSettings();showToast('Deep model disabled.');return}await testOllama(true)}

  window.FINDAT_X1_ADD_TRAINING_KNOWLEDGE=(entries=[])=>{
    const remote=(Array.isArray(entries)?entries:[]).map(item=>({id:`training-${item.id||Date.now()}`,title:item.title||'FINDAT training',tags:Array.isArray(item.tags)?item.tags:[],text:[item.input_text,item.expected_output,item.document_text].filter(Boolean).join('\n\n'),source:'FINDAT x1 Training Studio',kind:'imported'}));
    importedKnowledge=[...importedKnowledge.filter(item=>!String(item.id||'').startsWith('training-')),...remote];
    buildKnowledgeIndex();return remote.length;
  };
  window.FINDAT_X1_TEST_PROMPT=(prompt)=>{const result=buildResponse(String(prompt||''));return result?.localText||''};
  loadImportedKnowledge();loadOllamaSettings();buildKnowledgeIndex();initialiseRecentItems();initialiseConversation();
  composer?.addEventListener('submit',event=>{event.preventDefault();respond(promptInput?.value||'')});
  promptInput?.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();composer?.requestSubmit()}});
  promptInput?.addEventListener('input',()=>{promptInput.style.height='auto';promptInput.style.height=`${Math.min(80,promptInput.scrollHeight)}px`});
  document.querySelectorAll('[data-x1-prompt]').forEach(button=>button.addEventListener('click',()=>respond(button.dataset.x1Prompt)));
  document.getElementById('x1ComposerUpload')?.addEventListener('click',()=>knowledgeUpload?.click());
  clearConversationButton?.addEventListener('click',clearConversation);clearRecentButton?.addEventListener('click',clearRecentAnalyses);
  recent?.addEventListener('click',event=>{
    const deleteButton=event.target.closest('[data-x1-delete-prompt]');
    if(deleteButton){event.preventDefault();event.stopPropagation();removeRecentAnalysis(deleteButton.dataset.x1DeletePrompt);return}
    const button=event.target.closest('[data-x1-saved-prompt]');
    if(button)respond(button.dataset.x1SavedPrompt);
  });
  document.querySelectorAll('[data-x1-open-workflow]').forEach(button=>button.addEventListener('click',()=>{const workflowName=button.dataset.x1OpenWorkflow;openWorkflow(workflowName,{sample:workflowName==='data',autorun:workflowName!=='data',target:button.dataset.x1Target||''})}));
  document.querySelectorAll('[data-x1-workspace-tab]').forEach(button=>button.addEventListener('click',()=>{const name=button.dataset.x1WorkspaceTab;document.querySelectorAll('.x1-side-nav [data-x1-workspace-tab]').forEach(item=>item.classList.toggle('is-active',item.dataset.x1WorkspaceTab===name))}));
  knowledgeManagerButton?.addEventListener('click',openKnowledgeManager);document.getElementById('x1KbClose')?.addEventListener('click',closeKnowledgeManager);knowledgeModal?.addEventListener('click',event=>{if(event.target===knowledgeModal)closeKnowledgeManager()});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&knowledgeModal&&!knowledgeModal.hidden)closeKnowledgeManager()});
  document.getElementById('x1KbAddDocuments')?.addEventListener('click',()=>knowledgeUpload?.click());knowledgeUpload?.addEventListener('change',async()=>{await importKnowledgeFiles(knowledgeUpload.files);knowledgeUpload.value=''});document.getElementById('x1KbRebuild')?.addEventListener('click',()=>{buildKnowledgeIndex();showToast('Knowledge index rebuilt.')});document.getElementById('x1KbClearImported')?.addEventListener('click',clearImportedKnowledge);
  localLlmToggle?.addEventListener('click',toggleOllama);document.getElementById('x1OllamaTest')?.addEventListener('click',()=>testOllama(true));endpointInput?.addEventListener('change',saveOllamaSettings);modelInput?.addEventListener('change',saveOllamaSettings);
  if('requestIdleCallback' in window)requestIdleCallback(trainNeuralBrain,{timeout:1300});else setTimeout(trainNeuralBrain,90);
})();



/* ============================== Inline script 19 ============================== */

(()=>{
  const selector=document.getElementById('x1ModelSelector');
  const menu=document.getElementById('x1ModelMenu');
  const current=document.getElementById('x1ModelCurrent');
  const content=document.querySelector('.x1-fintech-content');
  const module=document.getElementById('x1InterfundModule');
  const bankRibbon=document.getElementById('x1BankFeatureRibbon');
  const interfundRibbon=document.getElementById('x1InterfundFeatureRibbon');
  const bankSidebar=document.getElementById('x1BankSidebarWorkspace');
  const bankRecent=document.getElementById('x1BankRecentSection');
  const interfundSidebar=document.getElementById('x1InterfundSidebar');
  const sideLabel=document.getElementById('x1SideWorkspaceLabel');
  if(!selector||!menu||!content||!module)return;

  let activeModule='bank';
  let lastResult=null;
  const currencySymbols={USD:'$',ZMW:'K',GBP:'£',EUR:'€'};

  function closeMenu(){menu.hidden=true;selector.setAttribute('aria-expanded','false');}
  function openMenu(){menu.hidden=false;selector.setAttribute('aria-expanded','true');menu.querySelector('.is-selected')?.focus();}
  selector.addEventListener('click',event=>{event.stopPropagation();menu.hidden?openMenu():closeMenu();});
  document.addEventListener('click',event=>{if(!event.target.closest('.x1-version-switcher'))closeMenu();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});

  function setModule(name){
    activeModule=name;
    const isInterfund=name==='interfund';
    content.classList.toggle('x1-module-interfund',isInterfund);
    module.hidden=!isInterfund;
    bankRibbon.hidden=isInterfund;
    interfundRibbon.hidden=!isInterfund;
    bankRibbon.setAttribute('aria-hidden',String(isInterfund));
    interfundRibbon.setAttribute('aria-hidden',String(!isInterfund));
    bankSidebar.hidden=isInterfund;
    bankRecent.hidden=isInterfund;
    interfundSidebar.hidden=!isInterfund;
    sideLabel.textContent=isInterfund?'Interfund control workspace':'Financial intelligence workspace';
    current.textContent=isInterfund?'v0.2 · Interfund Reconciliation':'v0.1 · Bank Reconciliation';
    menu.querySelectorAll('[data-x1-module-choice]').forEach(button=>{
      const selected=button.dataset.x1ModuleChoice===name;
      button.classList.toggle('is-selected',selected);
      button.setAttribute('aria-checked',String(selected));
    });
    closeMenu();
    if(isInterfund){
      if(!document.querySelector('#ifAdminRows tr'))loadSample();
      showStage('prepare');
      module.scrollIntoView({behavior:'smooth',block:'start'});
    }else{
      content.classList.remove('x1-interfund-transform-open');
      module.hidden=true;
      const panels=[...document.querySelectorAll('[data-x1-workspace-panel]')];
      if(!panels.some(panel=>!panel.hidden)){
        const home=document.querySelector('[data-x1-workspace-panel="home"]');if(home)home.hidden=false;
      }
    }
  }
  menu.querySelectorAll('[data-x1-module-choice]').forEach(button=>button.addEventListener('click',()=>setModule(button.dataset.x1ModuleChoice)));

  const monthSelect=document.getElementById('ifPeriodMonth');
  const yearSelect=document.getElementById('ifPeriodYear');
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const now=new Date();
  months.forEach((month,index)=>monthSelect.add(new Option(month,String(index))));
  for(let year=now.getFullYear()-5;year<=now.getFullYear()+5;year++)yearSelect.add(new Option(String(year),String(year)));
  monthSelect.value=String(now.getMonth());yearSelect.value=String(now.getFullYear());

  function number(value){
    const cleaned=String(value??'').replace(/[^0-9.\-]/g,'');
    const parsed=parseFloat(cleaned);
    return Number.isFinite(parsed)?parsed:0;
  }
  function money(value){
    const code=document.getElementById('ifCurrency').value||'USD';
    const symbol=currencySymbols[code]||`${code} `;
    const abs=Math.abs(number(value));
    return `${number(value)<0?'−':''}${symbol}${abs.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  }
  function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}
  function datestring(value){if(!value)return'';const date=new Date(`${value}T00:00:00`);return Number.isNaN(date.getTime())?value:date.toLocaleDateString('en-GB');}
  function rowTemplate(row={}){
    return `<tr><td><input type="date" data-field="date" value="${escapeHtml(row.date||'')}"></td><td><input type="text" data-field="reference" value="${escapeHtml(row.reference||'')}"></td><td><input type="text" data-field="description" value="${escapeHtml(row.description||'')}"></td><td><input type="number" step="0.01" data-field="debit" value="${row.debit||''}"></td><td><input type="number" step="0.01" data-field="credit" value="${row.credit||''}"></td><td><button class="if-remove-row" type="button" aria-label="Remove transaction"><i class="fas fa-times" aria-hidden="true"></i></button></td></tr>`;
  }
  function addRow(side,row={}){document.getElementById(side==='admin'?'ifAdminRows':'ifProjectRows').insertAdjacentHTML('beforeend',rowTemplate(row));invalidate();}
  function readRows(side){
    return [...document.querySelectorAll(`#${side==='admin'?'ifAdminRows':'ifProjectRows'} tr`)].map((tr,index)=>({
      index,date:tr.querySelector('[data-field="date"]')?.value||'',reference:tr.querySelector('[data-field="reference"]')?.value.trim()||'',description:tr.querySelector('[data-field="description"]')?.value.trim()||'',debit:number(tr.querySelector('[data-field="debit"]')?.value),credit:number(tr.querySelector('[data-field="credit"]')?.value),matched:false,matchIndex:null
    })).filter(row=>row.date||row.reference||row.description||row.debit||row.credit);
  }
  function invalidate(){
    lastResult=null;
    document.querySelectorAll('[data-if-stage="review"],[data-if-stage="report"]').forEach(button=>button.disabled=true);
    const status=document.getElementById('ifPrepareStatus');
    status.textContent='The ledgers changed. Run the interfund reconciliation to refresh the review and statement.';status.className='if-inline-status warning';
  }
  document.querySelectorAll('[data-if-add-row]').forEach(button=>button.addEventListener('click',()=>addRow(button.dataset.ifAddRow)));
  document.getElementById('ifAdminRows').addEventListener('click',event=>{const button=event.target.closest('.if-remove-row');if(button){button.closest('tr').remove();invalidate();}});
  document.getElementById('ifProjectRows').addEventListener('click',event=>{const button=event.target.closest('.if-remove-row');if(button){button.closest('tr').remove();invalidate();}});
  document.getElementById('ifAdminRows').addEventListener('input',invalidate);document.getElementById('ifProjectRows').addEventListener('input',invalidate);
  document.getElementById('ifAdminClosing').addEventListener('input',invalidate);document.getElementById('ifProjectClosing').addEventListener('input',invalidate);

  const sampleAdmin=[
    {date:'2026-06-03',reference:'ADM-1001',description:'Project operating transfer',debit:1000},
    {date:'2026-06-08',reference:'ADM-1002',description:'Shared procurement allocation',credit:750},
    {date:'2026-06-14',reference:'ADM-1003',description:'Project funding allocation pending recognition',credit:500},
    {date:'2026-06-19',reference:'ADM-1004',description:'Central service recovery pending project entry',debit:200}
  ];
  const sampleProject=[
    {date:'2026-06-03',reference:'PRJ-2101',description:'Project operating transfer',credit:1000},
    {date:'2026-06-08',reference:'PRJ-2102',description:'Shared procurement allocation',debit:750},
    {date:'2026-06-22',reference:'PRJ-2103',description:'Donor receipt recorded by project only',credit:300},
    {date:'2026-06-25',reference:'PRJ-2104',description:'Administration support cost recorded by project',debit:100}
  ];
  function loadSample(){
    const admin=document.getElementById('ifAdminRows'),project=document.getElementById('ifProjectRows');admin.innerHTML='';project.innerHTML='';
    sampleAdmin.forEach(row=>admin.insertAdjacentHTML('beforeend',rowTemplate(row)));sampleProject.forEach(row=>project.insertAdjacentHTML('beforeend',rowTemplate(row)));
    document.getElementById('ifAdminClosing').value='20000';document.getElementById('ifProjectClosing').value='19900';
    lastResult=null;document.querySelectorAll('[data-if-stage="review"],[data-if-stage="report"]').forEach(button=>button.disabled=true);
    const status=document.getElementById('ifPrepareStatus');status.textContent='Balanced sample loaded: two reciprocal matches and four proposed interfund adjustments.';status.className='if-inline-status success';
  }
  document.getElementById('ifLoadSample')?.addEventListener('click',loadSample);
  document.getElementById('ifClearLedgers').addEventListener('click',()=>{document.getElementById('ifAdminRows').innerHTML='';document.getElementById('ifProjectRows').innerHTML='';document.getElementById('ifAdminClosing').value='0';document.getElementById('ifProjectClosing').value='0';addRow('admin');addRow('project');invalidate();});

  function splitCsvLine(line){
    const values=[];let current='',quoted=false;
    for(let i=0;i<line.length;i++){const char=line[i];if(char==='"'){if(quoted&&line[i+1]==='"'){current+='"';i++;}else quoted=!quoted;}else if(char===','&&!quoted){values.push(current);current='';}else current+=char;}values.push(current);return values;
  }
  function parseCsv(text){
    const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(line=>line.trim());if(lines.length<2)throw new Error('CSV must contain headings and at least one transaction.');
    const headers=splitCsvLine(lines[0]).map(header=>header.trim().toLowerCase());
    const find=(names)=>headers.findIndex(header=>names.includes(header));
    const indexes={date:find(['date','transaction date']),reference:find(['reference','transaction id','txn id','trans id','journal number']),description:find(['description','details','narration']),debit:find(['debit','usd debit']),credit:find(['credit','usd credit']),balance:find(['balance','running total','usd running total'])};
    if(indexes.debit<0&&indexes.credit<0)throw new Error('CSV needs a Debit or Credit column.');
    const rows=[];let closing=null;
    lines.slice(1).forEach(line=>{const cells=splitCsvLine(line);const get=index=>index>=0?(cells[index]||'').trim():'';const row={date:get(indexes.date),reference:get(indexes.reference),description:get(indexes.description),debit:number(get(indexes.debit)),credit:number(get(indexes.credit))};if(row.date||row.reference||row.description||row.debit||row.credit)rows.push(row);const bal=get(indexes.balance);if(bal!=='')closing=number(bal);});
    return{rows,closing};
  }
  async function importCsv(side,file){
    try{const parsed=parseCsv(await file.text());const tbody=document.getElementById(side==='admin'?'ifAdminRows':'ifProjectRows');tbody.innerHTML='';parsed.rows.forEach(row=>tbody.insertAdjacentHTML('beforeend',rowTemplate(row)));if(parsed.closing!==null)document.getElementById(side==='admin'?'ifAdminClosing':'ifProjectClosing').value=parsed.closing;invalidate();const status=document.getElementById('ifPrepareStatus');status.textContent=`${side==='admin'?'Administration':'Project'} CSV imported: ${parsed.rows.length} transactions.`;status.className='if-inline-status success';}catch(error){alert(error.message||'The CSV could not be read.');}
  }
  document.getElementById('ifAdminCsv').addEventListener('change',event=>{const file=event.target.files[0];if(file)importCsv('admin',file);event.target.value='';});
  document.getElementById('ifProjectCsv').addEventListener('change',event=>{const file=event.target.files[0];if(file)importCsv('project',file);event.target.value='';});

  function performReconciliation(){
    const admin=readRows('admin'),project=readRows('project');
    if(!admin.length||!project.length){alert('Enter at least one Administration transaction and one Project transaction.');return null;}
    const tolerance=.005;const matched=[];
    const match=(adminField,projectField)=>admin.forEach((a,ai)=>{if(a.matched||a[adminField]<=0)return;const pi=project.findIndex(p=>!p.matched&&p[projectField]>0&&Math.abs(p[projectField]-a[adminField])<tolerance);if(pi>=0){a.matched=true;a.matchIndex=pi;project[pi].matched=true;project[pi].matchIndex=ai;matched.push({admin:a,project:project[pi],amount:a[adminField],direction:adminField==='debit'?'Administration debit ↔ Project credit':'Administration credit ↔ Project debit'});}});
    match('debit','credit');match('credit','debit');
    const unmatchedAdmin=admin.filter(row=>!row.matched),unmatchedProject=project.filter(row=>!row.matched),adjustments=[];
    unmatchedAdmin.forEach(row=>{
      if(row.credit>0)adjustments.push({adminDebit:0,adminCredit:0,projectDebit:row.credit,projectCredit:0,date:row.date,reference:row.reference,description:row.description||'Administration credit missing from Project',source:'Administration',entry:'Credit',amount:row.credit,action:'Debit Project ledger'});
      if(row.debit>0)adjustments.push({adminDebit:0,adminCredit:0,projectDebit:0,projectCredit:row.debit,date:row.date,reference:row.reference,description:row.description||'Administration debit missing from Project',source:'Administration',entry:'Debit',amount:row.debit,action:'Credit Project ledger'});
    });
    unmatchedProject.forEach(row=>{
      if(row.credit>0)adjustments.push({adminDebit:row.credit,adminCredit:0,projectDebit:0,projectCredit:0,date:row.date,reference:row.reference,description:row.description||'Project credit missing from Administration',source:'Project',entry:'Credit',amount:row.credit,action:'Debit Administration ledger'});
      if(row.debit>0)adjustments.push({adminDebit:0,adminCredit:row.debit,projectDebit:0,projectCredit:0,date:row.date,reference:row.reference,description:row.description||'Project debit missing from Administration',source:'Project',entry:'Debit',amount:row.debit,action:'Credit Administration ledger'});
    });
    const total=(field)=>adjustments.reduce((sum,row)=>sum+number(row[field]),0);
    const totals={adminDebit:total('adminDebit'),adminCredit:total('adminCredit'),projectDebit:total('projectDebit'),projectCredit:total('projectCredit')};
    const adminClosing=number(document.getElementById('ifAdminClosing').value),projectClosing=number(document.getElementById('ifProjectClosing').value);
    const adminAdjusted=adminClosing+totals.adminDebit-totals.adminCredit,projectAdjusted=projectClosing+totals.projectDebit-totals.projectCredit,difference=adminAdjusted-projectAdjusted;
    return{admin,project,matched,unmatchedAdmin,unmatchedProject,adjustments,totals,adminClosing,projectClosing,adminAdjusted,projectAdjusted,difference,balanced:Math.abs(difference)<.01};
  }

  function adjustmentRows(result){
    if(!result.adjustments.length)return'<tr><td colspan="7" class="if-empty-row">No reciprocal adjustments are required.</td></tr>';
    return result.adjustments.map(row=>`<tr><td>${row.adminDebit?money(row.adminDebit):''}</td><td>${row.adminCredit?money(row.adminCredit):''}</td><td>${escapeHtml(datestring(row.date))}</td><td>${escapeHtml(row.reference)}</td><td>${escapeHtml(row.description)}</td><td>${row.projectDebit?money(row.projectDebit):''}</td><td>${row.projectCredit?money(row.projectCredit):''}</td></tr>`).join('');
  }
  function renderResult(result){
    document.getElementById('ifMatchedCount').textContent=result.matched.length;document.getElementById('ifAdminExceptionCount').textContent=result.unmatchedAdmin.length;document.getElementById('ifProjectExceptionCount').textContent=result.unmatchedProject.length;document.getElementById('ifDifferenceKpi').textContent=money(result.difference);document.getElementById('ifDifferenceNote').textContent=result.balanced?'Reconciled balances agree':'Further investigation required';
    document.getElementById('ifMatchedRows').innerHTML=result.matched.length?result.matched.map(match=>`<tr><td>${escapeHtml(match.direction.split(' ↔ ')[0])}<br><small>${escapeHtml(match.admin.description)}</small></td><td>${escapeHtml(match.direction.split(' ↔ ')[1])}<br><small>${escapeHtml(match.project.description)}</small></td><td class="amount">${money(match.amount)}</td><td>${escapeHtml(match.admin.reference||match.project.reference)}</td></tr>`).join(''):'<tr><td colspan="4" class="if-empty-row">No reciprocal matches were identified.</td></tr>';
    const exceptions=[...result.unmatchedAdmin.map(row=>({source:'Administration',row})),...result.unmatchedProject.map(row=>({source:'Project',row}))];
    document.getElementById('ifExceptionRows').innerHTML=exceptions.length?exceptions.map(({source,row})=>{const entry=row.debit>0?'Debit':'Credit',amount=row.debit||row.credit,action=source==='Administration'?(entry==='Debit'?'Credit Project ledger':'Debit Project ledger'):(entry==='Debit'?'Credit Administration ledger':'Debit Administration ledger');return`<tr><td>${source}</td><td>${escapeHtml(datestring(row.date))}</td><td>${escapeHtml(row.reference)}</td><td>${entry}</td><td class="amount">${money(amount)}</td><td>${action}</td></tr>`;}).join(''):'<tr><td colspan="6" class="if-empty-row">No unmatched items.</td></tr>';
    document.getElementById('ifAdjustmentRows').innerHTML=adjustmentRows(result);document.getElementById('ifReportAdjustmentRows').innerHTML=adjustmentRows(result);
    document.getElementById('ifTotalAdminDebit').textContent=money(result.totals.adminDebit);document.getElementById('ifTotalAdminCredit').textContent=money(result.totals.adminCredit);document.getElementById('ifTotalProjectDebit').textContent=money(result.totals.projectDebit);document.getElementById('ifTotalProjectCredit').textContent=money(result.totals.projectCredit);
    const month=months[number(monthSelect.value)],year=yearSelect.value,organization=document.getElementById('ifOrganization').value.trim()||'—',projectName=document.getElementById('ifProjectName').value.trim()||'—',preparedBy=document.getElementById('ifPreparedBy').value.trim()||'—';
    const ref=`IFR-${year}${String(number(monthSelect.value)+1).padStart(2,'0')}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    document.getElementById('ifReportPeriod').textContent=`For the period ended ${month} ${year}`;document.getElementById('ifReportOrganization').textContent=organization;document.getElementById('ifReportProject').textContent=projectName;document.getElementById('ifReportPreparedBy').textContent=preparedBy;document.getElementById('ifReportReference').textContent=ref;
    document.getElementById('ifReportAdminClosing').textContent=money(result.adminClosing);document.getElementById('ifReportAdminDebitAdjustments').textContent=money(result.totals.adminDebit);document.getElementById('ifReportAdminCreditAdjustments').textContent=money(result.totals.adminCredit);document.getElementById('ifReportAdminAdjusted').textContent=money(result.adminAdjusted);
    document.getElementById('ifReportProjectClosing').textContent=money(result.projectClosing);document.getElementById('ifReportProjectDebitAdjustments').textContent=money(result.totals.projectDebit);document.getElementById('ifReportProjectCreditAdjustments').textContent=money(result.totals.projectCredit);document.getElementById('ifReportProjectAdjusted').textContent=money(result.projectAdjusted);document.getElementById('ifReportDifference').textContent=money(result.difference);
    const status=document.getElementById('ifReportStatus');status.textContent=result.balanced?'RECONCILED':'UNRECONCILED';status.className=`if-report-status ${result.balanced?'reconciled':'unreconciled'}`;
    document.getElementById('ifReportConclusion').textContent=result.balanced?`After posting the proposed reciprocal adjustments, the Administration and Project ledger balances both reconcile to ${money(result.adminAdjusted)}. No unexplained interfund difference remains.`:`After the proposed adjustments, an unexplained difference of ${money(result.difference)} remains between the Administration and Project ledgers. The underlying records require further investigation before sign-off.`;
    document.getElementById('ifSignPreparedBy').textContent=preparedBy;document.getElementById('ifSignDate').textContent=new Date().toLocaleDateString('en-GB');
  }

  function showStage(name){
    if((name==='review'||name==='report')&&!lastResult)return;
    const transformPanel=document.querySelector('[data-x1-workspace-panel="transform"]');
    const workspacePanels=[...document.querySelectorAll('[data-x1-workspace-panel]')];
    const isTransform=name==='transform';
    content.classList.toggle('x1-interfund-transform-open',isTransform);
    document.querySelectorAll('[data-if-stage]').forEach(button=>button.classList.toggle('is-active',button.dataset.ifStage===name));
    document.querySelectorAll('[data-if-side-action]').forEach(button=>button.classList.toggle('is-active',button.dataset.ifSideAction===name));
    document.querySelectorAll('[data-if-action]').forEach(button=>button.classList.toggle('is-active',button.dataset.ifAction===name));
    if(isTransform){
      module.hidden=true;
      workspacePanels.forEach(panel=>panel.hidden=panel!==transformPanel);
      transformPanel?.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    workspacePanels.forEach(panel=>panel.hidden=true);
    module.hidden=false;
    document.querySelectorAll('[data-if-panel]').forEach(panel=>panel.hidden=panel.dataset.ifPanel!==name);
    module.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function run(target='review'){
    const result=performReconciliation();if(!result)return;lastResult=result;renderResult(result);document.querySelectorAll('[data-if-stage="review"],[data-if-stage="report"]').forEach(button=>button.disabled=false);const status=document.getElementById('ifPrepareStatus');status.textContent=result.balanced?`Interfund reconciliation complete. Both ledgers reconcile to ${money(result.adminAdjusted)}.`:`Interfund reconciliation complete with a remaining difference of ${money(result.difference)}.`;status.className=`if-inline-status ${result.balanced?'success':'warning'}`;showStage(target);
  }
  document.getElementById('ifRunReconciliation').addEventListener('click',()=>run('review'));
  document.querySelectorAll('[data-if-stage]').forEach(button=>button.addEventListener('click',()=>showStage(button.dataset.ifStage)));
  document.querySelectorAll('[data-if-go]').forEach(button=>button.addEventListener('click',()=>showStage(button.dataset.ifGo)));
  document.querySelectorAll('[data-if-action]').forEach(button=>button.addEventListener('click',()=>{const action=button.dataset.ifAction;if(action==='transform')showStage('transform');else if(action==='prepare')showStage('prepare');else if(action==='review'){lastResult?showStage('review'):run('review');}else if(action==='report'){lastResult?showStage('report'):run('report');}}));
  document.querySelectorAll('[data-if-side-action]').forEach(button=>button.addEventListener('click',()=>{const action=button.dataset.ifSideAction;if(action==='transform')showStage('transform');else if(action==='prepare')showStage('prepare');else if(action==='review'){lastResult?showStage('review'):run('review');}else if(action==='report'){lastResult?showStage('report'):run('report');}}));

  document.getElementById('ifDownloadAdjustments').addEventListener('click',()=>{
    if(!lastResult)return;const rows=[['Admin Debit','Admin Credit','Date','Reference','Description','Project Debit','Project Credit'],...lastResult.adjustments.map(row=>[row.adminDebit||'',row.adminCredit||'',row.date,row.reference,row.description,row.projectDebit||'',row.projectCredit||''])];const csv=rows.map(row=>row.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(',')).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const link=document.createElement('a');link.href=url;link.download='x1_interfund_adjustments.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),500);
  });
  document.getElementById('ifPrintReport').addEventListener('click',()=>{document.body.classList.add('if-print-mode');window.print();setTimeout(()=>document.body.classList.remove('if-print-mode'),500);});
  loadSample();
})();



/* ============================== Inline script 20 ============================== */

(()=>{
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const number=value=>{const parsed=Number(String(value??'').replace(/[^0-9.\-]/g,''));return Number.isFinite(parsed)?parsed:0;};
  const fieldValue=(row,name)=>row.querySelector(`[data-field="${name}"]`)?.value?.trim()||'';

  function initReconTools(config){
    const root=document.getElementById(config.rootId);
    const search=document.getElementById(config.searchId);
    const filter=document.getElementById(config.filterId);
    const sort=document.getElementById(config.sortId);
    const drillButton=document.getElementById(config.drillId);
    const panel=document.getElementById(config.panelId);
    const summary=document.getElementById(config.summaryId);
    if(!root||!search||!filter||!sort||!drillButton||!panel||!summary)return;

    const ledgers=config.ledgers.map(item=>({...item,body:document.getElementById(item.bodyId)})).filter(item=>item.body);
    let orderSeed=0;
    let drillActive=false;
    let selectedRow=null;
    let selectedLedger=null;
    let scheduled=false;

    function ensureOrder(){
      ledgers.forEach(ledger=>[...ledger.body.querySelectorAll('tr')].forEach(row=>{
        if(!row.dataset.reconOrder)row.dataset.reconOrder=String(++orderSeed);
      }));
    }

    function dataFor(row,ledger){
      const date=fieldValue(row,'date');
      const reference=fieldValue(row,ledger.referenceField);
      const description=ledger.descriptionField?fieldValue(row,ledger.descriptionField):'';
      const debit=number(fieldValue(row,'debit'));
      const credit=number(fieldValue(row,'credit'));
      const balance=number(fieldValue(row,'balance'));
      return{date,reference,description,debit,credit,balance,amount:Math.max(Math.abs(debit),Math.abs(credit)),order:number(row.dataset.reconOrder)};
    }

    function visibleRows(){
      return ledgers.flatMap(ledger=>[...ledger.body.querySelectorAll('tr:not(.recon-row-hidden)')].map(row=>({row,ledger})));
    }

    function formatMoney(value){
      const code=document.getElementById(config.currencyId)?.value||'USD';
      try{return new Intl.NumberFormat('en-US',{style:'currency',currency:code,minimumFractionDigits:2}).format(number(value));}
      catch{return number(value).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}
    }

    function renderDrill(row,ledger){
      if(!row||!ledger){
        panel.querySelector('[data-recon-drill-title]').textContent='No visible transaction';
        panel.querySelector('[data-recon-drill-grid]').innerHTML='<p>No transaction matches the current search and filter.</p>';
        return;
      }
      root.querySelectorAll('.recon-row-selected').forEach(item=>item.classList.remove('recon-row-selected'));
      row.classList.add('recon-row-selected');
      selectedRow=row;selectedLedger=ledger;
      const data=dataFor(row,ledger);
      const entry=data.debit>0&&data.credit>0?'Debit and credit entered':data.debit>0?(ledger.debitMeaning||'Debit entry'):data.credit>0?(ledger.creditMeaning||'Credit entry'):'No amount entered';
      const title=panel.querySelector('[data-recon-drill-title]');
      const grid=panel.querySelector('[data-recon-drill-grid]');
      const note=panel.querySelector('[data-recon-drill-note]');
      title.textContent=`${ledger.label} transaction`;
      grid.innerHTML=`
        <div><span>Date</span><strong>${escapeHtml(data.date||'Not entered')}</strong></div>
        <div><span>Reference</span><strong>${escapeHtml(data.reference||'Not entered')}</strong></div>
        <div><span>Description</span><strong>${escapeHtml(data.description||ledger.label)}</strong></div>
        <div><span>Debit</span><strong>${data.debit?escapeHtml(formatMoney(data.debit)):'—'}</strong></div>
        <div><span>Credit</span><strong>${data.credit?escapeHtml(formatMoney(data.credit)):'—'}</strong></div>
        <div><span>Balance</span><strong>${fieldValue(row,'balance')?escapeHtml(formatMoney(data.balance)):'—'}</strong></div>`;
      note.textContent=`${entry}. Search, filter and sort affect the display only; reconciliation still evaluates every transaction.`;
    }

    function setDrill(active){
      drillActive=active;
      drillButton.classList.toggle('is-active',active);
      drillButton.setAttribute('aria-pressed',String(active));
      root.classList.toggle('recon-drill-active',active);
      panel.hidden=!active;
      if(active){
        const visible=visibleRows();
        const current=selectedRow&&!selectedRow.classList.contains('recon-row-hidden')?{row:selectedRow,ledger:selectedLedger}:visible[0];
        renderDrill(current?.row,current?.ledger);
      }else{
        root.querySelectorAll('.recon-row-selected').forEach(item=>item.classList.remove('recon-row-selected'));
      }
    }

    function compareRows(a,b,ledger,mode){
      const left=dataFor(a,ledger),right=dataFor(b,ledger);
      if(mode==='date-desc')return (right.date||'').localeCompare(left.date||'')||left.order-right.order;
      if(mode==='date-asc')return (left.date||'').localeCompare(right.date||'')||left.order-right.order;
      if(mode==='amount-desc')return right.amount-left.amount||left.order-right.order;
      if(mode==='amount-asc')return left.amount-right.amount||left.order-right.order;
      if(mode==='reference-asc')return (left.reference||'').localeCompare(right.reference||'',undefined,{numeric:true,sensitivity:'base'})||left.order-right.order;
      return left.order-right.order;
    }

    function applyTools(){
      scheduled=false;
      ensureOrder();
      const query=search.value.trim().toLowerCase();
      const filterMode=filter.value;
      const sortMode=sort.value;
      let visible=0,total=0;
      ledgers.forEach(ledger=>{
        const rows=[...ledger.body.querySelectorAll('tr')];
        total+=rows.length;
        const sorted=[...rows].sort((a,b)=>compareRows(a,b,ledger,sortMode));
        if(sorted.some((row,index)=>row!==rows[index]))ledger.body.append(...sorted);
        sorted.forEach(row=>{
          const data=dataFor(row,ledger);
          const haystack=[ledger.label,data.date,data.reference,data.description,data.debit,data.credit,data.balance].join(' ').toLowerCase();
          const matchesSearch=!query||haystack.includes(query);
          const matchesFilter=filterMode==='all'||(filterMode==='debit'&&data.debit>0)||(filterMode==='credit'&&data.credit>0);
          const show=matchesSearch&&matchesFilter;
          row.classList.toggle('recon-row-hidden',!show);
          if(show)visible++;
        });
      });
      summary.textContent=query||filterMode!=='all'||sortMode!=='original'?`Showing ${visible} of ${total} records · display tools do not exclude records from reconciliation`:`Showing all ${total} records`;
      if(drillActive){
        const selectedStillVisible=selectedRow&&selectedRow.isConnected&&!selectedRow.classList.contains('recon-row-hidden');
        const current=selectedStillVisible?{row:selectedRow,ledger:selectedLedger}:visibleRows()[0];
        renderDrill(current?.row,current?.ledger);
      }
    }

    function scheduleApply(){
      if(scheduled)return;
      scheduled=true;
      requestAnimationFrame(applyTools);
    }

    search.addEventListener('input',scheduleApply);
    filter.addEventListener('change',scheduleApply);
    sort.addEventListener('change',scheduleApply);
    drillButton.addEventListener('click',()=>setDrill(!drillActive));
    panel.querySelector('[data-recon-close]')?.addEventListener('click',()=>setDrill(false));
    root.addEventListener('click',event=>{
      if(!drillActive||event.target.closest('.x1-row-remove,.if-remove-row'))return;
      const row=event.target.closest('tbody tr');
      if(!row||row.classList.contains('recon-row-hidden'))return;
      const ledger=ledgers.find(item=>item.body.contains(row));
      if(ledger)renderDrill(row,ledger);
    });
    root.addEventListener('input',event=>{
      if(event.target.closest('tbody')||event.target.id===config.currencyId)scheduleApply();
    });
    ledgers.forEach(ledger=>new MutationObserver(scheduleApply).observe(ledger.body,{childList:true,subtree:false}));
    applyTools();
  }

  initReconTools({
    rootId:'x1Demo',searchId:'x1DataSearch',filterId:'x1DataFilter',sortId:'x1DataSort',drillId:'x1DrillToggle',panelId:'x1DrillPanel',summaryId:'x1DataSummary',currencyId:'x1ReportingCurrency',
    ledgers:[
      {bodyId:'x1BankRows',label:'Bank statement',referenceField:'id',descriptionField:'description',debitMeaning:'Money paid out by the bank',creditMeaning:'Money received by the bank'},
      {bodyId:'x1CashRows',label:'Cash ledger',referenceField:'id',descriptionField:'description',debitMeaning:'Cash receipt',creditMeaning:'Cash payment'}
    ]
  });

  initReconTools({
    rootId:'x1InterfundModule',searchId:'ifDataSearch',filterId:'ifDataFilter',sortId:'ifDataSort',drillId:'ifDrillToggle',panelId:'ifDrillPanel',summaryId:'ifDataSummary',currencyId:'ifCurrency',
    ledgers:[
      {bodyId:'ifAdminRows',label:'Administration ledger',referenceField:'reference',descriptionField:'description',debitMeaning:'Administration debit entry',creditMeaning:'Administration credit entry'},
      {bodyId:'ifProjectRows',label:'Project ledger',referenceField:'reference',descriptionField:'description',debitMeaning:'Project debit entry',creditMeaning:'Project credit entry'}
    ]
  });
})();



/* ============================== Inline script 21 ============================== */

(()=>{
  const panel=document.querySelector('[data-x1-workspace-panel="transform"]');
  if(!panel)return;

  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const money=value=>Number(value||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const STORAGE_KEY='findat_x1_transform_ml_v1';
  const STANDARD_HEADERS=['Date','Transaction ID','Description','Debit','Credit','Balance'];

  const emptySource=()=>({fileName:'',format:'',headers:[],raw:[],prepared:[],mapping:{},stats:{},mining:{},closingBalance:null,importMeta:null});
  const state={
    active:'bank',
    sources:{bank:emptySource(),cash:emptySource()},
    cleaning:{
      standardiseHeaders:true,normaliseDates:true,cleanAmounts:true,trimText:true,
      removeDescriptionAmounts:true,fillDates:true,removeDuplicates:true,removeEmpty:true,calculateBalance:true
    },
    ml:{enabled:false,tolerancePct:.5,dateWindowDays:7,idWeight:10,anomalyThreshold:2.5},
    lastMatch:{matched:0,approximate:0,totalScore:0},
    pivotRows:[]
  };

  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    if(saved&&typeof saved==='object')state.ml={...state.ml,...saved};
  }catch(error){/* localStorage may be restricted */}

  function setStatus(message,type=''){
    const element=$('#x1TransformStatus');
    if(!element)return;
    element.textContent=message;
    element.className=`x1-transform-status${type?` is-${type}`:''}`;
  }

  function normalizeHeader(value){return String(value??'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');}
  function normalizeText(value){return String(value??'').replace(/\s+/g,' ').trim();}
  function parseAmount(value){
    if(value===null||value===undefined||value==='')return null;
    let raw=String(value).trim();
    if(!raw)return null;
    const negative=/^\(.*\)$/.test(raw)||/\bcr\b/i.test(raw)||/-/.test(raw);
    raw=raw.replace(/[()]/g,'').replace(/\b(?:usd|zmw|zar|gbp|eur|dr|cr)\b/gi,'').replace(/[^0-9.,-]/g,'');
    if(raw.includes(',')&&raw.includes('.'))raw=raw.replace(/,/g,'');
    else if((raw.match(/,/g)||[]).length===1&&!raw.includes('.')&&/,\d{1,2}$/.test(raw))raw=raw.replace(',','.');
    else raw=raw.replace(/,/g,'');
    const parsed=Number(raw.replace(/-/g,''));
    if(!Number.isFinite(parsed))return null;
    return negative?-Math.abs(parsed):parsed;
  }

  function validIsoDate(year,month,day){
    const y=Number(year),m=Number(month),d=Number(day);
    if(!Number.isInteger(y)||!Number.isInteger(m)||!Number.isInteger(d)||y<1900||y>2200||m<1||m>12||d<1||d>31)return '';
    const date=new Date(Date.UTC(y,m-1,d));
    return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d
      ?`${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`:'';
  }

  function normalizeDate(value){
    if(value instanceof Date&&!Number.isNaN(value.getTime()))return validIsoDate(value.getFullYear(),value.getMonth()+1,value.getDate());
    const raw=String(value??'').trim().replace(/^['"]|['"]$/g,'');
    if(!raw)return '';
    if(/^\d+(?:\.\d+)?$/.test(raw)){
      const serial=Number(raw);
      if(serial>=20000&&serial<=90000){
        const date=new Date(Date.UTC(1899,11,30)+Math.floor(serial)*86400000);
        return date.toISOString().slice(0,10);
      }
    }
    let match=raw.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
    if(match)return validIsoDate(match[1],match[2],match[3]);
    match=raw.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
    if(match){
      let first=Number(match[1]),second=Number(match[2]),year=Number(match[3]);
      if(year<100)year+=year>=70?1900:2000;
      const day=second>12?second:first;
      const month=second>12?first:second;
      return validIsoDate(year,month,day);
    }
    const months={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
    const words=raw.replace(/,/g,' ').replace(/\s+/g,' ').trim();
    match=words.match(/^(\d{1,2})[ -]([A-Za-z]{3,9})[ -](\d{2,4})/);
    if(match){let year=Number(match[3]);if(year<100)year+=year>=70?1900:2000;return validIsoDate(year,months[match[2].toLowerCase()],match[1]);}
    match=words.match(/^([A-Za-z]{3,9})[ -](\d{1,2})[ -](\d{2,4})/);
    if(match){let year=Number(match[3]);if(year<100)year+=year>=70?1900:2000;return validIsoDate(year,months[match[1].toLowerCase()],match[2]);}
    const parsed=new Date(raw);
    return Number.isNaN(parsed.getTime())?'':validIsoDate(parsed.getFullYear(),parsed.getMonth()+1,parsed.getDate());
  }

  function detectDelimiter(text){
    const first=(String(text).replace(/^\uFEFF/,'').split(/\r?\n/).find(line=>line.trim())||'');
    const candidates=[',',';','\t','|'];
    const count=(line,delimiter)=>{
      let quoted=false,total=0;
      for(let i=0;i<line.length;i++){
        if(line[i]==='"'&&line[i-1]!=="\\")quoted=!quoted;
        else if(line[i]===delimiter&&!quoted)total++;
      }
      return total;
    };
    return candidates.sort((a,b)=>count(first,b)-count(first,a))[0];
  }

  function parseDelimited(text){
    const source=String(text).replace(/^\uFEFF/,'');
    const delimiter=detectDelimiter(source);
    const rows=[];let row=[],cell='',quoted=false;
    for(let i=0;i<source.length;i++){
      const char=source[i];
      if(char==='"'&&source[i+1]==='"'&&quoted){cell+='"';i++;continue;}
      if(char==='"'){quoted=!quoted;continue;}
      if(char===delimiter&&!quoted){row.push(cell);cell='';continue;}
      if((char==='\n'||char==='\r')&&!quoted){
        if(char==='\r'&&source[i+1]==='\n')i++;
        row.push(cell);cell='';
        if(row.some(value=>String(value).trim()))rows.push(row);
        row=[];continue;
      }
      cell+=char;
    }
    row.push(cell);if(row.some(value=>String(value).trim()))rows.push(row);
    if(rows.length<2)throw new Error('The file needs a header row and at least one data row.');
    const headers=rows[0].map((value,index)=>normalizeText(value)||`Column ${index+1}`);
    const records=rows.slice(1).map(values=>Object.fromEntries(headers.map((header,index)=>[header,values[index]??''])));
    return{headers,records};
  }



  const PDF_WORKER_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const PDF_HEADER_ORDER=['date','id','description','debit','credit','balance'];
  const PDF_HEADER_PATTERNS={
    date:/\b(?:transaction\s*)?date\b|\bposting\s*date\b|\bvalue\s*date\b/i,
    id:/\btransaction\s*(?:id|no\.?|number)\b|\btxn\s*(?:id|no\.?|number)\b|\breference(?:\s*(?:no\.?|number))?\b|\bjournal\s*(?:no\.?|number)\b/i,
    description:/\bdescription\b|\bdetails\b|\bnarration\b|\bmemo\b/i,
    debit:/\bdebit(?:s)?\b|\bwithdrawal(?:s)?\b|\bmoney\s*out\b/i,
    credit:/\bcredit(?:s)?\b|\bdeposit(?:s)?\b|\bmoney\s*in\b/i,
    balance:/\bbalance\b|\brunning\s*(?:balance|total)\b/i
  };
  const PDF_STATEMENT_ORDER=['transactionDate','valueDate','description','debit','credit','balance'];

  function pdfPlainText(value){return normalizeText(value).replace(/[–—]/g,'-');}
  function pdfHeaderKinds(text){
    const value=pdfPlainText(text);
    return PDF_HEADER_ORDER.filter(kind=>PDF_HEADER_PATTERNS[kind].test(value));
  }
  function groupPdfItems(items){
    const unique=[];const seen=new Set();
    items.filter(item=>item&&pdfPlainText(item.str)).forEach(item=>{
      const normalized={
        text:pdfPlainText(item.str),x:Number(item.transform?.[4]||0),y:Number(item.transform?.[5]||0),
        width:Math.abs(Number(item.width||0)),height:Math.abs(Number(item.height||item.transform?.[3]||8))||8
      };
      const key=`${normalized.text}|${normalized.x.toFixed(2)}|${normalized.y.toFixed(2)}|${normalized.width.toFixed(2)}`;
      if(!seen.has(key)){seen.add(key);unique.push(normalized);}
    });
    const lines=[];
    unique.sort((a,b)=>b.y-a.y||a.x-b.x).forEach(item=>{
      const tolerance=Math.max(2.5,Math.min(6.5,item.height*.55));
      let line=lines.find(candidate=>Math.abs(candidate.y-item.y)<=Math.max(tolerance,candidate.tolerance));
      if(!line){line={y:item.y,tolerance,items:[]};lines.push(line);}
      line.items.push(item);line.y=(line.y*(line.items.length-1)+item.y)/line.items.length;line.tolerance=Math.max(line.tolerance,tolerance);
    });
    return lines.sort((a,b)=>b.y-a.y).map(line=>{
      line.items.sort((a,b)=>a.x-b.x);
      line.text=normalizeText(line.items.map(item=>item.text).join(' '));
      return line;
    });
  }

  function normalizePdfDate(value){
    const original=pdfPlainText(value);
    if(!original)return '';
    const direct=normalizeDate(original.replace(/\s*([/.\-])\s*/g,'$1'));
    if(direct)return direct;
    const corrected=original
      .replace(/[OoQ]/g,'0').replace(/[Il|]/g,'1').replace(/\\/g,'/')
      .replace(/[^0-9/.\- ]/g,'').replace(/\s*([/.\-])\s*/g,'$1').replace(/\s+/g,'');
    const correctedDate=normalizeDate(corrected);
    if(correctedDate)return correctedDate;
    const digits=corrected.replace(/\D/g,'');
    if(digits.length>=8){
      const day=digits.slice(0,2),month=digits.slice(2,4),year=digits.slice(-4);
      const compact=validIsoDate(year,month,day);
      if(compact)return compact;
    }
    return '';
  }

  function normalizePdfNumberText(value){
    return pdfPlainText(value)
      .replace(/[Oo]/g,'0')
      .replace(/\s*,\s*/g,',')
      .replace(/\s*\.\s*/g,'.')
      .trim();
  }
  function parsePdfAmount(value){
    const text=normalizePdfNumberText(value);
    if(!text||!/[0-9]/.test(text))return null;
    const negative=/^\(.*\)$/.test(text)||/\bcr\b/i.test(text)||/-/.test(text);
    let numeric=text.replace(/\b(?:UGX|USD|ZMW|EUR|GBP|ZAR|DR|CR)\b/gi,'').replace(/[()]/g,'').replace(/[^0-9.,-]/g,'');
    const separators=[...numeric.matchAll(/[.,]/g)];
    if(separators.length){
      const last=separators.at(-1);const trailing=numeric.length-last.index-1;
      const decimal=trailing>0&&trailing<=2&&separators.length===1;
      numeric=decimal?numeric.replace(',','.'):numeric.replace(/[.,]/g,'');
    }
    const parsed=Number(numeric.replace(/-/g,''));
    if(!Number.isFinite(parsed))return null;
    return negative?-Math.abs(parsed):parsed;
  }
  function pdfAmountIsReliable(value,isBalance=false){
    let text=normalizePdfNumberText(value).replace(/\b(?:UGX|USD|ZMW|EUR|GBP|ZAR)\b/gi,'').trim();
    if(!text)return false;
    const pattern=isBalance
      ?/^\.?\(?-?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?\)?(?:\s*(?:DR|CR))?$/i
      :/^\(?-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?\)?(?:\s*(?:DR|CR))?$/i;
    return pattern.test(text);
  }
  function formatRecoveredPdfAmount(value){
    if(!Number.isFinite(Number(value)))return '';
    const number=Number(value);
    return Number.isInteger(number)?Math.abs(number).toLocaleString('en-US'):
      Math.abs(number).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  }

  function statementHeaderBand(lines,index){
    const seed=lines[index];const items=[];let endIndex=index;
    for(let cursor=index;cursor<Math.min(lines.length,index+4);cursor++){
      if(Math.abs(seed.y-lines[cursor].y)>12.5)break;
      items.push(...lines[cursor].items);endIndex=cursor;
    }
    items.sort((a,b)=>a.x-b.x);
    return{items,text:normalizeText(items.map(item=>item.text).join(' ')),endIndex};
  }
  function detectStatementHeader(lines,pageWidth){
    let best=null;
    lines.forEach((line,index)=>{
      const band=statementHeaderBand(lines,index);const text=band.text.toLowerCase();
      const score=(/transaction/.test(text)?1:0)+(/value\s*date/.test(text)?2:0)+(/description/.test(text)?2:0)+(/debit/.test(text)?2:0)+(/credit/.test(text)?2:0)+(/balance/.test(text)?2:0);
      if(score>=9&&(!best||score>best.score))best={...band,index,score};
    });
    if(!best)return null;
    const centre=item=>item.x+item.width/2;
    const byText=pattern=>best.items.filter(item=>pattern.test(item.text));
    const transactionWords=byText(/^transaction$/i).sort((a,b)=>a.x-b.x);
    const dateWords=byText(/^date$/i).sort((a,b)=>a.x-b.x);
    const valueWord=byText(/^value$/i)[0];
    const descriptionWords=byText(/^description$/i);
    const debitWord=byText(/^debits?$/i)[0];
    const creditWord=byText(/^credits?$/i)[0];
    const balanceWord=byText(/^balance$/i)[0];
    const leftTransaction=transactionWords.find(item=>centre(item)<pageWidth*.25);
    const descriptionWord=descriptionWords.find(item=>centre(item)>pageWidth*.2)||descriptionWords[0];
    const leftDate=dateWords.find(item=>centre(item)<pageWidth*.2);
    const valueDateWord=dateWords.find(item=>valueWord&&centre(item)>centre(valueWord)&&centre(item)<pageWidth*.35);
    const anchors={
      transactionDate:leftTransaction&&leftDate?(centre(leftTransaction)+centre(leftDate))/2:(leftTransaction?centre(leftTransaction):pageWidth*.13),
      valueDate:valueWord&&valueDateWord?(centre(valueWord)+centre(valueDateWord))/2:(valueWord?centre(valueWord):pageWidth*.20),
      description:descriptionWord?centre(descriptionWord):pageWidth*.43,
      debit:debitWord?centre(debitWord):pageWidth*.69,
      credit:creditWord?centre(creditWord):pageWidth*.79,
      balance:balanceWord?centre(balanceWord):pageWidth*.89
    };
    let previous=0;
    PDF_STATEMENT_ORDER.forEach((kind,index)=>{
      const remaining=PDF_STATEMENT_ORDER.length-index-1;const ceiling=pageWidth-remaining*20;
      anchors[kind]=Math.min(ceiling,Math.max(previous+20,anchors[kind]));previous=anchors[kind];
    });
    const dateGap=Math.max(32,anchors.valueDate-anchors.transactionDate);
    const moneyGap=Math.max(42,anchors.credit-anchors.debit);
    anchors._boundaries=[
      (anchors.transactionDate+anchors.valueDate)/2,
      anchors.valueDate+dateGap*.5,
      anchors.debit-moneyGap*.45,
      anchors.credit-moneyGap*.28,
      anchors.balance-(anchors.balance-anchors.credit)*.24
    ];
    return{anchors,startIndex:best.endIndex+1,score:best.score,headerText:best.text};
  }

  function cellsForPdfLayout(line,order,anchors){
    const points=order.map(kind=>anchors[kind]);
    const boundaries=Array.isArray(anchors._boundaries)&&anchors._boundaries.length===order.length-1
      ?anchors._boundaries:points.slice(0,-1).map((point,index)=>(point+points[index+1])/2);
    const cells=Object.fromEntries(order.map(kind=>[kind,[]]));
    line.items.forEach(item=>{
      const centre=item.x+item.width/2;let index=boundaries.findIndex(boundary=>centre<boundary);
      if(index<0)index=order.length-1;
      cells[order[index]].push(item.text);
    });
    return Object.fromEntries(order.map(kind=>[kind,normalizeText(cells[kind].join(' '))]));
  }

  function splitStatementReference(value){
    const original=pdfPlainText(value);
    if(!original)return{id:'',description:''};
    const candidates=[];
    const tokenPattern=/\d(?:[\d.\-]*\d)?/g;let match;
    while((match=tokenPattern.exec(original))){
      const token=match[0];const digits=token.replace(/\D/g,'');
      if(digits.length>=7&&digits.length<=22)candidates.push({token,index:match.index,digits});
    }
    const splitPattern=/(\d{5,7})\s+(\d{1,3})(?!\d)/g;
    while((match=splitPattern.exec(original))){
      const token=match[0],digits=token.replace(/\D/g,'');
      if(digits.length>=7&&digits.length<=10)candidates.push({token,index:match.index,digits});
    }
    if(!candidates.length)return{id:'',description:original};
    candidates.sort((a,b)=>a.index-b.index||a.token.length-b.token.length);
    const selected=candidates.at(-1);
    const id=selected.token.replace(/\s+/g,'');
    const before=original.slice(0,selected.index).trim();
    const after=original.slice(selected.index+selected.token.length).trim();
    return{id,description:normalizeText(`${before} ${after}`)};
  }

  function pdfLooksLikeFooter(text){
    const value=pdfPlainText(text).toLowerCase();
    if(!value)return true;
    if(/^page\s+\d+(?:\s+of\s*\d+)?$/.test(value))return true;
    if(/^(?:computer generated|generated|printed|statement period|account number|sort code|branch|customer|name of account|account owner|stanbic bank|company registration|vat reg|tel:|plot\s+17|kampala|disclaimer|summary of transactions)\b/.test(value))return true;
    const letters=(value.match(/[a-z]/g)||[]).length;const punctuation=(value.match(/[^a-z0-9\s]/g)||[]).length;
    return letters<3&&punctuation>8;
  }
  function statementStopLine(text){return /\b(?:disclaimer|summary of transactions)\b/i.test(pdfPlainText(text));}

  function parseStatementPage(lines,pageWidth,fallbackAnchors,pageNumber){
    const header=detectStatementHeader(lines,pageWidth);const anchors=header?.anchors||fallbackAnchors;
    if(!anchors)return{records:[],anchors:null,headerDetected:false,continuations:0};
    const records=[];let continuations=0;let lastDate='';const start=header?header.startIndex:0;
    for(let index=start;index<lines.length;index++){
      const line=lines[index];
      if(statementStopLine(line.text))break;
      if(pdfLooksLikeFooter(line.text))continue;
      const cells=cellsForPdfLayout(line,PDF_STATEMENT_ORDER,anchors);
      const transactionDate=normalizePdfDate(cells.transactionDate);
      const valueDate=normalizePdfDate(cells.valueDate);
      let date=transactionDate||valueDate;
      if(date)lastDate=date;
      const originalDescription=pdfPlainText(cells.description);
      const opening=/\bopening\s+balance\b/i.test(originalDescription);
      const closing=/\bclosing\s+balance\b/i.test(originalDescription);
      const debitValue=parsePdfAmount(cells.debit),creditValue=parsePdfAmount(cells.credit),balanceValue=parsePdfAmount(cells.balance);
      const hasFinancialValue=debitValue!==null||creditValue!==null||balanceValue!==null;
      const previous=records.at(-1);
      if(!date&&!opening&&!closing){
        if(hasFinancialValue&&originalDescription&&lastDate){date=lastDate;}
        else if(previous&&originalDescription&&!hasFinancialValue&&!pdfLooksLikeFooter(originalDescription)){
          const split=splitStatementReference(originalDescription);
          previous.Description=normalizeText(`${previous.Description} ${split.description||originalDescription}`);
          if(!previous['Transaction ID']&&split.id)previous['Transaction ID']=split.id;
          continuations++;continue;
        }else continue;
      }
      const split=splitStatementReference(originalDescription);
      records.push({
        'Date':date,
        'Transaction ID':split.id,
        'Description':split.description,
        'Debit':debitValue===null?'':cells.debit,
        'Credit':creditValue===null?'':cells.credit,
        'Balance':balanceValue===null?'':cells.balance,
        _pdfPage:pageNumber,
        _pdfTransactionDate:transactionDate,
        _pdfValueDate:valueDate,
        _pdfOpening:opening,
        _pdfClosing:closing,
        _pdfDebitReliable:pdfAmountIsReliable(cells.debit),
        _pdfCreditReliable:pdfAmountIsReliable(cells.credit),
        _pdfBalanceReliable:pdfAmountIsReliable(cells.balance,true)
      });
    }
    return{records,anchors,headerDetected:Boolean(header),continuations};
  }

  function repairStatementAmounts(records){
    let previousBalance=null;let previousReliable=false;let recoveredAmounts=0;let recoveredBalances=0;
    records.forEach(record=>{
      let debit=parsePdfAmount(record.Debit),credit=parsePdfAmount(record.Credit),balance=parsePdfAmount(record.Balance);
      const isBalanceLine=record._pdfOpening||record._pdfClosing;
      if(previousBalance!==null&&previousReliable&&balance!==null&&record._pdfBalanceReliable&&!isBalanceLine){
        const delta=balance-previousBalance;
        const rawNet=(credit||0)-(debit||0);
        const debitReliable=record._pdfDebitReliable&&debit!==null;
        const creditReliable=record._pdfCreditReliable&&credit!==null;
        if(Math.abs(delta)>0.0001&&Math.abs(rawNet-delta)>.01&&(!debitReliable&&!creditReliable)){
          if(delta<0){record.Debit=formatRecoveredPdfAmount(-delta);record.Credit='';}
          else{record.Credit=formatRecoveredPdfAmount(delta);record.Debit='';}
          recoveredAmounts++;
        }else if(debit===null&&credit===null&&Math.abs(delta)>0.0001){
          if(delta<0)record.Debit=formatRecoveredPdfAmount(-delta);else record.Credit=formatRecoveredPdfAmount(delta);
          recoveredAmounts++;
        }
      }
      debit=parsePdfAmount(record.Debit);credit=parsePdfAmount(record.Credit);
      if(balance===null&&previousBalance!==null&&(debit!==null||credit!==null)){
        balance=previousBalance-(debit||0)+(credit||0);record.Balance=formatRecoveredPdfAmount(balance);record._pdfBalanceReliable=false;recoveredBalances++;
      }
      if(balance!==null){previousBalance=balance;previousReliable=record._pdfBalanceReliable||record._pdfOpening||record._pdfClosing;}
    });
    return{recoveredAmounts,recoveredBalances};
  }

  function repairStatementDates(records){
    const counts=new Map();
    records.forEach(record=>{if(/^\d{4}-\d{2}-\d{2}$/.test(record.Date)){const key=record.Date.slice(0,7);counts.set(key,(counts.get(key)||0)+1);}});
    const dominant=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0];
    const dominantKey=dominant&&dominant[1]/Math.max(1,records.length)>=.7?dominant[0]:'';
    let previousDate='';let repairedDates=0;
    records.forEach(record=>{
      let transactionDate=record._pdfTransactionDate||record.Date;let valueDate=record._pdfValueDate||'';
      if(dominantKey){
        const repairMonth=date=>{
          if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date.slice(0,7)===dominantKey)return date;
          const corrected=validIsoDate(dominantKey.slice(0,4),dominantKey.slice(5,7),date.slice(8,10));
          return corrected||date;
        };
        transactionDate=repairMonth(transactionDate);valueDate=repairMonth(valueDate);
      }
      let chosen=transactionDate||valueDate||previousDate;
      if(previousDate&&chosen&&chosen<previousDate&&valueDate&&valueDate>=previousDate)chosen=valueDate;
      if(previousDate&&chosen&&chosen<previousDate)chosen=previousDate;
      if(chosen!==record.Date){record.Date=chosen;record._pdfNeedsReview=true;repairedDates++;}
      if(chosen)previousDate=chosen;
    });
    return repairedDates;
  }

  function inspectStatementContinuity(records){
    const pageGaps=[];let previous=null;
    records.forEach(record=>{
      const balance=parsePdfAmount(record.Balance),debit=parsePdfAmount(record.Debit)||0,credit=parsePdfAmount(record.Credit)||0;
      if(previous&&record._pdfPage!==previous.page&&previous.balance!==null&&balance!==null&&record._pdfBalanceReliable){
        const expected=previous.balance-debit+credit;const difference=expected-balance;
        if(Math.abs(difference)>.01){pageGaps.push({from:previous.page,to:record._pdfPage,amount:Math.abs(difference),type:difference>0?'debit':'credit'});record._pdfNeedsReview=true;}
      }
      if(balance!==null)previous={page:record._pdfPage,balance};
    });
    return pageGaps;
  }

  function extractStatementSummary(lines){
    const text=lines.map(line=>line.text).join(' ');const marker=text.toLowerCase().lastIndexOf('summary of transactions');
    if(marker<0)return null;
    const summary=text.slice(marker);
    const debitMatch=summary.match(/\bdebits?\s+([\d., ]+)/i);const creditMatch=summary.match(/\bcredits?\s+([\d., ]+)/i);
    const debit=debitMatch?parsePdfAmount(debitMatch[1]):null,credit=creditMatch?parsePdfAmount(creditMatch[1]):null;
    return debit!==null||credit!==null?{debit,credit}:null;
  }

  function validateStatementTotals(records,summary){
    const totals=records.reduce((result,record)=>{
      if(!record._pdfOpening&&!record._pdfClosing){result.debit+=parsePdfAmount(record.Debit)||0;result.credit+=parsePdfAmount(record.Credit)||0;}
      return result;
    },{debit:0,credit:0});
    return{...totals,summaryDebit:summary?.debit??null,summaryCredit:summary?.credit??null,
      debitDifference:summary?.debit==null?null:summary.debit-totals.debit,
      creditDifference:summary?.credit==null?null:summary.credit-totals.credit};
  }

  function headerAnchorCandidates(line){
    const candidates=[];const items=line.items;
    for(let start=0;start<items.length;start++){
      for(let length=1;length<=3&&start+length<=items.length;length++){
        const slice=items.slice(start,start+length);const text=normalizeText(slice.map(item=>item.text).join(' '));
        const kinds=pdfHeaderKinds(text);
        kinds.forEach(kind=>candidates.push({kind,text,x:slice[0].x,width:(slice.at(-1).x+slice.at(-1).width)-slice[0].x,length}));
      }
    }
    return candidates;
  }
  function detectPdfHeader(lines,pageWidth){
    let best=null;
    lines.forEach((line,index)=>{
      const bands=[line];
      if(lines[index+1]&&Math.abs(line.y-lines[index+1].y)<24)bands.push({items:[...line.items,...lines[index+1].items].sort((a,b)=>a.x-b.x),text:`${line.text} ${lines[index+1].text}`});
      bands.forEach((band,bandIndex)=>{
        const candidates=headerAnchorCandidates(band);const kinds=[...new Set(candidates.map(item=>item.kind))];
        const required=(kinds.includes('date')?1:0)+(kinds.includes('debit')?1:0)+(kinds.includes('credit')?1:0)+(kinds.includes('balance')?1:0);
        const score=kinds.length+required*.35;
        if(!best||score>best.score)best={index,endIndex:index+bandIndex,score,kinds,candidates,band};
      });
    });
    if(!best||best.kinds.length<4||!best.kinds.includes('debit')||!best.kinds.includes('credit'))return null;
    const anchors={};
    PDF_HEADER_ORDER.forEach(kind=>{
      const matches=best.candidates.filter(item=>item.kind===kind).sort((a,b)=>a.length-b.length||a.width-b.width||a.x-b.x);
      if(matches.length)anchors[kind]=matches[0].x+matches[0].width/2;
    });
    const allItems=lines.flatMap(line=>line.items);const minX=Math.min(...allItems.map(item=>item.x),0);const maxX=Math.max(...allItems.map(item=>item.x+item.width),pageWidth||0,1);
    const defaults={date:.08,id:.25,description:.47,debit:.70,credit:.81,balance:.92};
    PDF_HEADER_ORDER.forEach(kind=>{if(!Number.isFinite(anchors[kind]))anchors[kind]=minX+(maxX-minX)*defaults[kind];});
    let previous=minX-1;
    PDF_HEADER_ORDER.forEach((kind,index)=>{
      const remaining=PDF_HEADER_ORDER.length-index-1;const ceiling=maxX-remaining*18;
      anchors[kind]=Math.min(ceiling,Math.max(previous+18,anchors[kind]));previous=anchors[kind];
    });
    return{anchors,startIndex:best.endIndex+1,headerText:best.band.text,score:best.score};
  }
  function pdfCellsForLine(line,anchors){return cellsForPdfLayout(line,PDF_HEADER_ORDER,anchors);}
  function parsePdfPage(lines,pageWidth,fallbackAnchors){
    const header=detectPdfHeader(lines,pageWidth);const anchors=header?.anchors||fallbackAnchors;
    if(!anchors)return{records:[],anchors:null,headerDetected:false,continuations:0};
    const records=[];let continuations=0;const start=header?header.startIndex:0;
    for(let index=start;index<lines.length;index++){
      const line=lines[index];const lineKinds=pdfHeaderKinds(line.text);
      if(lineKinds.length>=4||pdfLooksLikeFooter(line.text))continue;
      const cells=pdfCellsForLine(line,anchors);
      let date=normalizePdfDate(cells.date);
      if(!date){const match=line.text.match(/\b(?:\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}|\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{1,2}[ -][A-Za-z]{3,9}[ -]\d{2,4})\b/);if(match)date=normalizePdfDate(match[0]);}
      const debit=parsePdfAmount(cells.debit),credit=parsePdfAmount(cells.credit),balance=parsePdfAmount(cells.balance);
      const hasAmount=debit!==null||credit!==null||balance!==null;
      const identity=normalizeText(`${cells.id} ${cells.description}`);
      if(!date&&!hasAmount&&!identity)continue;
      const previous=records.at(-1);
      if(!date&&!hasAmount&&previous){
        const addition=normalizeText(cells.description||cells.id||line.text);
        if(addition&&!pdfLooksLikeFooter(addition)){previous.Description=normalizeText(`${previous.Description} ${addition}`);continuations++;}
        continue;
      }
      if(!date&&hasAmount&&previous&&!previous.Debit&&!previous.Credit){
        if(debit!==null)previous.Debit=cells.debit;if(credit!==null)previous.Credit=cells.credit;if(balance!==null)previous.Balance=cells.balance;
        if(cells.description)previous.Description=normalizeText(`${previous.Description} ${cells.description}`);continuations++;continue;
      }
      if(!date&&!cells.id&&!cells.description&&(debit===null&&credit===null))continue;
      records.push({'Date':date||cells.date,'Transaction ID':cells.id,'Description':cells.description,'Debit':debit===null?'':cells.debit,'Credit':credit===null?'':cells.credit,'Balance':balance===null?'':cells.balance});
    }
    return{records,anchors,headerDetected:Boolean(header),continuations};
  }

  function fallbackPdfRows(lines){
    const amountPattern=/(?:\(?\s*(?:[A-Z]{2,3}|[$€£])?\s*-?\d[\d,]*(?:\.\d{1,2})?\s*\)?\s*(?:DR|CR)?)/gi;
    const rows=[];
    lines.forEach(line=>{
      const dateMatch=line.text.match(/^(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}|\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{1,2}[ -][A-Za-z]{3,9}[ -]\d{2,4})\b/);
      if(!dateMatch)return;
      const amounts=[...line.text.matchAll(amountPattern)].filter(match=>parsePdfAmount(match[0])!==null);
      if(amounts.length<2)return;
      const chosen=amounts.slice(-3);const before=line.text.slice(dateMatch[0].length,chosen[0].index).trim();const parts=before.split(/\s+/);const id=parts.shift()||'';
      rows.push({'Date':normalizePdfDate(dateMatch[0]),'Transaction ID':id,'Description':parts.join(' '),'Debit':chosen.length===3?chosen[0][0].trim():'','Credit':chosen.length===3?chosen[1][0].trim():'','Balance':chosen.at(-1)[0].trim()});
    });
    return rows;
  }

  function stripPdfInternalFields(record){
    const clean=Object.fromEntries(Object.entries(record).filter(([key])=>!key.startsWith('_pdf')));
    if(record._pdfNeedsReview)clean.__pdfReview=true;
    if(record._pdfPage)clean.__pdfPage=record._pdfPage;
    return clean;
  }
  async function readPdf(file){
    if(!window.pdfjsLib)throw new Error('The PDF reader could not load. Check the internet connection and reload the page.');
    if(!window.FindatOCR)throw new Error('The OCR text-recognition engine could not load. Check the internet connection and reload the page.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDF_WORKER_URL;
    const loadingTask=window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())});
    let pdf;
    try{pdf=await loadingTask.promise;}catch(error){
      if(error?.name==='PasswordException')throw new Error('This PDF is password-protected. Remove the password before importing it.');
      throw new Error(error?.message||'The PDF could not be opened.');
    }
    const allLines=[];const records=[];const pageRows=[];let genericAnchors=null;let statementAnchors=null;let mode='';let textItems=0;let headerPages=0;let continuations=0;let ocrPages=0;
    for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
      const page=await pdf.getPage(pageNumber);const viewport=page.getViewport({scale:1});
      const content=await page.getTextContent({normalizeWhitespace:false,disableCombineTextItems:false});
      let pageItems=content.items;
      const nativeText=normalizeText(pageItems.map(item=>item.str||'').join(' '));
      if(window.FindatOCR.needsOcr(nativeText,pageItems.length)){
        setStatus(`OCR scanning ${file.name}: page ${pageNumber} of ${pdf.numPages}…`);
        const recognised=await window.FindatOCR.recognizePdfPage(page,{onProgress:message=>{
          if(message?.status==='recognizing text')setStatus(`OCR scanning ${file.name}: page ${pageNumber}/${pdf.numPages} · ${Math.round((message.progress||0)*100)}%`);
        }});
        if(recognised.items.length){pageItems=recognised.items;ocrPages++;}
      }
      textItems+=pageItems.length;const lines=groupPdfItems(pageItems);allLines.push(...lines);
      const statementHeader=detectStatementHeader(lines,viewport.width);
      if(!mode&&statementHeader)mode='statement';
      let parsed;
      if(mode==='statement'){
        parsed=parseStatementPage(lines,viewport.width,statementAnchors,pageNumber);
        if(parsed.anchors)statementAnchors=parsed.anchors;
      }else{
        parsed=parsePdfPage(lines,viewport.width,genericAnchors);
        if(parsed.anchors)genericAnchors=parsed.anchors;
      }
      if(parsed.headerDetected)headerPages++;
      continuations+=parsed.continuations;records.push(...parsed.records);pageRows.push(parsed.records.length);
      page.cleanup();
    }
    if(textItems<1)throw new Error('No readable text was found, even after OCR. Use a clearer scan or export the source to Excel/CSV.');
    let finalRecords=records;let recovery={recoveredAmounts:0,recoveredBalances:0};let repairedDates=0;let pageGaps=[];let validation=null;
    if(mode==='statement'&&finalRecords.length){
      recovery=repairStatementAmounts(finalRecords);repairedDates=repairStatementDates(finalRecords);pageGaps=inspectStatementContinuity(finalRecords);
      validation=validateStatementTotals(finalRecords,extractStatementSummary(allLines));
    }
    if(!finalRecords.length)finalRecords=fallbackPdfRows(allLines);
    if(!finalRecords.length)throw new Error('The ledger columns could not be identified after PDF text extraction and OCR. Ensure the transaction date, description, debit, credit and balance headings are visible, or export the source to Excel/CSV.');
    finalRecords=finalRecords.map(stripPdfInternalFields);
    const validAmountRows=finalRecords.filter(record=>parsePdfAmount(record.Debit)!==null||parsePdfAmount(record.Credit)!==null||/\b(?:opening|closing)\s+balance\b/i.test(record.Description)).length;
    const datedRows=finalRecords.filter(record=>normalizePdfDate(record.Date)).length;
    const totalsMatch=!validation||((validation.debitDifference===null||Math.abs(validation.debitDifference)<.01)&&(validation.creditDifference===null||Math.abs(validation.creditDifference)<.01));
    let confidence=headerPages===pdf.numPages&&validAmountRows/finalRecords.length>=.95&&datedRows/finalRecords.length>=.95&&totalsMatch?'High':headerPages?'Medium':'Review required';
    if(ocrPages&&confidence==='High')confidence='Medium';
    return{headers:[...STANDARD_HEADERS],records:finalRecords,format:'pdf',meta:{
      pages:pdf.numPages,pagesProcessed:pageRows.length,pageRows,textItems,ocrPages,headerPages,continuations,confidence,mode:mode||'generic',
      recoveredAmounts:recovery.recoveredAmounts,recoveredBalances:recovery.recoveredBalances,repairedDates,pageGaps,validation,totalRows:finalRecords.length
    }};
  }


  async function readFile(file){
    const extension=(file.name.split('.').pop()||'').toLowerCase();
    if(extension==='pdf'||file.type==='application/pdf')return readPdf(file);
    if(extension==='csv'||file.type.includes('csv')||file.type==='text/plain')return{...parseDelimited(await file.text()),format:'csv',meta:null};
    if(!window.XLSX)throw new Error('The Excel reader could not load. Connect to the internet once or upload CSV instead.');
    const workbook=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
    const sheetName=workbook.SheetNames[0];
    if(!sheetName)throw new Error('The workbook does not contain a readable worksheet.');
    const matrix=window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName],{header:1,defval:'',raw:false,dateNF:'yyyy-mm-dd'});
    const nonEmpty=matrix.filter(row=>Array.isArray(row)&&row.some(value=>String(value).trim()));
    if(nonEmpty.length<2)throw new Error('The worksheet needs a header row and at least one data row.');
    const headers=nonEmpty[0].map((value,index)=>normalizeText(value)||`Column ${index+1}`);
    const records=nonEmpty.slice(1).map(values=>Object.fromEntries(headers.map((header,index)=>[header,values[index]??''])));
    return{headers,records,format:'excel',meta:{sheetName}};
  }

  function columnValues(records,header){return records.map(row=>normalizeText(row[header])).filter(Boolean);}
  function findHeader(headers,exact=[],patterns=[]){
    const normalized=headers.map(header=>({header,key:normalizeHeader(header)}));
    for(const alias of exact){const found=normalized.find(item=>item.key===normalizeHeader(alias));if(found)return found.header;}
    for(const pattern of patterns){const found=normalized.find(item=>pattern.test(item.key));if(found)return found.header;}
    return '';
  }

  function detectMapping(headers,records){
    const mapping={};
    mapping.date=findHeader(headers,['Transaction Date','Date','Txn Date','Posting Date','TransactionDate','PostingDate','Date of Transaction','Value Date','Effective Date'],[/date/]);
    mapping.id=findHeader(headers,['Journal Number','Transaction ID','Txn ID','Reference Number','TransactionID','ReferenceNumber','ID','Document Number','Transaction Number'],[/transaction.*(?:id|number)/,/txn.*id/,/reference/,/journal.*number/,/^id$/]);
    mapping.description=findHeader(headers,['Description','Memo','Memo/Description','Details','Description/Memo','Transaction Description','Narration'],[/description/,/narration/,/memo/]);
    mapping.debit=findHeader(headers,['Debit','Withdrawal','Withdrawals','Debit Amount','Amount Debit','USD Debit'],[/withdraw/,/^debit/,/debitamount/,/amountdebit/,/usddebit/]);
    mapping.credit=findHeader(headers,['Credit','Deposit','Deposits','Credit Amount','Amount Credit','USD Credit'],[/deposit/,/^credit/,/creditamount/,/amountcredit/,/usdcredit/]);
    mapping.balance=findHeader(headers,['USD Running Total','Balance','Running Balance','Closing Balance','Balance Amount','BalanceAmount','Ending Balance','Final Balance','Cumulative Balance','Cummulative Balance'],[/balance/,/runningtotal/]);
    mapping.amount=findHeader(headers,['Amount','Transaction Amount','Net Amount','Value'],[/^amount$/,/transactionamount/,/netamount/]);

    const details=headers.find(header=>normalizeHeader(header)==='details');
    if(details&&!mapping.id){
      const values=columnValues(records,details);
      const uniqueness=values.length?new Set(values).size/values.length:0;
      if(uniqueness>=.7)mapping.id=details;
      else if(!mapping.description)mapping.description=details;
    }
    if(mapping.id===mapping.description&&mapping.id){
      const values=columnValues(records,mapping.id);
      const uniqueness=values.length?new Set(values).size/values.length:0;
      if(uniqueness>=.7)mapping.description='';else mapping.id='';
    }
    return mapping;
  }

  function cleanDescription(value,preserveNumbers=false){
    let text=normalizeText(value);
    if(state.cleaning.removeDescriptionAmounts&&!preserveNumbers)text=text.replace(/\$?\b\d[\d,.]*\b/g,'').replace(/\s+/g,' ').trim();
    return text;
  }

  function transformSource(role){
    const source=state.sources[role];
    if(!source.raw.length){setStatus(`Load a ${role==='bank'?'bank statement':'cash ledger'} file first.`,'error');return false;}
    const mapping=detectMapping(source.headers,source.raw);
    source.mapping=mapping;
    const report={rowsReceived:source.raw.length,rowsPrepared:0,duplicates:0,datesRepaired:0,amountsRepaired:0,blanks:0};
    let lastDate='';let running=0;let anyBalance=false;
    const prepared=[];

    source.raw.forEach((raw,index)=>{
      const originalDate=mapping.date?raw[mapping.date]:'';
      let date=state.cleaning.normaliseDates?normalizeDate(originalDate):normalizeText(originalDate);
      if(!date&&state.cleaning.fillDates&&lastDate){date=lastDate;report.datesRepaired++;}
      if(date)lastDate=date;

      const id=state.cleaning.trimText?normalizeText(mapping.id?raw[mapping.id]:''):String(mapping.id?raw[mapping.id]??'':'');
      const description=cleanDescription(mapping.description?raw[mapping.description]:'',source.format==='pdf');
      let debit=mapping.debit?parseAmount(raw[mapping.debit]):null;
      let credit=mapping.credit?parseAmount(raw[mapping.credit]):null;
      const amount=mapping.amount?parseAmount(raw[mapping.amount]):null;
      if((debit===null&&credit===null)&&amount!==null){
        if(amount>=0)debit=Math.abs(amount);else credit=Math.abs(amount);
        report.amountsRepaired++;
      }
      debit=debit===null?0:Math.abs(debit);
      credit=credit===null?0:Math.abs(credit);
      if(mapping.debit&&parseAmount(raw[mapping.debit])!==null&&String(raw[mapping.debit]).match(/[$,()A-Za-z]/))report.amountsRepaired++;
      if(mapping.credit&&parseAmount(raw[mapping.credit])!==null&&String(raw[mapping.credit]).match(/[$,()A-Za-z]/))report.amountsRepaired++;
      let balance=mapping.balance?parseAmount(raw[mapping.balance]):null;
      if(balance!==null){anyBalance=true;running=balance;}
      else if(state.cleaning.calculateBalance)running+=debit-credit;
      if(balance===null&&state.cleaning.calculateBalance)balance=running;

      const isEmpty=!date&&!id&&!description&&debit===0&&credit===0&&(balance===null||balance===0);
      if(isEmpty&&state.cleaning.removeEmpty){report.blanks++;return;}
      prepared.push({
        date,id,description,debit,credit,balance:balance===null?'':balance,
        source:role,rowNumber:index+2,pdfPage:raw.__pdfPage||'',quality:(raw.__pdfReview||!date||(!id&&!description)||(!debit&&!credit))?'Review':'Ready'
      });
    });

    let finalRows=prepared;
    if(state.cleaning.removeDuplicates){
      const seen=new Set();
      finalRows=prepared.filter(row=>{
        const key=[row.date,row.id,row.description,row.debit.toFixed(2),row.credit.toFixed(2),row.balance].join('|').toLowerCase();
        if(seen.has(key)){report.duplicates++;return false;}
        seen.add(key);return true;
      });
    }
    if(!anyBalance&&state.cleaning.calculateBalance){
      let calculated=0;
      finalRows=finalRows.map(row=>{calculated+=row.debit-row.credit;return{...row,balance:calculated};});
    }
    source.prepared=finalRows;
    source.closingBalance=[...finalRows].reverse().find(row=>Number.isFinite(Number(row.balance)))?.balance??null;
    report.rowsPrepared=finalRows.length;
    source.stats={...report,...calculateStats(finalRows)};
    source.mining=mineRows(finalRows);
    renderAll();
    let pdfNote='';
    if(source.format==='pdf'&&source.importMeta){
      const meta=source.importMeta;const validation=meta.validation||{};
      const differences=[];
      if(validation.debitDifference!==null&&Math.abs(validation.debitDifference)>.01)differences.push(`debit difference ${money(validation.debitDifference)}`);
      if(validation.creditDifference!==null&&Math.abs(validation.creditDifference)>.01)differences.push(`credit difference ${money(validation.creditDifference)}`);
      const rowBreakdown=Array.isArray(meta.pageRows)?meta.pageRows.map((count,index)=>`p${index+1}:${count}`).join(', '):'';
      pdfNote=` PDF extraction: processed ${meta.pagesProcessed||meta.pages}/${meta.pages} page(s); automatic OCR used on ${meta.ocrPages||0} page(s); ${meta.totalRows||finalRows.length} row(s) found${rowBreakdown?` (${rowBreakdown})`:''}; ${meta.confidence.toLowerCase()} confidence; ${meta.recoveredAmounts||0} amount(s) recovered from running balances; ${meta.repairedDates||0} date(s) repaired; ${meta.pageGaps?.length||0} page-boundary balance gap(s) flagged.`;
      if(differences.length)pdfNote+=` Statement-summary validation requires review: ${differences.join(' and ')}.`;
    }
    setStatus(`${role==='bank'?'Bank statement':'Cash ledger'} transformed successfully: ${finalRows.length} prepared row(s).${pdfNote} Review all flagged rows before reconciliation.`,'success');
    return true;
  }

  function calculateStats(rows){
    const debitTotal=rows.reduce((sum,row)=>sum+Number(row.debit||0),0);
    const creditTotal=rows.reduce((sum,row)=>sum+Number(row.credit||0),0);
    const criticalCells=rows.length*3;
    const complete=rows.reduce((sum,row)=>sum+(row.date?1:0)+((row.id||row.description)?1:0)+((row.debit||row.credit)?1:0),0);
    return{debitTotal,creditTotal,quality:criticalCells?Math.round(complete/criticalCells*100):0};
  }

  function quartiles(values){
    const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
    if(!sorted.length)return{q1:0,q3:0,iqr:0};
    const percentile=p=>{const index=(sorted.length-1)*p,lower=Math.floor(index),upper=Math.ceil(index);return lower===upper?sorted[lower]:sorted[lower]+(sorted[upper]-sorted[lower])*(index-lower);};
    const q1=percentile(.25),q3=percentile(.75);return{q1,q3,iqr:q3-q1};
  }

  function mineRows(rows){
    const amounts=rows.map(row=>Math.max(Math.abs(Number(row.debit||0)),Math.abs(Number(row.credit||0)))).filter(value=>value>0);
    const {q1,q3,iqr}=quartiles(amounts);
    const threshold=Number(state.ml.anomalyThreshold)||2.5;
    const lower=q1-threshold*iqr,upper=q3+threshold*iqr;
    const outliers=rows.filter(row=>{const amount=Math.max(Math.abs(Number(row.debit||0)),Math.abs(Number(row.credit||0)));return amount>0&&(amount<lower||amount>upper);});
    const keys=new Map();rows.forEach(row=>{const key=[row.date,row.id,row.debit,row.credit].join('|').toLowerCase();keys.set(key,(keys.get(key)||0)+1);});
    const duplicates=[...keys.values()].reduce((sum,count)=>sum+Math.max(0,count-1),0);
    const missing=rows.reduce((sum,row)=>sum+(!row.date?1:0)+(!(row.id||row.description)?1:0)+(!(row.debit||row.credit)?1:0),0);
    const dates=rows.map(row=>row.date).filter(Boolean).sort();
    const round=amounts.filter(value=>value%100===0).length;
    const largest=[...rows].sort((a,b)=>Math.max(b.debit,b.credit)-Math.max(a.debit,a.credit)).slice(0,8);
    const monthly={};rows.forEach(row=>{const key=row.date?row.date.slice(0,7):'Undated';monthly[key]??={debit:0,credit:0,count:0};monthly[key].debit+=Number(row.debit||0);monthly[key].credit+=Number(row.credit||0);monthly[key].count++;});
    const patterns=[];
    if(duplicates)patterns.push(`${duplicates} duplicate candidate${duplicates===1?'':'s'} detected.`);
    if(outliers.length)patterns.push(`${outliers.length} amount outlier${outliers.length===1?'':'s'} exceed the selected IQR threshold.`);
    const both=rows.filter(row=>row.debit>0&&row.credit>0).length;if(both)patterns.push(`${both} row${both===1?'':'s'} contain both Debit and Credit values.`);
    const missingIds=rows.filter(row=>!row.id).length;if(missingIds)patterns.push(`${missingIds} transaction reference${missingIds===1?' is':'s are'} missing.`);
    const weekends=rows.filter(row=>row.date&&[0,6].includes(new Date(`${row.date}T00:00:00`).getDay())).length;if(weekends)patterns.push(`${weekends} transaction${weekends===1?' falls':'s fall'} on a weekend.`);
    if(!patterns.length)patterns.push('No major quality or behavioural patterns were detected under the current rules.');
    return{outliers,duplicates,missing,dateRange:dates.length?`${dates[0]} to ${dates[dates.length-1]}`:'—',roundPercent:amounts.length?Math.round(round/amounts.length*100):0,largest,monthly,patterns};
  }

  function setActiveSource(role){
    state.active=role;
    $$('[data-x1-source-card]').forEach(card=>card.classList.toggle('is-active',card.dataset.x1SourceCard===role));
    renderAll();
  }

  function renderAll(){
    const source=state.sources[state.active];
    $('#x1ActiveSourceLabel').textContent=state.active==='bank'?'Bank statement':'Cash ledger';
    $('#x1BankTransformFileName').textContent=state.sources.bank.fileName||'No file loaded';
    $('#x1CashTransformFileName').textContent=state.sources.cash.fileName||'No file loaded';
    $('#x1TransformRowsKpi').textContent=source.prepared.length;
    $('#x1TransformDebitKpi').textContent=money(source.stats.debitTotal||0);
    $('#x1TransformCreditKpi').textContent=money(source.stats.creditTotal||0);
    $('#x1TransformBalanceKpi').textContent=source.closingBalance===null?'—':money(source.closingBalance);
    $('#x1TransformQualityKpi').textContent=source.prepared.length?`${source.stats.quality||0}%`:'—';
    const mapping=source.mapping||{};
    const mapped=Object.entries(mapping).filter(([,value])=>value).map(([key,value])=>`${key==='id'?'Transaction ID':key[0].toUpperCase()+key.slice(1)} ← ${value}`);
    const importSummary=source.format==='pdf'&&source.importMeta?`PDF: ${source.importMeta.pagesProcessed||source.importMeta.pages}/${source.importMeta.pages} pages processed · OCR ${source.importMeta.ocrPages||0} page(s) · ${source.importMeta.totalRows||source.raw.length} rows extracted · ${source.importMeta.confidence} confidence · ${source.importMeta.continuations||0} wrapped description line(s) joined · ${source.importMeta.pageGaps?.length||0} page-boundary gap(s) flagged`:'';
    $('#x1MappingSummary').textContent=[mapped.length?mapped.join(' · '):'No column mapping has been detected.',importSummary].filter(Boolean).join(' · ');
    renderPreview(source.prepared);
    renderCleaningReport(source.stats||{});
    renderMining(source.mining||{});
    renderMlStatus();
  }

  function renderPreview(rows){
    const body=$('#x1TransformPreviewRows');
    if(!rows.length){body.innerHTML='<tr><td colspan="7" class="x1-transform-empty">No transformed data is available.</td></tr>';return;}
    body.innerHTML=rows.map(row=>`<tr><td>${escapeHtml(row.date||'—')}</td><td>${escapeHtml(row.id||'—')}</td><td>${escapeHtml(row.description||'—')}</td><td class="amount">${row.debit?escapeHtml(money(row.debit)):'—'}</td><td class="amount">${row.credit?escapeHtml(money(row.credit)):'—'}</td><td class="amount">${row.balance!==''?escapeHtml(money(row.balance)):'—'}</td><td><span class="x1-quality-chip${row.quality==='Ready'?'':' is-warning'}">${escapeHtml(`${row.quality}${row.pdfPage?` · P${row.pdfPage}`:''}`)}</span></td></tr>`).join('');
    const source=state.sources[state.active];const pdfWarning=source.format==='pdf'?' Compare all Review rows and totals with the original PDF before reconciliation.':'';
    $('#x1TransformPreviewNote').textContent=`Showing all ${rows.length} prepared row(s) from the complete dataset.${pdfWarning}`;
  }

  function renderCleaningReport(stats){
    $('#x1CleanRowsReceived').textContent=stats.rowsReceived||0;
    $('#x1CleanRowsPrepared').textContent=stats.rowsPrepared||0;
    $('#x1CleanDuplicates').textContent=stats.duplicates||0;
    $('#x1CleanDatesRepaired').textContent=stats.datesRepaired||0;
    $('#x1CleanAmountsRepaired').textContent=stats.amountsRepaired||0;
    $('#x1CleanBlanks').textContent=stats.blanks||0;
  }

  function renderMining(mining){
    $('#x1MineDateRange').textContent=mining.dateRange||'—';
    $('#x1MineDuplicates').textContent=mining.duplicates||0;
    $('#x1MineOutliers').textContent=mining.outliers?.length||0;
    $('#x1MineMissing').textContent=mining.missing||0;
    $('#x1MineRoundValues').textContent=`${mining.roundPercent||0}%`;
    $('#x1MineLargest').innerHTML=mining.largest?.length?mining.largest.map(row=>`<div><span>${escapeHtml(row.date||'—')} · ${escapeHtml(row.id||row.description||'No reference')}</span><strong>${escapeHtml(money(Math.max(row.debit,row.credit)))}</strong></div>`).join(''):'<p>No analysis has been run.</p>';
    $('#x1MinePatterns').innerHTML=mining.patterns?.length?mining.patterns.map(item=>`<div><span>${escapeHtml(item)}</span></div>`).join(''):'<p>No analysis has been run.</p>';
    const monthlyEntries=Object.entries(mining.monthly||{});
    const max=Math.max(...monthlyEntries.map(([,item])=>item.debit+item.credit),1);
    $('#x1MineMonthly').innerHTML=monthlyEntries.length?monthlyEntries.map(([month,item])=>`<div class="x1-month-row"><span>${escapeHtml(month)}</span><div class="x1-month-bars"><span style="width:${item.debit/max*100}%"></span><span style="width:${item.credit/max*100}%"></span></div><strong>${escapeHtml(money(item.debit+item.credit))}</strong></div>`).join(''):'<p>No analysis has been run.</p>';
  }

  function setCleaningFromControls(){
    state.cleaning={
      standardiseHeaders:$('#x1CleanHeaders').checked,
      normaliseDates:$('#x1CleanDates').checked,
      cleanAmounts:$('#x1CleanAmounts').checked,
      trimText:$('#x1TrimText').checked,
      removeDescriptionAmounts:$('#x1RemoveDescriptionAmounts').checked,
      fillDates:$('#x1FillDates').checked,
      removeDuplicates:$('#x1RemoveDuplicates').checked,
      removeEmpty:$('#x1RemoveEmpty').checked,
      calculateBalance:$('#x1CalculateBalance').checked
    };
  }

  function sourceRowsForDashboard(){
    const choice=$('#x1DashboardSource').value;
    let rows=choice==='combined'?[...state.sources.bank.prepared,...state.sources.cash.prepared]:state.sources[choice].prepared;
    const type=$('#x1DashboardType').value;
    const minimum=Number($('#x1DashboardMinimum').value)||0;
    return rows.filter(row=>{
      const amount=Math.max(Number(row.debit||0),Number(row.credit||0));
      return amount>=minimum&&(type==='all'||(type==='debit'&&row.debit>0)||(type==='credit'&&row.credit>0));
    });
  }

  function dimensionValue(row,dimension){
    if(dimension==='month')return row.date?row.date.slice(0,7):'Undated';
    if(dimension==='date')return row.date||'Undated';
    if(dimension==='source')return row.source==='bank'?'Bank statement':'Cash ledger';
    if(dimension==='type')return row.debit>0&&row.credit>0?'Debit & Credit':row.debit>0?'Debit':'Credit';
    if(dimension==='idPrefix'){const id=String(row.id||'No ID');return id.split(/[-_/\s]/)[0]||'No ID';}
    if(dimension==='description')return row.description||'No description';
    return 'Other';
  }

  function valueFor(row,value){
    if(value==='amount')return Math.max(Number(row.debit||0),Number(row.credit||0));
    return Number(row[value]||0);
  }

  function aggregate(values,mode){
    if(mode==='count')return values.length;
    if(!values.length)return 0;
    if(mode==='average')return values.reduce((sum,value)=>sum+value,0)/values.length;
    if(mode==='min')return Math.min(...values);
    if(mode==='max')return Math.max(...values);
    return values.reduce((sum,value)=>sum+value,0);
  }

  function buildDashboard(){
    const rows=sourceRowsForDashboard();
    const dimension=$('#x1PivotDimension').value;
    const value=$('#x1PivotValue').value;
    const aggregation=$('#x1PivotAggregation').value;
    const groups=new Map();
    rows.forEach(row=>{
      const key=dimensionValue(row,dimension);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(valueFor(row,value));
    });
    const pivot=[...groups.entries()].map(([label,values])=>({label,count:values.length,value:aggregate(values,aggregation)})).sort((a,b)=>b.value-a.value);
    state.pivotRows=pivot;
    const values=rows.map(row=>valueFor(row,value));
    const total=values.reduce((sum,item)=>sum+item,0);
    $('#x1DashTotal').textContent=money(total);
    $('#x1DashAverage').textContent=money(values.length?total/values.length:0);
    $('#x1DashCount').textContent=rows.length;
    $('#x1DashMaximum').textContent=money(values.length?Math.max(...values):0);
    const labels={month:'Month',date:'Transaction date',source:'Source ledger',type:'Debit / Credit',idPrefix:'Transaction ID prefix',description:'Description'};
    const valueLabels={amount:'Transaction amount',debit:'Debit',credit:'Credit',balance:'Balance'};
    $('#x1PivotDimensionHeader').textContent=labels[dimension];
    $('#x1PivotValueHeader').textContent=`${aggregation[0].toUpperCase()+aggregation.slice(1)} of ${valueLabels[value]}`;
    $('#x1DashboardChartTitle').textContent=`${valueLabels[value]} by ${labels[dimension]}`;
    const pivotTotal=pivot.reduce((sum,row)=>sum+row.value,0);
    $('#x1PivotRows').innerHTML=pivot.length?pivot.map(row=>`<tr><td>${escapeHtml(row.label)}</td><td>${row.count}</td><td class="amount">${escapeHtml(money(row.value))}</td><td class="amount">${pivotTotal?escapeHtml((row.value/pivotTotal*100).toFixed(1)):'0.0'}%</td></tr>`).join(''):'<tr><td colspan="4" class="x1-transform-empty">No rows meet the selected slicers.</td></tr>';
    renderDashboardChart(pivot);
  }

  function renderDashboardChart(pivot){
    const visual=$('#x1DashboardVisual').value;
    const chart=$('#x1DashboardChart');
    chart.className=`x1-dashboard-chart${visual==='column'?' is-column':''}`;
    if(visual==='table'){chart.innerHTML='<p>The visual is hidden. Use the pivot table to analyse the grouped values.</p>';return;}
    if(!pivot.length){chart.innerHTML='<p>No rows meet the selected slicers.</p>';return;}
    const max=Math.max(...pivot.map(row=>Math.abs(row.value)),1);
    chart.innerHTML=pivot.slice(0,14).map(row=>{
      const percentage=Math.max(2,Math.abs(row.value)/max*100);
      return`<div class="x1-dashboard-bar" style="--column-height:${percentage}%"><span title="${escapeHtml(row.label)}">${escapeHtml(row.label)}</span><span class="x1-dashboard-bar-track"><i style="width:${percentage}%"></i></span><strong>${escapeHtml(money(row.value))}</strong></div>`;
    }).join('');
  }

  function csvEscape(value){const text=String(value??'');return /[",\n\r]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;}
  function preparedCsv(rows){
    const body=rows.map(row=>[row.date,row.id,row.description,row.debit.toFixed(2),row.credit.toFixed(2),row.balance===''?'':Number(row.balance).toFixed(2)].map(csvEscape).join(','));
    return[STANDARD_HEADERS.join(','),...body].join('\r\n');
  }
  function downloadBlob(content,type,name){const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),500);}
  function downloadPreparedCsv(){const source=state.sources[state.active];if(!source.prepared.length){setStatus('Transform the selected dataset before downloading.','error');return;}downloadBlob(preparedCsv(source.prepared),'text/csv;charset=utf-8',`x1_${state.active}_transformed.csv`);}
  function downloadPreparedXlsx(){
    const source=state.sources[state.active];if(!source.prepared.length){setStatus('Transform the selected dataset before downloading.','error');return;}
    if(!window.XLSX){setStatus('The Excel export library is unavailable. Download CSV instead.','error');return;}
    const data=source.prepared.map(row=>({'Date':row.date,'Transaction ID':row.id,'Description':row.description,'Debit':row.debit,'Credit':row.credit,'Balance':row.balance}));
    const workbook=window.XLSX.utils.book_new();const sheet=window.XLSX.utils.json_to_sheet(data,{header:STANDARD_HEADERS});window.XLSX.utils.book_append_sheet(workbook,sheet,state.active==='bank'?'Bank Statement':'Cash Ledger');window.XLSX.writeFile(workbook,`x1_${state.active}_transformed.xlsx`);
  }

  function anomalySet(rows){
    const amounts=rows.map(row=>Math.max(Number(row.debit||0),Number(row.credit||0))).filter(value=>value>0);
    const {q1,q3,iqr}=quartiles(amounts);const threshold=Number(state.ml.anomalyThreshold)||2.5;const upper=q3+threshold*iqr;
    return new Set(rows.filter(row=>Math.max(Number(row.debit||0),Number(row.credit||0))>upper));
  }

  function renderReconRows(body,rows){
    const anomalies=state.ml.enabled?anomalySet(rows):new Set();
    body.replaceChildren(...rows.filter(row=>row.debit>0||row.credit>0).map(row=>{
      const tr=document.createElement('tr');if(anomalies.has(row))tr.classList.add('x1-ml-anomaly-row');
      tr.innerHTML=`<td><input type="date" data-field="date" value="${escapeHtml(row.date||'')}"></td><td><input type="text" data-field="id" value="${escapeHtml(row.id||'')}" placeholder="ID"></td><td><input type="text" data-field="description" value="${escapeHtml(row.description||'')}" placeholder="Description"></td><td><input type="number" data-field="debit" step="0.01" min="0" value="${row.debit||''}" placeholder="0.00"></td><td><input type="number" data-field="credit" step="0.01" min="0" value="${row.credit||''}" placeholder="0.00"></td><td><input type="number" data-field="balance" step="0.01" value="${row.balance!==''?row.balance:''}" placeholder="0.00"></td><td><button class="x1-row-remove" type="button" aria-label="Remove transaction"><i class="fas fa-times" aria-hidden="true"></i></button></td>`;
      tr.querySelector('.x1-row-remove').addEventListener('click',()=>tr.remove());return tr;
    }));
  }

  function renderInterfundRows(body,rows){
    const anomalies=state.ml.enabled?anomalySet(rows):new Set();
    body.replaceChildren(...rows.filter(row=>row.debit>0||row.credit>0).map(row=>{
      const tr=document.createElement('tr');if(anomalies.has(row))tr.classList.add('x1-ml-anomaly-row');
      tr.innerHTML=`<td><input type="date" data-field="date" value="${escapeHtml(row.date||'')}"></td><td><input type="text" data-field="reference" value="${escapeHtml(row.id||'')}" placeholder="Reference"></td><td><input type="text" data-field="description" value="${escapeHtml(row.description||'')}" placeholder="Description"></td><td><input type="number" step="0.01" data-field="debit" value="${row.debit||''}"></td><td><input type="number" step="0.01" data-field="credit" value="${row.credit||''}"></td><td><button class="if-remove-row" type="button" aria-label="Remove transaction"><i class="fas fa-times" aria-hidden="true"></i></button></td>`;
      return tr;
    }));
  }

  function closeDestinationModal(){const modal=$('#x1ReconciliationDestinationModal');if(modal)modal.hidden=true;}
  function openDestinationModal(){
    const bank=state.sources.bank,cash=state.sources.cash;
    if(!bank.prepared.length&&!cash.prepared.length){setStatus('Transform at least one dataset before sending records to reconciliation.','error');return;}
    const modal=$('#x1ReconciliationDestinationModal');if(!modal)return;
    modal.hidden=false;modal.querySelector('[data-x1-recon-destination]')?.focus();
  }

  function applyToReconciliation(destination='bank'){
    const bank=state.sources.bank,cash=state.sources.cash;
    if(!bank.prepared.length&&!cash.prepared.length){setStatus('Transform at least one dataset before sending records to reconciliation.','error');return;}
    if(destination==='interfund'){
      document.querySelector('[data-x1-module-choice="interfund"]')?.click();
      const adminBody=$('#ifAdminRows'),projectBody=$('#ifProjectRows');
      if(bank.prepared.length&&adminBody){renderInterfundRows(adminBody,bank.prepared);if(bank.closingBalance!==null)$('#ifAdminClosing').value=bank.closingBalance;}
      if(cash.prepared.length&&projectBody){renderInterfundRows(projectBody,cash.prepared);if(cash.closingBalance!==null)$('#ifProjectClosing').value=cash.closingBalance;}
      [adminBody,projectBody,$('#ifAdminClosing'),$('#ifProjectClosing')].filter(Boolean).forEach(element=>element.dispatchEvent(new Event('input',{bubbles:true})));
      document.querySelector('[data-if-side-action="prepare"]')?.click();
      const status=$('#ifPrepareStatus');if(status){status.textContent=`Prepared data transferred from Transform Data: Bank source → Administration ledger; Cash source → Project ledger. ${state.ml.enabled?'Machine-learning anomaly highlighting is enabled for review.':'Machine learning is disabled.'}`;status.className='if-inline-status success';}
      setStatus('Prepared data sent to Interfund Reconciliation. Review the Administration and Project closing balances, then run the reconciliation.','success');
      closeDestinationModal();
      return;
    }
    document.querySelector('[data-x1-module-choice="bank"]')?.click();
    const bankBody=$('#x1BankRows'),cashBody=$('#x1CashRows');
    if(bank.prepared.length&&bankBody){renderReconRows(bankBody,bank.prepared);if(bank.closingBalance!==null)$('#x1BankClosing').value=bank.closingBalance;}
    if(cash.prepared.length&&cashBody){renderReconRows(cashBody,cash.prepared);if(cash.closingBalance!==null)$('#x1CashClosing').value=cash.closingBalance;}
    [bankBody,cashBody,$('#x1BankClosing'),$('#x1CashClosing')].filter(Boolean).forEach(element=>element.dispatchEvent(new Event('input',{bubbles:true})));
    document.querySelector('[data-x1-workspace-tab="workbench"]')?.click();
    document.querySelector('[data-x1-stage="data"]')?.click();
    const reconStatus=$('#x1DemoStatus');if(reconStatus){reconStatus.textContent=`Prepared data transferred from Transform Data. ${state.ml.enabled?'Machine-learning assisted matching is enabled; approximate candidates and anomaly highlighting will influence the review.':'Machine learning is disabled; reconciliation will use exact one-to-one amount matching.'}`;reconStatus.className='x1-demo-status is-success';}
    setStatus('Prepared data sent to Bank Reconciliation. Review the closing balances and run the reconciliation.','success');
    closeDestinationModal();
  }

  function dateDistance(a,b){
    if(!a||!b)return null;const left=new Date(`${a}T00:00:00`),right=new Date(`${b}T00:00:00`);if(Number.isNaN(left.getTime())||Number.isNaN(right.getTime()))return null;return Math.abs(left-right)/86400000;
  }
  function bigrams(value){const text=String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');if(text.length<2)return new Set(text?[text]:[]);return new Set([...Array(text.length-1)].map((_,index)=>text.slice(index,index+2)));}
  function stringSimilarity(a,b){const left=bigrams(a),right=bigrams(b);if(!left.size&&!right.size)return 0;let intersection=0;left.forEach(item=>{if(right.has(item))intersection++;});return 2*intersection/(left.size+right.size||1);}

  function beginReconciliation(){state.lastMatch={matched:0,approximate:0,totalScore:0};renderMlStatus();}
  function smartMatchTransactions(source,sourceField,target,targetField){
    const settings=state.ml;
    source.forEach(sourceRow=>{
      if(sourceRow.matched||Number(sourceRow[sourceField])<=0)return;
      const amount=Number(sourceRow[sourceField]);
      const candidates=target.filter(targetRow=>!targetRow.matched&&Number(targetRow[targetField])>0).map(targetRow=>{
        const targetAmount=Number(targetRow[targetField]);const difference=Math.abs(targetAmount-amount);
        if(!settings.enabled)return difference<.005?{targetRow,score:1,difference}:null;
        const tolerance=Math.max(.01,Math.abs(amount)*(Number(settings.tolerancePct)||.5)/100);
        if(difference>tolerance)return null;
        const amountScore=Math.max(0,1-difference/(tolerance*2));
        const distance=dateDistance(sourceRow.date,targetRow.date);
        const windowDays=Number(settings.dateWindowDays)||0;
        const dateScore=windowDays===0||distance===null?.5:Math.max(0,1-distance/windowDays);
        const idScore=stringSimilarity(sourceRow.id,targetRow.id);
        const idWeight=(Number(settings.idWeight)||0)/100;
        const dateWeight=windowDays?Math.min(.25,.15+(1-idWeight)/10):0;
        const amountWeight=1-idWeight-dateWeight;
        const score=amountScore*amountWeight+dateScore*dateWeight+idScore*idWeight;
        return{targetRow,score,difference};
      }).filter(Boolean).sort((a,b)=>b.score-a.score||a.difference-b.difference);
      const best=candidates[0];
      if(!best||best.score<(settings.enabled?.5:1))return;
      sourceRow.matched=true;best.targetRow.matched=true;sourceRow.mlMatchScore=best.score;best.targetRow.mlMatchScore=best.score;
      state.lastMatch.matched++;state.lastMatch.totalScore+=best.score;if(best.difference>=.005)state.lastMatch.approximate++;
    });
    renderMlStatus();
  }

  function getMachineLearningSettings(){return{...state.ml};}
  function getLastMatchSummary(){
    const average=state.lastMatch.matched?state.lastMatch.totalScore/state.lastMatch.matched:0;
    return{...state.lastMatch,averageScore:average};
  }

  function saveMl(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.ml));}catch(error){/* ignore */}}
  function renderMlStatus(){
    const enabled=Boolean(state.ml.enabled);
    $('#x1MlEnabled').checked=enabled;
    $('#x1MlToggleLabel').textContent=enabled?'Enabled':'Disabled';
    $('#x1MlTolerance').value=state.ml.tolerancePct;
    $('#x1MlToleranceValue').textContent=`${Number(state.ml.tolerancePct).toFixed(1)}%`;
    $('#x1MlDateWindow').value=String(state.ml.dateWindowDays);
    $('#x1MlIdWeight').value=state.ml.idWeight;
    $('#x1MlIdWeightValue').textContent=`${state.ml.idWeight}%`;
    $('#x1MlAnomalyThreshold').value=String(state.ml.anomalyThreshold);
    $('#x1MlStripSummary').textContent=enabled?`Enabled — reconciliation scores amount tolerance, date proximity and ID similarity. Current amount tolerance: ${Number(state.ml.tolerancePct).toFixed(1)}%.`:'Disabled — reconciliation uses exact one-to-one amount matching.';
    const badge=$('#x1MlStateBadge');badge.textContent=enabled?'Machine learning enabled':'Machine learning disabled';badge.classList.toggle('is-enabled',enabled);
    const reconNote=$('#x1MlReconNote');if(reconNote){reconNote.classList.toggle('is-enabled',enabled);reconNote.innerHTML=enabled?`<i class="fas fa-brain" aria-hidden="true"></i><span><strong>ML assisted matching enabled.</strong> Approximate candidates within ${Number(state.ml.tolerancePct).toFixed(1)}% are scored using amount, date and transaction-ID similarity.</span>`:`<i class="fas fa-equals" aria-hidden="true"></i><span><strong>Exact matching enabled.</strong> Cash debits match bank credits and cash credits match bank debits only when amounts agree.</span>`;}
    const summary=getLastMatchSummary();
    $('#x1MlRunSummary').textContent=summary.matched?`${enabled?'Machine learning':'Exact matching'} paired ${summary.matched} transaction pair(s). ${summary.approximate} approximate pair(s) were accepted. Average match confidence: ${(summary.averageScore*100).toFixed(1)}%.`:'No machine-learning-assisted reconciliation has been run.';
  }

  async function loadSourceFile(role,file){
    if(!file)return;
    setActiveSource(role);setStatus(`Reading ${file.name}…`);
    try{
      const parsed=await readFile(file);
      state.sources[role]={...emptySource(),fileName:file.name,format:parsed.format||'',headers:parsed.headers,raw:parsed.records,importMeta:parsed.meta||null};
      transformSource(role);
    }catch(error){setStatus(`Could not read ${file.name}: ${error.message}`,'error');}
  }

  function loadSample(){
    const headers=['Transaction Date','Reference Number','Memo/Description','Withdrawal','Deposit','Running Balance'];
    const bankRaw=[
      {'Transaction Date':'01/07/2026','Reference Number':'BANK-001','Memo/Description':'Customer receipt 1200','Withdrawal':'','Deposit':'$1,200.00','Running Balance':'$9,100.00'},
      {'Transaction Date':'03/07/2026','Reference Number':'BANK-002','Memo/Description':'Supplier payment 300','Withdrawal':'$300.00','Deposit':'','Running Balance':'$8,800.00'},
      {'Transaction Date':'05/07/2026','Reference Number':'BANK-003','Memo/Description':'Collection by bank 450','Withdrawal':'','Deposit':'450','Running Balance':'$9,250.00'},
      {'Transaction Date':'06/07/2026','Reference Number':'BANK-004','Memo/Description':'Service charge 25','Withdrawal':'25','Deposit':'','Running Balance':'$9,225.00'}
    ];
    const cashRaw=[
      {'Transaction Date':'01/07/2026','Reference Number':'CASH-001','Memo/Description':'Customer receipt 1200','Withdrawal':'$1,200.00','Deposit':'','Running Balance':'$9,100.00'},
      {'Transaction Date':'03/07/2026','Reference Number':'CASH-002','Memo/Description':'Supplier payment 300','Withdrawal':'','Deposit':'$300.00','Running Balance':'$8,800.00'},
      {'Transaction Date':'07/07/2026','Reference Number':'CASH-003','Memo/Description':'Deposit in transit 600','Withdrawal':'600','Deposit':'','Running Balance':'$9,400.00'},
      {'Transaction Date':'08/07/2026','Reference Number':'CASH-004','Memo/Description':'Outstanding payment 150','Withdrawal':'','Deposit':'150','Running Balance':'$9,250.00'}
    ];
    state.sources.bank={...emptySource(),fileName:'sample_bank_statement.xlsx',headers,raw:bankRaw};
    state.sources.cash={...emptySource(),fileName:'sample_cash_ledger.xlsx',headers,raw:cashRaw};
    transformSource('bank');transformSource('cash');setActiveSource('bank');setStatus('Sample bank and cash files loaded and transformed. Open Data Mining or Dashboard Builder, or send the prepared data to reconciliation.','success');
  }

  function reset(){
    state.sources={bank:emptySource(),cash:emptySource()};state.active='bank';state.pivotRows=[];
    ['x1TransformBankFile','x1TransformCashFile'].forEach(id=>{const input=document.getElementById(id);if(input)input.value='';});
    renderAll();$('#x1PivotRows').innerHTML='<tr><td colspan="4" class="x1-transform-empty">No pivot table has been built.</td></tr>';$('#x1DashboardChart').innerHTML='<p>Prepare data and build the dashboard.</p>';setStatus('Transform Data reset. Load a bank or cash PDF, CSV or Excel file to begin.');
  }

  $$('[data-x1-transform-tab]').forEach(button=>button.addEventListener('click',()=>{
    const name=button.dataset.x1TransformTab;
    $$('[data-x1-transform-tab]').forEach(item=>item.classList.toggle('is-active',item===button));
    $$('[data-x1-transform-panel]').forEach(item=>{item.hidden=item.dataset.x1TransformPanel!==name;item.classList.toggle('is-active',item.dataset.x1TransformPanel===name);});
    if(name==='dashboard')buildDashboard();
  }));
  $$('[data-x1-select-source]').forEach(button=>button.addEventListener('click',()=>setActiveSource(button.dataset.x1SelectSource)));
  $('#x1TransformBankFile').addEventListener('change',event=>loadSourceFile('bank',event.target.files?.[0]));
  $('#x1TransformCashFile').addEventListener('change',event=>loadSourceFile('cash',event.target.files?.[0]));
  $('#x1RunTransform').addEventListener('click',()=>{setCleaningFromControls();transformSource(state.active);});
  $('#x1ApplyCleaning').addEventListener('click',()=>{setCleaningFromControls();transformSource(state.active);});
  $('#x1RunMining').addEventListener('click',()=>{const source=state.sources[state.active];if(!source.prepared.length&&!transformSource(state.active))return;source.mining=mineRows(source.prepared);renderMining(source.mining);setStatus(`Data mining completed for the ${state.active==='bank'?'bank statement':'cash ledger'}.`,'success');});
  $('#x1BuildDashboard').addEventListener('click',buildDashboard);
  ['x1DashboardSource','x1PivotDimension','x1PivotValue','x1PivotAggregation','x1DashboardVisual','x1DashboardType','x1DashboardMinimum'].forEach(id=>document.getElementById(id)?.addEventListener(id==='x1DashboardMinimum'?'input':'change',buildDashboard));
  $('#x1DownloadCleanCsv').addEventListener('click',downloadPreparedCsv);
  $('#x1DownloadCleanXlsx').addEventListener('click',downloadPreparedXlsx);
  $('#x1SendToReconciliation').addEventListener('click',openDestinationModal);
  $$('[data-x1-close-destination]').forEach(button=>button.addEventListener('click',closeDestinationModal));
  $$('[data-x1-recon-destination]').forEach(button=>button.addEventListener('click',()=>applyToReconciliation(button.dataset.x1ReconDestination)));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeDestinationModal();});
  $('#x1LoadTransformSample').addEventListener('click',loadSample);
  $('#x1ResetTransform').addEventListener('click',reset);
  $('#x1ExportPivotCsv').addEventListener('click',()=>{
    if(!state.pivotRows.length){setStatus('Build a pivot table before exporting.','error');return;}
    const rows=[['Group','Count','Value'],...state.pivotRows.map(row=>[row.label,row.count,row.value])];downloadBlob(rows.map(row=>row.map(csvEscape).join(',')).join('\r\n'),'text/csv;charset=utf-8','x1_pivot_table.csv');
  });

  $('#x1MlEnabled').addEventListener('change',event=>{state.ml.enabled=event.target.checked;saveMl();renderMlStatus();});
  $('#x1MlTolerance').addEventListener('input',event=>{state.ml.tolerancePct=Number(event.target.value);saveMl();renderMlStatus();});
  $('#x1MlDateWindow').addEventListener('change',event=>{state.ml.dateWindowDays=Number(event.target.value);saveMl();renderMlStatus();});
  $('#x1MlIdWeight').addEventListener('input',event=>{state.ml.idWeight=Number(event.target.value);saveMl();renderMlStatus();});
  $('#x1MlAnomalyThreshold').addEventListener('change',event=>{state.ml.anomalyThreshold=Number(event.target.value);state.sources.bank.mining=mineRows(state.sources.bank.prepared);state.sources.cash.mining=mineRows(state.sources.cash.prepared);saveMl();renderAll();});

  window.X1TransformEngine={
    getMachineLearningSettings,getLastMatchSummary,beginReconciliation,smartMatchTransactions,applyToReconciliation,
    readLedgerFile:readFile,
    getPreparedData:()=>({bank:state.sources.bank.prepared.map(row=>({...row})),cash:state.sources.cash.prepared.map(row=>({...row}))})
  };

  renderAll();
})();



/* ============================== Inline script 22 ============================== */

(()=>{
  const app=document.getElementById('x1WorkflowApp');
  if(!app)return;
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const canvas=$('#wfCanvas'),viewport=$('#wfCanvasViewport'),sizer=$('#wfCanvasSizer'),nodeLayer=$('#wfNodeLayer'),connectionLayer=$('#wfConnectionLayer'),draftPath=$('#wfDraftPath');
  const inspector=$('#wfInspectorBody'),filePicker=$('#wfFilePicker'),definitionPicker=$('#wfDefinitionPicker'),runState=$('#wfRunState'),runStateText=$('#wfRunStateText'),toast=$('#wfToast'),contextMenu=$('#wfContextMenu');
  const STORAGE_KEY='findat_x1_visual_workflow_v1';
  const CANVAS={width:1900,height:1050,nodeWidth:174,nodeHeight:96};
  const defs={
    input:{label:'Document Input',kind:'input',icon:'fa-file-upload',description:'Attach CSV, Excel, JSON or PDF',defaults:{}},
    manual:{label:'Manual Data',kind:'input',icon:'fa-keyboard',description:'Paste an array of JSON records',defaults:{json:'[\n  {"Date":"2026-07-01","Reference":"TXN-001","Amount":1000}\n]'}},
    clean:{label:'Clean Data',kind:'prepare',icon:'fa-broom',description:'Trim values and standardise fields',defaults:{trim:true,removeBlank:true,normalizeHeaders:true,convertNumbers:true}},
    filter:{label:'Filter Rows',kind:'prepare',icon:'fa-filter',description:'Keep rows matching a condition',defaults:{column:'Amount',operator:'greater',value:'0'}},
    select:{label:'Select Columns',kind:'prepare',icon:'fa-columns',description:'Keep selected columns only',defaults:{columns:'Date, Reference, Description, Debit, Credit, Amount'}},
    formula:{label:'Formula',kind:'prepare',icon:'fa-calculator',description:'Create a calculated numeric field',defaults:{outputColumn:'Net Amount',expression:'[Debit] - [Credit]'}},
    join:{label:'Join',kind:'combine',icon:'fa-code-branch',description:'Merge two streams using matching keys',defaults:{leftKey:'Reference',rightKey:'Reference',joinType:'inner'}},
    union:{label:'Union',kind:'combine',icon:'fa-layer-group',description:'Stack all connected datasets',defaults:{}},
    reconcile:{label:'Reconcile',kind:'finance',icon:'fa-balance-scale',description:'Match reciprocal ledger amounts',defaults:{leftAmount:'Auto',rightAmount:'Auto',tolerance:0.01}},
    aggregate:{label:'Aggregate',kind:'finance',icon:'fa-chart-pie',description:'Group and summarise records',defaults:{groupBy:'Match Status',valueField:'Match Amount',operation:'sum'}},
    preview:{label:'Data Preview',kind:'output',icon:'fa-table',description:'Display the final workflow data',defaults:{}},
    export:{label:'Export CSV',kind:'output',icon:'fa-file-csv',description:'Prepare a CSV download',defaults:{filename:'findat_workflow_output.csv'}},
    report:{label:'Report',kind:'output',icon:'fa-file-invoice',description:'Create an execution summary',defaults:{reportTitle:'FINDAT Workflow Report'}}
  };
  const state={nodes:[],edges:[],selectedId:null,zoom:1,activeFileNodeId:null,inspectorTab:'properties',logs:[],running:false,connectionDraft:null,contextNodeId:null};
  let toastTimer=null;

  function id(prefix='wf'){return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;}
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function number(value){
    if(typeof value==='number')return Number.isFinite(value)?value:0;
    let text=String(value??'').trim();if(!text)return 0;
    const negative=/^\(.*\)$/.test(text);text=text.replace(/[(),\s]/g,'').replace(/[^0-9.\-]/g,'');
    const parsed=parseFloat(text);return Number.isFinite(parsed)?(negative?-Math.abs(parsed):parsed):0;
  }
  function showToast(message,error=false){toast.textContent=message;toast.classList.toggle('is-error',error);toast.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('is-visible'),3000);}
  function setRunState(text,mode='ready'){runState.className=`wf-run-state${mode==='ready'?'':` is-${mode}`}`;runStateText.textContent=text;}
  function nodeById(nodeId){return state.nodes.find(node=>node.id===nodeId);}
  function incomingEdges(nodeId){return state.edges.filter(edge=>edge.target===nodeId);}
  function outgoingEdges(nodeId){return state.edges.filter(edge=>edge.source===nodeId);}
  function incomingNodes(nodeId){return incomingEdges(nodeId).map(edge=>nodeById(edge.source)).filter(Boolean);}
  function outputRows(node){return Array.isArray(node?.runtime?.output)?node.runtime.output:[];}
  function maxInputs(type){return type==='join'||type==='reconcile'?2:type==='union'?20:(type==='input'||type==='manual'?0:1);}

  function addNode(type,x=120,y=100,options={}){
    const def=defs[type];if(!def)return null;
    const offset=state.nodes.length%6*18;
    const node={id:id('node'),type,title:options.title||def.label,x:Math.max(20,Math.min(CANVAS.width-CANVAS.nodeWidth-20,x+offset)),y:Math.max(20,Math.min(CANVAS.height-CANVAS.nodeHeight-20,y+offset)),config:{...clone(def.defaults),...(options.config||{})},data:Array.isArray(options.data)?clone(options.data):[],fileName:options.fileName||'',status:'idle',statusText:'Ready',runtime:null};
    state.nodes.push(node);state.selectedId=node.id;renderAll();renderInspector();return node;
  }
  function workflowsPanelIsActive(){const panel=document.querySelector('[data-x1-workspace-panel="workflows"]');const workspace=document.getElementById('x1AppWorkspace');return Boolean(panel&&!panel.hidden&&workspace&&!workspace.hidden);}
  function keepWorkflowsOpen(){const panel=document.querySelector('[data-x1-workspace-panel="workflows"]');if(!panel)return;const workspace=document.getElementById('x1AppWorkspace');const store=document.getElementById('developmentsStoreView');if(store)store.hidden=true;if(workspace)workspace.hidden=false;document.querySelectorAll('[data-x1-workspace-panel]').forEach(item=>item.hidden=item!==panel);document.querySelectorAll('[data-x1-workspace-tab]').forEach(button=>button.classList.toggle('is-active',button.dataset.x1WorkspaceTab==='workflows'));}
  function removeNode(nodeId){if(!nodeId)return;state.nodes=state.nodes.filter(node=>node.id!==nodeId);state.edges=state.edges.filter(edge=>edge.source!==nodeId&&edge.target!==nodeId);if(state.selectedId===nodeId)state.selectedId=null;renderAll();renderInspector();saveSilently();keepWorkflowsOpen();showToast('Node deleted.');}
  function disconnectNode(nodeId){state.edges=state.edges.filter(edge=>edge.source!==nodeId&&edge.target!==nodeId);renderConnections();renderNodes();renderInspector();saveSilently();showToast('Node connections removed.');}
  function duplicateNode(nodeId){const source=nodeById(nodeId);if(!source)return;addNode(source.type,source.x+35,source.y+35,{title:`${source.title} copy`,config:source.config,data:source.data,fileName:source.fileName});}
  function addEdge(source,target){
    if(source===target)return showToast('A node cannot connect to itself.',true);
    const targetNode=nodeById(target);if(!targetNode)return;
    const limit=maxInputs(targetNode.type);if(limit===0)return;
    if(state.edges.some(edge=>edge.source===source&&edge.target===target))return showToast('These nodes are already connected.');
    const current=incomingEdges(target);if(current.length>=limit){
      if(limit===1)state.edges=state.edges.filter(edge=>edge.target!==target);
      else return showToast(`${targetNode.title} accepts only ${limit} incoming connections.`,true);
    }
    state.edges.push({id:id('edge'),source,target});renderConnections();renderNodes();renderInspector();saveSilently();showToast(`Connected to ${targetNode.title}.`);
  }

  function nodeSummary(node){
    const rows=node.runtime?.output?.length??node.data?.length??0;
    if(node.type==='input')return node.fileName?`${node.fileName} · ${node.data.length} row${node.data.length===1?'':'s'}`:'No document attached';
    if(node.type==='manual')return `${rows||'No'} manual row${rows===1?'':'s'}`;
    if(node.type==='clean')return `Trim ${node.config.trim?'on':'off'} · blanks ${node.config.removeBlank?'removed':'kept'}`;
    if(node.type==='filter')return `${node.config.column||'Column'} ${String(node.config.operator||'').replace('_',' ')} ${node.config.value??''}`;
    if(node.type==='select')return node.config.columns||'Choose columns';
    if(node.type==='formula')return `${node.config.outputColumn||'Result'} = ${node.config.expression||'formula'}`;
    if(node.type==='join')return `${node.config.joinType||'inner'} join · ${node.config.leftKey||'?'} = ${node.config.rightKey||'?'}`;
    if(node.type==='union')return `${incomingEdges(node.id).length} connected stream${incomingEdges(node.id).length===1?'':'s'}`;
    if(node.type==='reconcile')return `${incomingEdges(node.id).length}/2 ledgers · tolerance ${node.config.tolerance??0.01}`;
    if(node.type==='aggregate')return `${node.config.operation||'sum'} by ${node.config.groupBy||'field'}`;
    if(node.type==='export')return node.config.filename||'workflow_output.csv';
    if(node.type==='report')return node.config.reportTitle||'Workflow report';
    return rows?`${rows} output row${rows===1?'':'s'}`:defs[node.type].description;
  }
  function nodeHtml(node){
    const def=defs[node.type];const inputCount=incomingEdges(node.id).length;const multi=maxInputs(node.type)>1;
    const fileButton=node.type==='input'?`<button class="wf-node-file" type="button" data-wf-node-file="${node.id}"><i class="fas fa-paperclip"></i><span>${escapeHtml(node.fileName||'Attach document')}</span></button>`:'';
    return `<article class="wf-node${state.selectedId===node.id?' is-selected':''}${node.status&&node.status!=='idle'?` is-${node.status}`:''}" data-wf-node-id="${node.id}" data-wf-type="${node.type}" data-wf-kind="${def.kind}" style="left:${node.x}px;top:${node.y}px">
      <button class="wf-port input" type="button" data-wf-port="input" aria-label="Connect into ${escapeHtml(node.title)}"></button>${multi?`<span class="wf-input-count">${inputCount}/${maxInputs(node.type)}</span>`:''}
      <header class="wf-node-head" data-wf-drag-handle><span class="wf-node-icon"><i class="fas ${def.icon}"></i></span><span><strong>${escapeHtml(node.title)}</strong><small>${escapeHtml(def.label)}</small></span><button class="wf-node-menu" type="button" data-wf-node-menu aria-label="Node menu"><i class="fas fa-ellipsis-v"></i></button></header>
      <div class="wf-node-body"><span class="wf-node-summary">${escapeHtml(nodeSummary(node))}</span>${fileButton}<div class="wf-node-meta"><span class="wf-node-status">${escapeHtml(node.statusText||'Ready')}</span><span>${node.runtime?.output?.length??''}</span></div></div>
      <button class="wf-port output" type="button" data-wf-port="output" aria-label="Connect from ${escapeHtml(node.title)}"></button>
    </article>`;
  }
  function renderNodes(){nodeLayer.innerHTML=state.nodes.map(nodeHtml).join('');$('#wfEmptyState').hidden=state.nodes.length>0;}
  function portPoint(nodeId,direction){
    const node=nodeById(nodeId);if(!node)return{x:0,y:0};
    return direction==='output'?{x:node.x+CANVAS.nodeWidth+1,y:node.y+48}:{x:node.x-1,y:node.y+48};
  }
  function connectionPath(source,target){const a=portPoint(source,'output'),b=portPoint(target,'input');const distance=Math.max(80,Math.abs(b.x-a.x)*.48);return `M ${a.x} ${a.y} C ${a.x+distance} ${a.y}, ${b.x-distance} ${b.y}, ${b.x} ${b.y}`;}
  function renderConnections(){
    connectionLayer.innerHTML=state.edges.map(edge=>`<path class="wf-connection" data-wf-edge-id="${edge.id}" d="${connectionPath(edge.source,edge.target)}" marker-end="url(#wfArrow)"></path>`).join('');
  }
  function renderCanvasScale(){canvas.style.transform=`scale(${state.zoom})`;sizer.style.width=`${CANVAS.width*state.zoom}px`;sizer.style.height=`${CANVAS.height*state.zoom}px`;$('#wfZoomLabel').textContent=`${Math.round(state.zoom*100)}%`;}
  function renderAll(){renderNodes();renderConnections();renderCanvasScale();}

  function field(label,name,value,type='text',extra=''){
    return `<label class="wf-field"><span>${escapeHtml(label)}</span><input type="${type}" data-wf-field="${escapeHtml(name)}" value="${escapeHtml(value??'')}" ${extra}></label>`;
  }
  function selectField(label,name,value,options){return `<label class="wf-field"><span>${escapeHtml(label)}</span><select data-wf-field="${escapeHtml(name)}">${options.map(option=>`<option value="${escapeHtml(option.value)}"${String(option.value)===String(value)?' selected':''}>${escapeHtml(option.label)}</option>`).join('')}</select></label>`;}
  function checkField(label,name,checked){return `<label class="wf-checkbox"><input type="checkbox" data-wf-field="${escapeHtml(name)}"${checked?' checked':''}><span>${escapeHtml(label)}</span></label>`;}
  function textareaField(label,name,value,help=''){return `<label class="wf-field"><span>${escapeHtml(label)}</span><textarea data-wf-field="${escapeHtml(name)}">${escapeHtml(value??'')}</textarea>${help?`<small class="wf-help">${escapeHtml(help)}</small>`:''}</label>`;}
  function previewHtml(node){
    const rows=outputRows(node);if(!rows.length)return `<div class="wf-preview"><div class="wf-preview-head"><strong>Output preview</strong><span>0 rows</span></div><div class="wf-preview-empty">Run the workflow to preview this node's output.</div></div>`;
    const columns=[...new Set(rows.slice(0,20).flatMap(row=>Object.keys(row||{})))].slice(0,10);
    return `<div class="wf-preview"><div class="wf-preview-head"><strong>Output preview</strong><span>${rows.length} rows</span></div><div class="wf-preview-scroll"><table><thead><tr>${columns.map(column=>`<th>${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,8).map(row=>`<tr>${columns.map(column=>`<td title="${escapeHtml(row[column]??'')}">${escapeHtml(row[column]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  }
  function propertiesHtml(node){
    const def=defs[node.type];let controls=field('Node name','title',node.title);
    if(node.type==='input')controls+=`<div class="wf-inspector-actions"><button class="wf-button dark" type="button" data-wf-select-file="${node.id}"><i class="fas fa-paperclip"></i> Attach file</button><button class="wf-button" type="button" data-wf-clear-file="${node.id}"><i class="fas fa-eraser"></i> Clear</button></div><div class="wf-inspector-actions"><button class="wf-button" type="button" data-wf-use-transform="bank"><i class="fas fa-university"></i> Use Bank data</button><button class="wf-button" type="button" data-wf-use-transform="cash"><i class="fas fa-book"></i> Use Cash data</button></div><p class="wf-help">Attached: ${escapeHtml(node.fileName||'none')} · ${node.data.length} rows. Transform Data sources can be pulled directly into this node.</p>`;
    if(node.type==='manual')controls+=textareaField('JSON rows','json',node.config.json,'Enter a JSON array containing one object per row.');
    if(node.type==='clean')controls+=checkField('Trim leading and trailing spaces','trim',node.config.trim)+checkField('Remove completely blank rows','removeBlank',node.config.removeBlank)+checkField('Standardise column headings','normalizeHeaders',node.config.normalizeHeaders)+checkField('Convert numeric and currency text','convertNumbers',node.config.convertNumbers);
    if(node.type==='filter')controls+=field('Column','column',node.config.column)+selectField('Operator','operator',node.config.operator,[{value:'equals',label:'Equals'},{value:'not_equals',label:'Does not equal'},{value:'contains',label:'Contains'},{value:'greater',label:'Greater than'},{value:'less',label:'Less than'},{value:'not_empty',label:'Is not empty'},{value:'empty',label:'Is empty'}])+field('Comparison value','value',node.config.value);
    if(node.type==='select')controls+=textareaField('Columns to retain','columns',node.config.columns,'Separate column names with commas.');
    if(node.type==='formula')controls+=field('Output column','outputColumn',node.config.outputColumn)+field('Expression','expression',node.config.expression)+`<p class="wf-help">Use square brackets for fields, for example: [Debit] - [Credit]. Numeric operators +, −, × and ÷ are supported.</p>`;
    if(node.type==='join')controls+=field('Left key','leftKey',node.config.leftKey)+field('Right key','rightKey',node.config.rightKey)+selectField('Join type','joinType',node.config.joinType,[{value:'inner',label:'Inner — matching only'},{value:'left',label:'Left — retain all left rows'},{value:'full',label:'Full — retain both sides'}]);
    if(node.type==='reconcile')controls+=field('Left amount field','leftAmount',node.config.leftAmount)+field('Right amount field','rightAmount',node.config.rightAmount)+field('Tolerance','tolerance',node.config.tolerance,'number','step="0.01" min="0"')+`<p class="wf-help">Use “Auto” to match Debit against Credit and Credit against Debit across the two ledgers.</p>`;
    if(node.type==='aggregate')controls+=field('Group by','groupBy',node.config.groupBy)+field('Value field','valueField',node.config.valueField)+selectField('Operation','operation',node.config.operation,[{value:'sum',label:'Sum'},{value:'count',label:'Count'},{value:'average',label:'Average'},{value:'min',label:'Minimum'},{value:'max',label:'Maximum'}]);
    if(node.type==='export')controls+=field('CSV filename','filename',node.config.filename);
    if(node.type==='report')controls+=field('Report title','reportTitle',node.config.reportTitle);
    const canDownload=['export','preview','report'].includes(node.type)&&outputRows(node).length;
    return `<div class="wf-inspector-header"><span class="wf-inspector-node-icon"><i class="fas ${def.icon}"></i></span><div><strong>${escapeHtml(node.title)}</strong><small>${escapeHtml(def.description)}</small></div></div><div class="wf-form">${controls}</div>${previewHtml(node)}<div class="wf-inspector-actions"><button class="wf-button" type="button" data-wf-run-selected><i class="fas fa-play"></i> Run workflow</button>${canDownload?'<button class="wf-button dark" type="button" data-wf-download-output><i class="fas fa-download"></i> Download output</button>':'<button class="wf-button" type="button" data-wf-duplicate-node><i class="fas fa-copy"></i> Duplicate</button>'}</div><div class="wf-inspector-actions"><button class="wf-button" type="button" data-wf-disconnect-node><i class="fas fa-unlink"></i> Disconnect</button><button class="wf-button wf-danger" type="button" data-wf-delete-node><i class="fas fa-trash-alt"></i> Delete</button></div>`;
  }
  function logHtml(){
    if(!state.logs.length)return `<div class="wf-log-empty"><i class="fas fa-terminal"></i><p>The execution log will show each node, row count and error after the workflow runs.</p></div>`;
    return `<div class="wf-log">${state.logs.map(entry=>`<div class="wf-log-entry ${entry.mode||''}"><i class="fas ${entry.mode==='error'?'fa-times':entry.mode==='success'?'fa-check':'fa-info'}"></i><div><strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml(entry.message)}</span></div></div>`).join('')}</div>`;
  }
  function renderInspector(){
    $$('[data-wf-inspector-tab]').forEach(button=>button.classList.toggle('is-active',button.dataset.wfInspectorTab===state.inspectorTab));
    if(state.inspectorTab==='log'){inspector.innerHTML=logHtml();return;}
    const node=nodeById(state.selectedId);inspector.innerHTML=node?propertiesHtml(node):`<div class="wf-inspector-empty"><i class="fas fa-mouse-pointer"></i><strong>Select a node</strong><p>Choose a workflow node to configure its file, rule, formula, matching settings or output.</p></div>`;
  }

  function updateNodeVisual(node){
    const element=$(`[data-wf-node-id="${node.id}"]`,nodeLayer);if(!element)return;
    const title=$('.wf-node-head strong',element),summary=$('.wf-node-summary',element),status=$('.wf-node-status',element),count=$('.wf-node-meta span:last-child',element);
    if(title)title.textContent=node.title;if(summary)summary.textContent=nodeSummary(node);if(status)status.textContent=node.statusText||'Ready';if(count)count.textContent=node.runtime?.output?.length??'';
    element.classList.toggle('is-running',node.status==='running');element.classList.toggle('is-success',node.status==='success');element.classList.toggle('is-error',node.status==='error');
  }

  function normaliseHeader(header,index){const clean=String(header??'').trim().replace(/[_\-]+/g,' ').replace(/\s+/g,' ');return clean?clean.replace(/\b\w/g,char=>char.toUpperCase()):`Column ${index+1}`;}
  function splitCsvLine(line){const values=[];let current='',quoted=false;for(let i=0;i<line.length;i++){const char=line[i];if(char==='"'){if(quoted&&line[i+1]==='"'){current+='"';i++;}else quoted=!quoted;}else if(char===','&&!quoted){values.push(current);current='';}else current+=char;}values.push(current);return values;}
  function parseCsv(text){const lines=String(text).replace(/^\uFEFF/,'').split(/\r?\n/).filter(line=>line.trim());if(lines.length<2)throw new Error('CSV requires headings and at least one data row.');const headers=splitCsvLine(lines[0]).map(normaliseHeader);return lines.slice(1).map(line=>{const values=splitCsvLine(line);return Object.fromEntries(headers.map((header,index)=>[header,values[index]??'']));});}
  async function parseFile(file){
    const extension=(file.name.split('.').pop()||'').toLowerCase();
    if(extension==='json'||file.type.includes('json')){const parsed=JSON.parse(await file.text());const rows=Array.isArray(parsed)?parsed:(Array.isArray(parsed.rows)?parsed.rows:[parsed]);return rows.filter(row=>row&&typeof row==='object');}
    if(window.X1TransformEngine?.readLedgerFile){const parsed=await window.X1TransformEngine.readLedgerFile(file);if(Array.isArray(parsed?.records))return parsed.records;}
    if(extension==='csv'||file.type.includes('csv')||file.type==='text/plain')return parseCsv(await file.text());
    if((extension==='xlsx'||extension==='xls')&&window.XLSX){const workbook=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});const sheet=workbook.Sheets[workbook.SheetNames[0]];if(!sheet)throw new Error('No worksheet was found.');return window.XLSX.utils.sheet_to_json(sheet,{defval:'',raw:false,dateNF:'yyyy-mm-dd'});}
    throw new Error('This document format could not be read. Use CSV, Excel, JSON or PDF; scanned PDFs are handled through automatic OCR.');
  }
  async function attachFile(nodeId,file){const node=nodeById(nodeId);if(!node||!file)return;node.status='running';node.statusText='Reading file';updateNodeVisual(node);setRunState(`Reading ${file.name}…`,'running');try{const rows=await parseFile(file);node.data=rows;node.fileName=file.name;node.status='success';node.statusText=`${rows.length} rows loaded`;node.runtime={output:clone(rows)};renderNodes();renderConnections();renderInspector();saveSilently();setRunState('Document loaded — ready to run','success');showToast(`${file.name} loaded with ${rows.length} rows.`);}catch(error){node.status='error';node.statusText='File error';updateNodeVisual(node);setRunState('Document could not be loaded','error');showToast(error.message||'The document could not be read.',true);}}

  function cleanRows(rows,config){
    const result=[];
    rows.forEach(row=>{const output={};Object.entries(row||{}).forEach(([key,value],index)=>{const header=config.normalizeHeaders?normaliseHeader(key,index):key;let next=typeof value==='string'&&config.trim?value.trim():value;if(config.convertNumbers&&typeof next==='string'&&/^\(?[\sA-Z$€£K]*-?[0-9][0-9,]*(?:\.\d+)?\)?$/.test(next.trim()))next=number(next);output[header]=next;});if(!config.removeBlank||Object.values(output).some(value=>String(value??'').trim()!==''))result.push(output);});return result;
  }
  function filterRows(rows,config){const column=config.column;const compare=String(config.value??'').toLowerCase();return rows.filter(row=>{const raw=row?.[column];const text=String(raw??'').toLowerCase();switch(config.operator){case'equals':return text===compare;case'not_equals':return text!==compare;case'contains':return text.includes(compare);case'greater':return number(raw)>number(config.value);case'less':return number(raw)<number(config.value);case'not_empty':return text.trim()!=='';case'empty':return text.trim()==='';default:return true;}});}
  function selectColumns(rows,config){const columns=String(config.columns||'').split(',').map(item=>item.trim()).filter(Boolean);if(!columns.length)return rows;return rows.map(row=>Object.fromEntries(columns.map(column=>[column,row?.[column]??''])));}
  function formulaRows(rows,config){return rows.map(row=>{let expression=String(config.expression||'0').replace(/\[([^\]]+)\]/g,(_,column)=>String(number(row?.[column])));if(!/^[0-9+\-*/().\s]+$/.test(expression))throw new Error('Formula contains unsupported characters. Use numeric fields and arithmetic operators only.');let value=0;try{value=Function(`"use strict";return (${expression})`)();}catch(error){throw new Error(`Formula could not be evaluated: ${error.message}`);}return{...row,[config.outputColumn||'Result']:Number.isFinite(value)?value:0};});}
  function joinRows(inputs,config){const left=inputs[0]||[],right=inputs[1]||[];const rightMap=new Map();right.forEach((row,index)=>{const key=String(row?.[config.rightKey]??'');if(!rightMap.has(key))rightMap.set(key,[]);rightMap.get(key).push({row,index});});const used=new Set(),result=[];left.forEach(leftRow=>{const key=String(leftRow?.[config.leftKey]??'');const matches=rightMap.get(key)||[];if(matches.length){matches.forEach(match=>{used.add(match.index);const merged={...leftRow};Object.entries(match.row).forEach(([column,value])=>{merged[column in merged?`Right ${column}`:column]=value;});result.push(merged);});}else if(config.joinType==='left'||config.joinType==='full')result.push({...leftRow});});if(config.joinType==='full')right.forEach((row,index)=>{if(!used.has(index))result.push(Object.fromEntries(Object.entries(row).map(([key,value])=>[`Right ${key}`,value])));});return result;}
  function amountOptions(row,preferred){
    if(preferred&&String(preferred).toLowerCase()!=='auto')return[{field:preferred,amount:Math.abs(number(row?.[preferred])),direction:'configured'}].filter(item=>item.amount>0);
    const options=[];if(Math.abs(number(row?.Debit))>0)options.push({field:'Debit',amount:Math.abs(number(row.Debit)),direction:'debit'});if(Math.abs(number(row?.Credit))>0)options.push({field:'Credit',amount:Math.abs(number(row.Credit)),direction:'credit'});if(!options.length&&Math.abs(number(row?.Amount))>0)options.push({field:'Amount',amount:Math.abs(number(row.Amount)),direction:'amount'});return options;
  }
  function reconcileRows(inputs,config){
    const left=inputs[0]||[],right=inputs[1]||[],used=new Set(),result=[];let matched=0;const tolerance=Math.max(0,number(config.tolerance));
    left.forEach((leftRow,leftIndex)=>{let best=null;for(const leftAmount of amountOptions(leftRow,config.leftAmount)){for(let rightIndex=0;rightIndex<right.length;rightIndex++){if(used.has(rightIndex))continue;for(const rightAmount of amountOptions(right[rightIndex],config.rightAmount)){const reciprocal=leftAmount.direction==='debit'?rightAmount.direction==='credit':leftAmount.direction==='credit'?rightAmount.direction==='debit':true;if(String(config.leftAmount).toLowerCase()==='auto'&&String(config.rightAmount).toLowerCase()==='auto'&&!reciprocal)continue;const difference=Math.abs(leftAmount.amount-rightAmount.amount);if(difference<=tolerance&&(!best||difference<best.difference))best={rightIndex,leftAmount,rightAmount,difference};}}}
      const base={};Object.entries(leftRow).forEach(([key,value])=>base[`Left ${key}`]=value);
      if(best){used.add(best.rightIndex);Object.entries(right[best.rightIndex]).forEach(([key,value])=>base[`Right ${key}`]=value);base['Match Status']='Matched';base['Match Amount']=best.leftAmount.amount;base['Difference']=best.difference;base['Left Row']=leftIndex+1;base['Right Row']=best.rightIndex+1;matched++;}
      else{base['Match Status']='Unmatched left';base['Match Amount']=amountOptions(leftRow,config.leftAmount)[0]?.amount||0;base['Difference']='';base['Left Row']=leftIndex+1;base['Right Row']='';}
      result.push(base);
    });
    right.forEach((rightRow,rightIndex)=>{if(used.has(rightIndex))return;const base={};Object.entries(rightRow).forEach(([key,value])=>base[`Right ${key}`]=value);base['Match Status']='Unmatched right';base['Match Amount']=amountOptions(rightRow,config.rightAmount)[0]?.amount||0;base['Difference']='';base['Left Row']='';base['Right Row']=rightIndex+1;result.push(base);});
    return{rows:result,summary:{left:left.length,right:right.length,matched,unmatchedLeft:left.length-matched,unmatchedRight:right.length-matched}};
  }
  function aggregateRows(rows,config){const groups=new Map();rows.forEach(row=>{const key=String(row?.[config.groupBy]??'(blank)');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(number(row?.[config.valueField]));});return [...groups.entries()].map(([group,values])=>{let value=0;if(config.operation==='count')value=values.length;else if(config.operation==='average')value=values.length?values.reduce((a,b)=>a+b,0)/values.length:0;else if(config.operation==='min')value=values.length?Math.min(...values):0;else if(config.operation==='max')value=values.length?Math.max(...values):0;else value=values.reduce((a,b)=>a+b,0);return{[config.groupBy||'Group']:group,Count:values.length,[`${config.operation||'sum'} ${config.valueField||'Value'}`]:value};});}

  function processNode(node,inputs){
    if(node.type==='input'){if(!node.data.length)throw new Error('Attach a source document or pull prepared Transform Data into this node.');return clone(node.data);}
    if(node.type==='manual'){const parsed=JSON.parse(node.config.json||'[]');if(!Array.isArray(parsed))throw new Error('Manual Data must contain a JSON array.');node.data=clone(parsed);return parsed;}
    if(!inputs.length)throw new Error('Connect an upstream node before running this step.');
    if((node.type==='join'||node.type==='reconcile')&&inputs.length<2)throw new Error(`${defs[node.type].label} needs two incoming document streams.`);
    if(node.type==='clean')return cleanRows(inputs[0],node.config);
    if(node.type==='filter')return filterRows(inputs[0],node.config);
    if(node.type==='select')return selectColumns(inputs[0],node.config);
    if(node.type==='formula')return formulaRows(inputs[0],node.config);
    if(node.type==='join')return joinRows(inputs,node.config);
    if(node.type==='union')return inputs.flatMap(rows=>rows);
    if(node.type==='reconcile'){const result=reconcileRows(inputs,node.config);node.runtime={...(node.runtime||{}),summary:result.summary};return result.rows;}
    if(node.type==='aggregate')return aggregateRows(inputs[0],node.config);
    if(node.type==='preview'||node.type==='export'||node.type==='report')return clone(inputs[0]);
    return clone(inputs[0]);
  }
  function topologicalOrder(){
    const indegree=new Map(state.nodes.map(node=>[node.id,0]));state.edges.forEach(edge=>{if(indegree.has(edge.target))indegree.set(edge.target,indegree.get(edge.target)+1);});const queue=state.nodes.filter(node=>indegree.get(node.id)===0).map(node=>node.id),order=[];while(queue.length){const nodeId=queue.shift();order.push(nodeId);outgoingEdges(nodeId).forEach(edge=>{indegree.set(edge.target,indegree.get(edge.target)-1);if(indegree.get(edge.target)===0)queue.push(edge.target);});}if(order.length!==state.nodes.length)throw new Error('The workflow contains a circular connection. Remove the loop and run again.');return order;}
  function addLog(title,message,mode='info'){state.logs.push({title,message,mode,time:new Date().toISOString()});renderInspector();}
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function runWorkflow(){
    if(state.running)return;if(!state.nodes.length)return showToast('Add at least one node before running.',true);
    state.running=true;state.logs=[];state.nodes.forEach(node=>{node.status='idle';node.statusText='Queued';node.runtime=null;});renderAll();setRunState('Running workflow…','running');
    try{
      const order=topologicalOrder();
      for(let index=0;index<order.length;index++){
        const node=nodeById(order[index]);node.status='running';node.statusText='Running';updateNodeVisual(node);setRunState(`Running ${index+1} of ${order.length}: ${node.title}`,'running');await delay(90);
        const inputs=incomingEdges(node.id).map(edge=>outputRows(nodeById(edge.source)));
        try{const output=processNode(node,inputs);const prior=node.runtime||{};node.runtime={...prior,output:Array.isArray(output)?output:[]};node.status='success';node.statusText='Completed';addLog(node.title,`${node.runtime.output.length} row${node.runtime.output.length===1?'':'s'} produced.`,'success');updateNodeVisual(node);}catch(error){node.status='error';node.statusText='Failed';addLog(node.title,error.message||'Node execution failed.','error');updateNodeVisual(node);throw new Error(`${node.title}: ${error.message||'execution failed'}`);}
      }
      state.running=false;setRunState(`Completed ${state.nodes.length} nodes successfully`,'success');saveSilently();renderInspector();showToast('Workflow completed successfully.');
    }catch(error){state.running=false;setRunState('Workflow stopped because a node failed','error');renderInspector();showToast(error.message||'Workflow execution failed.',true);}
  }

  function csvEscape(value){const text=String(value??'');return /[",\n\r]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;}
  function downloadBlob(content,type,filename){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function downloadRows(node){const rows=outputRows(node);if(!rows.length)return showToast('Run the workflow before downloading output.',true);const columns=[...new Set(rows.flatMap(row=>Object.keys(row||{})))];const csv=[columns.map(csvEscape).join(','),...rows.map(row=>columns.map(column=>csvEscape(row?.[column]??'')).join(','))].join('\r\n');downloadBlob(csv,'text/csv;charset=utf-8',node.config.filename||'findat_workflow_output.csv');showToast('Workflow output downloaded.');}
  function serialise(){return{version:1,exportedAt:new Date().toISOString(),nodes:state.nodes.map(node=>({id:node.id,type:node.type,title:node.title,x:node.x,y:node.y,config:node.config,data:node.data,fileName:node.fileName})),edges:state.edges.map(edge=>({...edge})),zoom:state.zoom};}
  function applyDefinition(definition){if(!definition||!Array.isArray(definition.nodes)||!Array.isArray(definition.edges))throw new Error('This is not a valid FINDAT workflow definition.');const validNodes=definition.nodes.filter(node=>defs[node.type]).map(node=>({id:node.id||id('node'),type:node.type,title:node.title||defs[node.type].label,x:Number(node.x)||80,y:Number(node.y)||80,config:{...clone(defs[node.type].defaults),...(node.config||{})},data:Array.isArray(node.data)?node.data:[],fileName:node.fileName||'',status:'idle',statusText:'Ready',runtime:null}));const nodeIds=new Set(validNodes.map(node=>node.id));state.nodes=validNodes;state.edges=definition.edges.filter(edge=>nodeIds.has(edge.source)&&nodeIds.has(edge.target)).map(edge=>({id:edge.id||id('edge'),source:edge.source,target:edge.target}));state.zoom=Math.max(.45,Math.min(1.35,Number(definition.zoom)||1));state.selectedId=state.nodes[0]?.id||null;state.logs=[];renderAll();renderInspector();saveSilently();}
  function saveSilently(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(serialise()));}catch(error){/* Browser storage can be restricted or too small for large datasets. */}}
  function saveWorkflow(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(serialise()));showToast('Workflow saved.');}catch(error){showToast('The workflow is too large for browser storage. Export the workflow file instead.',true);}}
  function exportWorkflow(){downloadBlob(JSON.stringify(serialise(),null,2),'application/json;charset=utf-8','findat_workflow.json');showToast('Workflow definition exported.');}
  function clearWorkflow(confirmFirst=true){if(confirmFirst&&state.nodes.length&&!window.confirm('Clear every node and connection from this workflow?'))return;state.nodes=[];state.edges=[];state.selectedId=null;state.logs=[];renderAll();renderInspector();saveSilently();setRunState('Ready — blank workflow','ready');}
  function loadSample(){
    const bank=[{Date:'2026-07-01',Reference:'BANK-001',Description:'Customer receipt',Debit:0,Credit:1200},{Date:'2026-07-03',Reference:'BANK-002',Description:'Supplier payment',Debit:300,Credit:0},{Date:'2026-07-06',Reference:'BANK-003',Description:'Bank charge',Debit:25,Credit:0}];
    const cash=[{Date:'2026-07-01',Reference:'CASH-001',Description:'Customer receipt',Debit:1200,Credit:0},{Date:'2026-07-03',Reference:'CASH-002',Description:'Supplier payment',Debit:0,Credit:300},{Date:'2026-07-08',Reference:'CASH-003',Description:'Deposit in transit',Debit:600,Credit:0}];
    state.nodes=[];state.edges=[];const make=(type,x,y,options={})=>{const def=defs[type],node={id:id('node'),type,title:options.title||def.label,x,y,config:{...clone(def.defaults),...(options.config||{})},data:options.data||[],fileName:options.fileName||'',status:'idle',statusText:'Ready',runtime:null};state.nodes.push(node);return node;};
    const bankInput=make('input',55,85,{title:'Bank statement',data:bank,fileName:'sample_bank_statement.xlsx'}),bankClean=make('clean',285,85,{title:'Clean bank data'}),cashInput=make('input',55,300,{title:'Cash ledger',data:cash,fileName:'sample_cash_ledger.xlsx'}),cashClean=make('clean',285,300,{title:'Clean cash data'}),reconcile=make('reconcile',545,190,{title:'Reconcile ledgers'}),report=make('report',810,190,{title:'Reconciliation report',config:{reportTitle:'Bank Reconciliation Workflow Report'}});
    [[bankInput,bankClean],[cashInput,cashClean],[bankClean,reconcile],[cashClean,reconcile],[reconcile,report]].forEach(([source,target])=>state.edges.push({id:id('edge'),source:source.id,target:target.id}));state.selectedId=bankInput.id;state.logs=[];state.zoom=.9;renderAll();renderInspector();saveSilently();setTimeout(()=>{viewport.scrollLeft=0;viewport.scrollTop=40;},0);showToast('Sample bank-reconciliation workflow loaded.');
  }
  function autoLayout(){
    if(!state.nodes.length)return;let order;try{order=topologicalOrder();}catch(error){return showToast(error.message,true);}const level=new Map();order.forEach(nodeId=>{const parents=incomingEdges(nodeId);level.set(nodeId,parents.length?Math.max(...parents.map(edge=>level.get(edge.source)||0))+1:0);});const groups={};order.forEach(nodeId=>{const key=level.get(nodeId)||0;(groups[key]||(groups[key]=[])).push(nodeId);});Object.entries(groups).forEach(([levelNumber,nodeIds])=>nodeIds.forEach((nodeId,index)=>{const node=nodeById(nodeId);node.x=55+Number(levelNumber)*235;node.y=65+index*145;}));renderAll();saveSilently();showToast('Workflow automatically arranged.');}
  function fitCanvas(){if(!state.nodes.length){state.zoom=1;renderCanvasScale();return;}const minX=Math.min(...state.nodes.map(node=>node.x)),maxX=Math.max(...state.nodes.map(node=>node.x+CANVAS.nodeWidth)),minY=Math.min(...state.nodes.map(node=>node.y)),maxY=Math.max(...state.nodes.map(node=>node.y+CANVAS.nodeHeight));const availableWidth=Math.max(300,viewport.clientWidth-80),availableHeight=Math.max(260,viewport.clientHeight-80);state.zoom=Math.max(.45,Math.min(1.15,availableWidth/(maxX-minX+80),availableHeight/(maxY-minY+80)));renderCanvasScale();requestAnimationFrame(()=>{viewport.scrollLeft=Math.max(0,(minX-35)*state.zoom);viewport.scrollTop=Math.max(0,(minY-35)*state.zoom);});}
  function setZoom(value){state.zoom=Math.max(.45,Math.min(1.4,value));renderCanvasScale();saveSilently();}

  function canvasPoint(event){const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)/state.zoom,y:(event.clientY-rect.top)/state.zoom};}
  function startConnection(nodeId,event){state.connectionDraft={source:nodeId};const start=portPoint(nodeId,'output'),point=canvasPoint(event);draftPath.hidden=false;draftPath.setAttribute('d',`M ${start.x} ${start.y} C ${start.x+90} ${start.y}, ${point.x-90} ${point.y}, ${point.x} ${point.y}`);}
  function updateConnectionDraft(event){if(!state.connectionDraft)return;const start=portPoint(state.connectionDraft.source,'output'),point=canvasPoint(event),distance=Math.max(80,Math.abs(point.x-start.x)*.45);draftPath.setAttribute('d',`M ${start.x} ${start.y} C ${start.x+distance} ${start.y}, ${point.x-distance} ${point.y}, ${point.x} ${point.y}`);}
  function endConnection(event){if(!state.connectionDraft)return;const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-wf-port="input"]')?.closest('[data-wf-node-id]');if(target)addEdge(state.connectionDraft.source,target.dataset.wfNodeId);state.connectionDraft=null;draftPath.hidden=true;draftPath.setAttribute('d','');$$('.wf-port.is-hot').forEach(port=>port.classList.remove('is-hot'));}

  nodeLayer.addEventListener('pointerdown',event=>{
    const nodeElement=event.target.closest('[data-wf-node-id]');if(!nodeElement)return;const node=nodeById(nodeElement.dataset.wfNodeId);if(!node)return;state.selectedId=node.id;renderNodes();renderConnections();renderInspector();
    if(event.target.closest('[data-wf-port="output"]')){event.preventDefault();event.stopPropagation();startConnection(node.id,event);return;}
    if(event.target.closest('button,input,select,textarea')||!event.target.closest('[data-wf-drag-handle]'))return;
    event.preventDefault();const origin={clientX:event.clientX,clientY:event.clientY,x:node.x,y:node.y};nodeElement.setPointerCapture?.(event.pointerId);
    const move=moveEvent=>{node.x=Math.max(10,Math.min(CANVAS.width-CANVAS.nodeWidth-10,origin.x+(moveEvent.clientX-origin.clientX)/state.zoom));node.y=Math.max(10,Math.min(CANVAS.height-CANVAS.nodeHeight-10,origin.y+(moveEvent.clientY-origin.clientY)/state.zoom));nodeElement.style.left=`${node.x}px`;nodeElement.style.top=`${node.y}px`;renderConnections();};
    const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);saveSilently();};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true});
  });
  nodeLayer.addEventListener('click',event=>{
    const nodeElement=event.target.closest('[data-wf-node-id]');if(!nodeElement)return;const nodeId=nodeElement.dataset.wfNodeId;
    if(event.target.closest('[data-wf-node-file]')){state.activeFileNodeId=nodeId;filePicker.click();return;}
    if(event.target.closest('[data-wf-node-menu]')){event.stopPropagation();state.contextNodeId=nodeId;const button=event.target.closest('[data-wf-node-menu]'),rect=button.getBoundingClientRect(),workspaceRect=$('.wf-workspace').getBoundingClientRect();contextMenu.style.left=`${Math.min(workspaceRect.width-170,rect.left-workspaceRect.left-120)}px`;contextMenu.style.top=`${rect.bottom-workspaceRect.top+4}px`;contextMenu.classList.add('is-open');}
  });
  document.addEventListener('pointermove',event=>{updateConnectionDraft(event);const input=event.target.closest?.('[data-wf-port="input"]');$$('.wf-port.is-hot').forEach(port=>port.classList.toggle('is-hot',port===input));});
  document.addEventListener('pointerup',endConnection);
  canvas.addEventListener('click',event=>{if(event.target===canvas||event.target===nodeLayer){state.selectedId=null;renderNodes();renderConnections();renderInspector();}});
  contextMenu.addEventListener('click',event=>{const control=event.target.closest('[data-wf-context]');if(!control)return;event.preventDefault();event.stopPropagation();const action=control.dataset.wfContext,nodeId=state.contextNodeId;contextMenu.classList.remove('is-open');if(action==='duplicate')duplicateNode(nodeId);if(action==='disconnect')disconnectNode(nodeId);if(action==='delete')removeNode(nodeId);});
  document.addEventListener('click',event=>{if(!event.target.closest('#wfContextMenu')&&!event.target.closest('[data-wf-node-menu]'))contextMenu.classList.remove('is-open');});

  $$('[data-wf-add-node]').forEach(tool=>{
    tool.addEventListener('dragstart',event=>{event.dataTransfer.setData('text/x-findat-node',tool.dataset.wfAddNode);event.dataTransfer.effectAllowed='copy';});
    tool.addEventListener('click',()=>{const x=(viewport.scrollLeft+viewport.clientWidth/2)/state.zoom-CANVAS.nodeWidth/2,y=(viewport.scrollTop+viewport.clientHeight/2)/state.zoom-CANVAS.nodeHeight/2;addNode(tool.dataset.wfAddNode,x,y);});
  });
  viewport.addEventListener('dragover',event=>{if(event.dataTransfer.types.includes('text/x-findat-node')){event.preventDefault();event.dataTransfer.dropEffect='copy';}});
  viewport.addEventListener('drop',event=>{const type=event.dataTransfer.getData('text/x-findat-node');if(!defs[type])return;event.preventDefault();const point=canvasPoint(event);addNode(type,point.x-CANVAS.nodeWidth/2,point.y-30);});
  $('#wfNodeSearch').addEventListener('input',event=>{const query=event.target.value.trim().toLowerCase();$$('.wf-node-tool').forEach(tool=>{tool.hidden=Boolean(query)&&!tool.textContent.toLowerCase().includes(query);});$$('[data-wf-category]').forEach(category=>category.hidden=!$$('.wf-node-tool:not([hidden])',category).length);});

  $$('[data-wf-inspector-tab]').forEach(button=>button.addEventListener('click',()=>{state.inspectorTab=button.dataset.wfInspectorTab;renderInspector();}));
  inspector.addEventListener('input',event=>{const fieldElement=event.target.closest('[data-wf-field]'),node=nodeById(state.selectedId);if(!fieldElement||!node)return;const key=fieldElement.dataset.wfField,value=fieldElement.type==='checkbox'?fieldElement.checked:fieldElement.type==='number'?number(fieldElement.value):fieldElement.value;if(key==='title')node.title=String(value||defs[node.type].label);else node.config[key]=value;updateNodeVisual(node);saveSilently();});
  inspector.addEventListener('change',event=>{const fieldElement=event.target.closest('[data-wf-field]');if(fieldElement){const node=nodeById(state.selectedId);if(node)updateNodeVisual(node);}});
  inspector.addEventListener('click',event=>{
    const node=nodeById(state.selectedId);if(event.target.closest('[data-wf-select-file]')){state.activeFileNodeId=event.target.closest('[data-wf-select-file]').dataset.wfSelectFile;filePicker.click();}
    if(event.target.closest('[data-wf-clear-file]')&&node){node.data=[];node.fileName='';node.runtime=null;node.status='idle';node.statusText='Ready';renderAll();renderInspector();saveSilently();}
    const transformButton=event.target.closest('[data-wf-use-transform]');if(transformButton&&node){const prepared=window.X1TransformEngine?.getPreparedData?.();const role=transformButton.dataset.wfUseTransform,rows=prepared?.[role]||[];if(!rows.length)return showToast(`No prepared ${role} data is available in Transform Data.`,true);node.data=clone(rows);node.fileName=`Transform Data · ${role}`;node.runtime={output:clone(rows)};node.status='success';node.statusText=`${rows.length} rows linked`;renderAll();renderInspector();saveSilently();showToast(`${rows.length} prepared ${role} rows connected.`);}
    if(event.target.closest('[data-wf-run-selected]'))runWorkflow();if(event.target.closest('[data-wf-download-output]')&&node)downloadRows(node);if(event.target.closest('[data-wf-duplicate-node]')&&node)duplicateNode(node.id);if(event.target.closest('[data-wf-disconnect-node]')&&node)disconnectNode(node.id);if(event.target.closest('[data-wf-delete-node]')&&node){event.preventDefault();event.stopPropagation();removeNode(node.id);}
  });
  filePicker.addEventListener('change',event=>{const file=event.target.files?.[0],nodeId=state.activeFileNodeId;event.target.value='';if(file&&nodeId)attachFile(nodeId,file);});
  definitionPicker.addEventListener('change',async event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;try{applyDefinition(JSON.parse(await file.text()));showToast('Workflow imported successfully.');}catch(error){showToast(error.message||'The workflow file could not be imported.',true);}});

  $('#wfNewWorkflow').addEventListener('click',()=>clearWorkflow(true));$('#wfLoadSample').addEventListener('click',loadSample);$('#wfSaveWorkflow').addEventListener('click',saveWorkflow);$('#wfExportWorkflow').addEventListener('click',exportWorkflow);$('#wfImportWorkflow').addEventListener('click',()=>definitionPicker.click());$('#wfRunWorkflow').addEventListener('click',runWorkflow);$('#wfClearCanvas').addEventListener('click',()=>clearWorkflow(true));$('#wfAutoLayout').addEventListener('click',autoLayout);$('#wfFitCanvas').addEventListener('click',fitCanvas);$('#wfZoomOut').addEventListener('click',()=>setZoom(state.zoom-.1));$('#wfZoomIn').addEventListener('click',()=>setZoom(state.zoom+.1));$('#wfZoomLabel').addEventListener('click',()=>setZoom(1));
  document.addEventListener('keydown',event=>{const editing=event.target.matches?.('input,textarea,select,[contenteditable="true"]');const active=workflowsPanelIsActive();if(active&&!editing&&(event.key==='Delete'||event.key==='Backspace')){event.preventDefault();event.stopPropagation();if(state.selectedId)removeNode(state.selectedId);return;}if(active&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();saveWorkflow();}if(active&&(event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();runWorkflow();}});

  try{const stored=localStorage.getItem(STORAGE_KEY);if(stored)applyDefinition(JSON.parse(stored));else{renderAll();renderInspector();}}catch(error){renderAll();renderInspector();}
  window.FindatWorkflows={addNode,runWorkflow,loadSample,getDefinition:serialise,attachFile};
})();



/* ============================== Inline script 23 ============================== */

(()=>{
  'use strict';

  const PYODIDE_VERSION='314.0.2';
  const PYODIDE_BASE=`https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
  const runtimeState={busy:false,lastPlan:[],lastRun:null,python:{status:'off',instance:null,promise:null,error:''}};
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const normalise=value=>String(value||'').toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9%+_.\-/ ]+/g,' ').replace(/\s+/g,' ').trim();
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];

  function visible(element){return Boolean(element&&!element.hidden&&element.offsetParent!==null)}
  function currentModel(){return document.querySelector('.x1-fintech-content')?.classList.contains('x1-module-interfund')?'interfund':'bank'}
  function modelLabel(){return currentModel()==='interfund'?'v0.2 · Interfund Reconciliation':'v0.1 · Bank Reconciliation'}
  function clickSelector(selector,{all=false}={}){
    const matches=$$(selector).filter(item=>!item.disabled);
    const target=matches.find(visible)||matches[0];
    if(!target)return false;
    target.click();
    if(all)matches.slice(1).forEach(item=>item.click());
    return true;
  }
  function setValue(id,value){const input=document.getElementById(id);if(!input)return false;input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return true}
  function textOf(id){return document.getElementById(id)?.textContent?.trim()||''}

  function updateRuntimeUi(){
    const button=$('#x1PythonEngineToggle');
    if(button){button.classList.toggle('is-ready',runtimeState.python.status==='ready');button.classList.toggle('is-busy',runtimeState.python.status==='loading');button.classList.toggle('is-error',runtimeState.python.status==='error');button.setAttribute('aria-pressed',String(runtimeState.python.status==='ready'));button.innerHTML=runtimeState.python.status==='ready'?'<i class="fas fa-chart-line" aria-hidden="true"></i> Analytics ready':runtimeState.python.status==='loading'?'<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Preparing analytics':'<i class="fas fa-chart-line" aria-hidden="true"></i> Advanced analytics';}
  }

  function installRuntimeUi(){
    const suggestions=$('.x1-brain-suggestions');
    const toolbar=$('.x1-chat-toolbar-actions');
    if(toolbar&&!$('#x1PythonEngineToggle')){
      const button=document.createElement('button');button.id='x1PythonEngineToggle';button.type='button';button.className='x1-agent-toolbar-button';button.setAttribute('aria-pressed','false');button.innerHTML='<i class="fas fa-chart-line" aria-hidden="true"></i> Advanced analytics';
      const llm=$('#x1LocalLlmToggle');llm?.insertAdjacentElement('afterend',button);if(!llm)toolbar.prepend(button);
      button.addEventListener('click',async()=>{
        const conversationGenerationAtStart=Number(window.__x1ConversationGeneration||0);
        if(runtimeState.python.status==='ready'){
          try{
            const result=await PythonEngine.analyseCurrent();
            if(conversationGenerationAtStart===Number(window.__x1ConversationGeneration||0))announcePythonResult(result,conversationGenerationAtStart);
          }catch(error){console.error(error)}
          return;
        }
        try{await PythonEngine.init()}catch(error){console.error(error)}
      });
    }
    updateRuntimeUi();
  }

  function loadExternalScript(src){
    return new Promise((resolve,reject)=>{
      const existing=$(`script[src="${src}"]`);if(existing){if(window.loadPyodide)return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(new Error('Python runtime script failed to load.')),{once:true});return;}
      const script=document.createElement('script');script.src=src;script.async=true;script.crossOrigin='anonymous';script.onload=resolve;script.onerror=()=>reject(new Error('Python runtime script failed to load.'));document.head.appendChild(script);
    });
  }

  const PYTHON_BOOTSTRAP=String.raw`
import json, math, statistics, re

def _number(value):
    try:
        if value is None or value == '':
            return 0.0
        return float(re.sub(r'[^0-9.\\-]', '', str(value)) or 0)
    except Exception:
        return 0.0

def x1_python_analyse(payload_json):
    payload = json.loads(payload_json)
    ledgers = payload.get('ledgers', [])
    flat = []
    for ledger in ledgers:
        name = ledger.get('name', 'Ledger')
        for row in ledger.get('rows', []):
            debit = _number(row.get('debit'))
            credit = _number(row.get('credit'))
            amount = max(abs(debit), abs(credit))
            flat.append({**row, 'ledger': name, 'debit': debit, 'credit': credit, 'amount': amount})
    amounts = [r['amount'] for r in flat if r['amount'] > 0]
    median = statistics.median(amounts) if amounts else 0.0
    deviations = [abs(x-median) for x in amounts]
    mad = statistics.median(deviations) if deviations else 0.0
    refs = [str(r.get('reference','')).strip().lower() for r in flat if str(r.get('reference','')).strip()]
    duplicate_refs = sorted({ref for ref in refs if refs.count(ref) > 1})
    anomalies = []
    for row in flat:
        amount = row['amount']
        robust_z = (0.6745 * (amount-median) / mad) if mad > 0 else (1.0 if median and amount > median*3 else 0.0)
        flags = []
        if abs(robust_z) >= 3.5: flags.append('amount outlier')
        if amount and abs(amount-round(amount/1000)*1000) < 0.005 and amount >= 1000: flags.append('large round value')
        if not str(row.get('reference','')).strip(): flags.append('missing reference')
        if row['debit'] > 0 and row['credit'] > 0: flags.append('both debit and credit entered')
        if flags:
            anomalies.append({'ledger':row['ledger'],'reference':row.get('reference') or '—','amount':amount,'flags':flags,'score':round(abs(robust_z),2)})
    anomalies.sort(key=lambda x:(x['score'],x['amount']), reverse=True)
    result = {
        'model': payload.get('model'),
        'row_count': len(flat),
        'ledger_count': len(ledgers),
        'total_debits': round(sum(r['debit'] for r in flat),2),
        'total_credits': round(sum(r['credit'] for r in flat),2),
        'net': round(sum(r['debit']-r['credit'] for r in flat),2),
        'median_amount': round(median,2),
        'duplicate_reference_count': len(duplicate_refs),
        'duplicate_references': duplicate_refs[:8],
        'missing_reference_count': sum(1 for r in flat if not str(r.get('reference','')).strip()),
        'anomaly_count': len(anomalies),
        'anomalies': anomalies[:8]
    }
    return json.dumps(result)
`;

  function readLedgerRows(bodyId,name){
    const rows=$$(`#${bodyId} tr`).map((tr,index)=>{
      const inputs=$$('input',tr);const field=key=>tr.querySelector(`[data-field="${key}"]`)?.value||'';
      return{index:index+1,date:field('date')||inputs[0]?.value||'',reference:field('reference')||field('id')||inputs[1]?.value||'',description:field('description')||inputs[2]?.value||'',debit:field('debit')||inputs[3]?.value||0,credit:field('credit')||inputs[4]?.value||0};
    }).filter(row=>row.date||row.reference||row.description||Number(row.debit)||Number(row.credit));
    return{name,rows};
  }
  function currentLedgerPayload(){
    if(currentModel()==='interfund')return{model:'interfund',ledgers:[readLedgerRows('ifAdminRows','Administration'),readLedgerRows('ifProjectRows','Project')]};
    return{model:'bank',ledgers:[readLedgerRows('x1BankRows','Bank statement'),readLedgerRows('x1CashRows','Cash ledger')]};
  }
  function formatNumber(value){return Number(value||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
  function pythonSummary(result){
    const anomalyText=result.anomaly_count?`${result.anomaly_count} flagged row(s)`: 'no rows flagged';
    const duplicates=result.duplicate_reference_count?`, ${result.duplicate_reference_count} duplicate reference(s)`:'';
    const missing=result.missing_reference_count?`, ${result.missing_reference_count} missing reference(s)`:'';
    const examples=(result.anomalies||[]).slice(0,3).map(item=>`${item.ledger} ${item.reference}: ${formatNumber(item.amount)} (${item.flags.join(', ')})`).join('; ');
    return `Advanced analytics reviewed ${result.row_count} transaction(s) across ${result.ledger_count} ledger(s). Debits total ${formatNumber(result.total_debits)}, credits total ${formatNumber(result.total_credits)}, and the net debit-minus-credit movement is ${formatNumber(result.net)}. It found ${anomalyText}${duplicates}${missing}.${examples?` Highest-priority checks: ${examples}.`:''}`;
  }
  function announcePythonResult(result,generation=Number(window.__x1ConversationGeneration||0)){
    const thread=$('#x1ChatThread');
    if(!thread||!result||generation!==Number(window.__x1ConversationGeneration||0))return;
    const wrapper=document.createElement('div');wrapper.className='x1-chat-message is-assistant';wrapper.dataset.x1Generation=String(generation);wrapper.innerHTML='<div class="x1-chat-message-icon">x1</div><div class="x1-chat-message-body"></div>';
    wrapper.querySelector('.x1-chat-message-body').textContent=pythonSummary(result);thread.appendChild(wrapper);thread.scrollTop=thread.scrollHeight;
  }

  const PythonEngine={
    async init(){
      if(runtimeState.python.status==='ready')return runtimeState.python.instance;
      if(runtimeState.python.promise)return runtimeState.python.promise;
      runtimeState.python.status='loading';runtimeState.python.error='';updateRuntimeUi('Preparing the analytics engine…','busy');
      runtimeState.python.promise=(async()=>{
        try{
          await loadExternalScript(`${PYODIDE_BASE}pyodide.js`);
          if(typeof window.loadPyodide!=='function')throw new Error('loadPyodide was not exposed by the runtime.');
          const pyodide=await window.loadPyodide({indexURL:PYODIDE_BASE});
          pyodide.runPython(PYTHON_BOOTSTRAP);
          runtimeState.python.instance=pyodide;runtimeState.python.status='ready';runtimeState.python.error='';updateRuntimeUi('Advanced analytics is ready for anomaly analysis and ledger diagnostics.');return pyodide;
        }catch(error){runtimeState.python.status='error';runtimeState.python.error=error.message||String(error);runtimeState.python.promise=null;updateRuntimeUi(`Advanced analytics could not load: ${runtimeState.python.error}`,'error');throw error;}
      })();
      return runtimeState.python.promise;
    },
    async analyseCurrent(){
      const pyodide=await this.init();const payload=currentLedgerPayload();
      if(!payload.ledgers.some(item=>item.rows.length))throw new Error('There are no transaction rows to analyse. Load or enter ledger data first.');
      pyodide.globals.set('_x1_payload',JSON.stringify(payload));
      try{return JSON.parse(pyodide.runPython('x1_python_analyse(_x1_payload)'));}
      finally{try{pyodide.globals.delete('_x1_payload')}catch(error){}}
    }
  };
  window.X1PythonEngine=PythonEngine;

  function isOperationalCommand(prompt){
    const q=normalise(prompt);
    if(!q)return false;
    if(/^(what|why|how|when|where|who|explain|define|describe|compare|tell me about)\b/.test(q))return false;
    return /\b(open|go to|take me|switch|change|select|use|load|run|start|execute|reconcile|review|generate|prepare|print|download|export|save|create|build|apply|clean|mine|analyse|analyze|scan|enable|disable|turn on|turn off|upload|import|show|reset|clear|arrange|layout|add)\b/.test(q);
  }

  function firstIndex(q,patterns){
    let best=-1;patterns.forEach(pattern=>{const match=q.match(pattern);if(match&&match.index>=0&&(best<0||match.index<best))best=match.index;});return best;
  }
  function operation(id,label,patterns,run){return{id,label,patterns,run}}
  function activeModelAction(bankFn,interfundFn){return currentModel()==='interfund'?interfundFn():bankFn()}
  async function ensureModel(name){if(currentModel()===name)return true;const choice=$(`[data-x1-module-choice="${name}"]`);if(!choice)throw new Error(`${name} model selector is unavailable.`);choice.click();await sleep(140);updateRuntimeUi(`Switched to ${modelLabel()}.`);return currentModel()===name}
  async function openWorkspace(name){
    if(currentModel()==='interfund'){
      if(name==='transform'){clickSelector('[data-if-action="transform"], [data-if-side-action="transform"]');await sleep(120);return true}
      if(name==='workbench'||name==='prepare'){clickSelector('[data-if-action="prepare"], [data-if-side-action="prepare"]');await sleep(100);return true}
    }
    const button=$$(`[data-x1-workspace-tab="${name}"]`).find(item=>!item.closest('[hidden]'))||$(`[data-x1-workspace-tab="${name}"]`);if(!button)return false;button.click();await sleep(120);return true;
  }
  async function selectTransformTab(name){await openWorkspace('transform');const button=$(`[data-x1-transform-tab="${name}"]`);if(button){button.click();await sleep(80);return true}return false}
  async function runActiveReconciliation(target='review'){
    if(currentModel()==='interfund'){
      const action=target==='report'?'report':target==='prepare'?'prepare':'review';const button=$(`[data-if-action="${action}"]`)||$(`[data-if-side-action="${action}"]`);if(button){button.click();await sleep(220);return true}return false;
    }
    if(target==='report')return clickSelector('[data-x1-open-workflow="statement"][data-x1-target="report"]');
    if(target==='accounts')return clickSelector('[data-x1-open-workflow="statement"][data-x1-target="accounts"]');
    if(target==='review')return clickSelector('[data-x1-open-workflow="review"][data-x1-target="exceptions"]')||clickSelector('#x1RunDemo');
    return clickSelector('#x1RunDemo');
  }
  function loadInterfundSample(){
    const admin=[
      {date:'2026-06-03',reference:'ADM-1001',description:'Project operating transfer',debit:1000,credit:''},
      {date:'2026-06-08',reference:'ADM-1002',description:'Shared procurement allocation',debit:'',credit:750},
      {date:'2026-06-14',reference:'ADM-1003',description:'Project funding allocation pending recognition',debit:'',credit:500},
      {date:'2026-06-19',reference:'ADM-1004',description:'Central service recovery pending project entry',debit:200,credit:''}
    ];
    const project=[
      {date:'2026-06-03',reference:'PRJ-2101',description:'Project operating transfer',debit:'',credit:1000},
      {date:'2026-06-08',reference:'PRJ-2102',description:'Shared procurement allocation',debit:750,credit:''},
      {date:'2026-06-22',reference:'PRJ-2103',description:'Donor receipt recorded by project only',debit:'',credit:300},
      {date:'2026-06-25',reference:'PRJ-2104',description:'Administration support cost recorded by project',debit:100,credit:''}
    ];
    const render=rows=>rows.map(row=>`<tr><td><input type="date" data-field="date" value="${row.date}"></td><td><input type="text" data-field="reference" value="${row.reference}"></td><td><input type="text" data-field="description" value="${row.description}"></td><td><input type="number" step="0.01" data-field="debit" value="${row.debit}"></td><td><input type="number" step="0.01" data-field="credit" value="${row.credit}"></td><td><button class="if-remove-row" type="button" aria-label="Remove transaction"><i class="fas fa-times" aria-hidden="true"></i></button></td></tr>`).join('');
    const a=$('#ifAdminRows'),p=$('#ifProjectRows');if(!a||!p)return false;a.innerHTML=render(admin);p.innerHTML=render(project);setValue('ifAdminClosing','20000');setValue('ifProjectClosing','19900');a.dispatchEvent(new Event('input',{bubbles:true}));p.dispatchEvent(new Event('input',{bubbles:true}));return true;
  }
  function summariseState(){
    if(currentModel()==='interfund')return `Interfund status: ${textOf('ifReportStatus')||'not run'}; matched ${textOf('ifMatchedCount')||'0'}; difference ${textOf('ifReportDifference')||textOf('ifDifferenceKpi')||'not calculated'}.`;
    return `Bank status: ${textOf('x1BalanceStatus')||'not run'}; matched ${textOf('x1MatchedCount')||'0'}; unmatched ${textOf('x1UnmatchedCount')||'0'}; adjusted bank ${textOf('x1AdjustedBank')||'not calculated'}; adjusted cash ${textOf('x1AdjustedCash')||'not calculated'}.`;
  }

  const operations=[
    operation('switch_interfund','Switch to Interfund Reconciliation',[/\b(?:switch|change|select|use|move)(?:\s+the\s+model)?(?:\s+to)?\s+(?:v0[.]2\s+)?interfund\b/],()=>ensureModel('interfund')),
    operation('switch_bank','Switch to Bank Reconciliation',[/\b(?:switch|change|select|use|move)(?:\s+the\s+model)?(?:\s+to)?\s+(?:v0[.]1\s+)?bank(?:\s+reconciliation)?\b/],()=>ensureModel('bank')),
    operation('home','Open Financial Assistant',[/\b(?:open|show|go to|return to)\s+(?:the\s+)?(?:financial\s+)?assistant\b/,/\bopen\s+home\b/],()=>openWorkspace('home')),
    operation('capabilities','Open Application Capabilities',[/\b(?:open|show|go to)\s+(?:application\s+)?(?:capabilities|overview|features)\b/],()=>openWorkspace('overview')),
    operation('transform','Open Transform Data',[/\b(?:open|show|go to|start|use)\s+(?:the\s+)?transform(?:\s+data)?\b/,/\bdata\s+transformation\s+workspace\b/],()=>openWorkspace('transform')),
    operation('transform_sample','Load Transform Data Sample',[/\bload\s+(?:the\s+)?transform(?:\s+data)?\s+sample\b/,/\btransform\s+sample\b/],async()=>{await openWorkspace('transform');return clickSelector('#x1LoadTransformSample')}),
    operation('transform_run','Run Data Transformation',[/\b(?:run|execute|start|apply)\s+(?:the\s+)?(?:data\s+)?transform(?:ation)?\b/,/\bprepare\s+(?:the\s+)?data\b/],async()=>{await openWorkspace('transform');return clickSelector('#x1RunTransform')}),
    operation('clean','Apply Data Cleaning',[/\b(?:apply|run|start|execute)\s+(?:the\s+)?clean(?:ing)?\b/,/\bclean\s+(?:the\s+)?(?:bank|cash|ledger|data|file|records)\b/],async()=>{await selectTransformTab('clean');return clickSelector('#x1ApplyCleaning')}),
    operation('mine','Mine Data and Detect Patterns',[/\b(?:run|start|perform|mine|scan|detect|analyse|analyze)\s+(?:the\s+)?(?:data\s+)?(?:mining|anomalies|outliers|patterns)\b/],async()=>{await selectTransformTab('mine');return clickSelector('#x1RunMining')}),
    operation('dashboard','Build Dashboard',[/\b(?:build|create|generate|open|show)\s+(?:the\s+)?dashboard\b/,/\bbuild\s+(?:a\s+)?pivot\b/],async()=>{await selectTransformTab('dashboard');return clickSelector('#x1BuildDashboard')}),
    operation('enable_ml','Enable Machine Learning Matching',[/\b(?:enable|turn on|activate|use)\s+(?:the\s+)?(?:machine learning|ml|smart matching)\b/],async()=>{await selectTransformTab('ml');const input=$('#x1MlEnabled');if(!input)return false;input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));return true}),
    operation('disable_ml','Disable Machine Learning Matching',[/\b(?:disable|turn off|deactivate)\s+(?:the\s+)?(?:machine learning|ml|smart matching)\b/],async()=>{await selectTransformTab('ml');const input=$('#x1MlEnabled');if(!input)return false;input.checked=false;input.dispatchEvent(new Event('change',{bubbles:true}));return true}),
    operation('send_recon','Send Prepared Data to Reconciliation',[/\b(?:send|move|apply|transfer)\s+(?:the\s+)?(?:prepared\s+)?data\s+to\s+(?:the\s+)?reconciliation\b/],async()=>{await openWorkspace('transform');return clickSelector('#x1SendToReconciliation')}),
    operation('workflow','Open Workflows',[/\b(?:open|show|go to|start|use)\s+(?:the\s+)?workflows?\b/,/\bworkflow\s+(?:builder|canvas|workspace)\b/],()=>openWorkspace('workflows')),
    operation('workflow_new','Create New Workflow',[/\b(?:create|start|make)\s+(?:a\s+)?new\s+workflow\b/],async()=>{await openWorkspace('workflows');return clickSelector('#wfNewWorkflow')}),
    operation('workflow_sample','Load Workflow Sample',[/\bload\s+(?:the\s+)?workflow\s+sample\b/,/\bsample\s+workflow\b/],async()=>{await openWorkspace('workflows');window.FindatWorkflows?.loadSample?.();return true}),
    operation('workflow_layout','Auto-layout Workflow',[/\b(?:auto[ -]?layout|arrange|organise|organize)\s+(?:the\s+)?workflow\b/],async()=>{await openWorkspace('workflows');return clickSelector('#wfAutoLayout')}),
    operation('workflow_run','Run Workflow',[/\b(?:run|execute|start)\s+(?:the\s+)?workflow\b/],async()=>{await openWorkspace('workflows');window.FindatWorkflows?.runWorkflow?.();return true}),
    operation('workflow_save','Save Workflow',[/\bsave\s+(?:the\s+)?workflow\b/],async()=>{await openWorkspace('workflows');return clickSelector('#wfSaveWorkflow')}),
    operation('workflow_export','Export Workflow',[/\bexport\s+(?:the\s+)?workflow\b/],async()=>{await openWorkspace('workflows');return clickSelector('#wfExportWorkflow')}),
    operation('workflow_add_reconcile','Add Reconcile Node',[/\badd\s+(?:a\s+)?reconcil(?:e|iation)\s+node\b/],async()=>{await openWorkspace('workflows');window.FindatWorkflows?.addNode?.('reconcile');return true}),
    operation('workflow_add_clean','Add Clean Data Node',[/\badd\s+(?:a\s+)?clean(?:\s+data)?\s+node\b/],async()=>{await openWorkspace('workflows');window.FindatWorkflows?.addNode?.('clean');return true}),
    operation('workflow_add_report','Add Report Node',[/\badd\s+(?:a\s+)?report\s+node\b/],async()=>{await openWorkspace('workflows');window.FindatWorkflows?.addNode?.('report');return true}),
    operation('workbench','Open Reconciliation Workspace',[/\b(?:open|show|go to|start)\s+(?:the\s+)?reconciliation\s+(?:workspace|workbench)\b/,/\bprepare\s+(?:the\s+)?ledgers?\b/],()=>openWorkspace(currentModel()==='interfund'?'prepare':'workbench')),
    operation('bank_sample','Load Bank Reconciliation Sample',[/\bload\s+(?:the\s+)?(?:bank\s+reconciliation\s+)?sample(?:\s+data)?\b/,/\bload\s+(?:the\s+)?demo\s+data\b/],async()=>{if(currentModel()==='interfund')return loadInterfundSample();await openWorkspace('workbench');return clickSelector('#x1LoadSample')}),
    operation('run_reconciliation','Run Reconciliation',[/\b(?:run|execute|perform|start|complete)\s+(?:the\s+)?(?:bank\s+|interfund\s+)?reconciliation\b/,/\breconcile\s+(?:the\s+)?(?:bank|cash|ledgers|accounts|transactions|records)\b/],async()=>{await openWorkspace(currentModel()==='interfund'?'prepare':'workbench');return runActiveReconciliation('review')}),
    operation('review_exceptions','Review Exceptions',[/\b(?:open|show|review|investigate)\s+(?:the\s+)?(?:reconciliation\s+)?(?:exceptions|unmatched(?:\s+transactions)?|differences)\b/],()=>runActiveReconciliation('review')),
    operation('update_accounts','Open Updated Accounts',[/\b(?:open|show|prepare|update)\s+(?:the\s+)?(?:updated\s+)?(?:bank\s+and\s+cash\s+)?accounts\b/],()=>activeModelAction(()=>runActiveReconciliation('accounts'),()=>runActiveReconciliation('report'))),
    operation('report','Generate Reconciliation Report',[/\b(?:generate|prepare|open|show|create|produce)\s+(?:the\s+)?(?:bank\s+|interfund\s+|reconciliation\s+)?(?:report|statement)\b/,/\baccountant[ -]?ready\s+(?:report|statement|output)\b/],()=>runActiveReconciliation('report')),
    operation('print_report','Print or Save Report as PDF',[/\b(?:print|save)\s+(?:the\s+)?(?:report|statement)(?:\s+as\s+pdf)?\b/,/\bdownload\s+(?:the\s+)?(?:report|statement)\s+(?:as\s+)?pdf\b/],async()=>{await runActiveReconciliation('report');await sleep(180);return activeModelAction(()=>clickSelector('#x1PrintStatement'),()=>clickSelector('#ifPrintReport'))}),
    operation('download_adjustments','Download Interfund Adjustments',[/\bdownload\s+(?:the\s+)?(?:interfund\s+)?adjustments(?:\s+csv)?\b/],async()=>{await ensureModel('interfund');await runActiveReconciliation('review');return clickSelector('#ifDownloadAdjustments')}),
    operation('knowledge','Open Knowledge Manager',[/\b(?:open|show|go to)\s+(?:the\s+)?knowledge(?:\s+manager|\s+base)?\b/],()=>clickSelector('#x1KnowledgeManager')),
    operation('upload_knowledge','Open Knowledge File Picker',[/\b(?:upload|import|add)\s+(?:a\s+)?(?:knowledge\s+)?(?:document|pdf|file)\b/],()=>clickSelector('#x1ComposerUpload')),
    operation('ollama','Enable Local Ollama Model',[/\b(?:enable|turn on|connect|activate|use)\s+(?:the\s+)?(?:ollama|local deep model|deep model)\b/],()=>clickSelector('#x1LocalLlmToggle')),
    operation('python','Run Python Ledger Analysis',[/\b(?:enable|load|start|run|use|apply)\s+(?:the\s+)?python(?:\s+(?:engine|analytics|analysis))?\b/,/\b(?:analyse|analyze|scan)\s+(?:the\s+)?(?:current\s+)?(?:transactions|ledgers|data)\s+with\s+python\b/],async()=>{const result=await PythonEngine.analyseCurrent();runtimeState.lastRun={python:result};return result}),
    operation('summary','Summarise Current Reconciliation',[/\b(?:show|give|summarise|summarize)\s+(?:me\s+)?(?:the\s+)?(?:current\s+)?(?:results|status|reconciliation summary)\b/],async()=>true)
  ];

  function buildPlan(prompt){
    const q=normalise(prompt),found=[];
    operations.forEach(op=>{const index=firstIndex(q,op.patterns);if(index>=0)found.push({...op,index})});
    // Remove generic navigation duplicates when a more specific action already opens the same workspace.
    const ids=new Set(found.map(item=>item.id));
    const drop=new Set();
    if([...ids].some(id=>['transform_sample','transform_run','clean','mine','dashboard','enable_ml','disable_ml','send_recon'].includes(id)))drop.add('transform');
    if([...ids].some(id=>id.startsWith('workflow_')))drop.add('workflow');
    if(ids.has('run_reconciliation')||ids.has('review_exceptions')||ids.has('update_accounts')||ids.has('report')||ids.has('print_report'))drop.add('workbench');
    let plan=found.filter(item=>!drop.has(item.id)).sort((a,b)=>a.index-b.index);
    // If a prompt asks for an end-to-end reconciliation, ensure execution and report are both present.
    if(/\b(?:end[ -]?to[ -]?end|full|complete)\s+(?:bank\s+|interfund\s+)?reconciliation\b/.test(q)){
      if(!plan.some(item=>item.id==='run_reconciliation'))plan.push({...operations.find(item=>item.id==='run_reconciliation'),index:q.length+1});
      if(!plan.some(item=>item.id==='report'||item.id==='print_report'))plan.push({...operations.find(item=>item.id==='report'),index:q.length+2});
    }
    // Deduplicate while preserving the first requested occurrence.
    const seen=new Set();plan=plan.filter(item=>!seen.has(item.id)&&(seen.add(item.id),true));
    return plan;
  }

  async function execute(prompt){
    if(runtimeState.busy)return{handled:true,text:'Another x1 agent plan is still running. Let it finish before starting a second operational command.',meta:'Agent busy',intent:'agentic_command',topic:'agent runtime',toast:'Agent is busy.'};
    if(!isOperationalCommand(prompt))return{handled:false};
    const plan=buildPlan(prompt);if(!plan.length)return{handled:false};
    runtimeState.busy=true;runtimeState.lastPlan=plan.map(item=>item.id);updateRuntimeUi(`Plan: ${plan.map(item=>item.label).join(' → ')}`,'busy');
    const completed=[],failed=[];let pythonResult=null;
    try{
      for(const step of plan){
        updateRuntimeUi(`Executing ${completed.length+1}/${plan.length}: ${step.label}`,'busy');
        try{const result=await step.run();if(result&&typeof result==='object'&&'row_count' in result)pythonResult=result;if(result===false)throw new Error('Required control is unavailable.');completed.push(step.label);await sleep(130)}
        catch(error){failed.push(`${step.label}: ${error.message||'failed'}`);break;}
      }
      const model=modelLabel();const stateSummary=summariseState();
      let text=completed.length?`Completed ${completed.length} planned action${completed.length===1?'':'s'} in ${model}: ${completed.join(' → ')}.`:'No action completed.';
      if(pythonResult)text+=` ${pythonSummary(pythonResult)}`;
      if(plan.some(item=>['run_reconciliation','review_exceptions','update_accounts','report','print_report','summary'].includes(item.id)))text+=` ${stateSummary}`;
      if(plan.some(item=>['upload_knowledge'].includes(item.id)))text+=' The browser file picker was opened; select the document to continue because a web page cannot choose a local file on your behalf.';
      if(failed.length)text+=` I stopped at the first failed step: ${failed[0]}`;
      runtimeState.lastRun={time:Date.now(),prompt,completed,failed,model:currentModel(),python:pythonResult};
      updateRuntimeUi(failed.length?`Stopped: ${failed[0]}`:`Completed: ${completed.join(' → ')}`,failed.length?'error':'ready');
      return{handled:true,text,meta:`Agentic plan · ${completed.length}/${plan.length} steps · verified DOM execution`,intent:'agentic_command',topic:currentModel(),toast:failed.length?'Plan stopped at an unavailable step.':'Agent plan completed.'};
    }finally{runtimeState.busy=false;setTimeout(()=>updateRuntimeUi(runtimeState.lastRun?.failed?.length?`Stopped: ${runtimeState.lastRun.failed[0]}`:`Last plan completed with ${runtimeState.lastRun?.completed?.length||0} step(s).`),50)}
  }

  window.X1AgenticRuntime={execute,buildPlan,getState:()=>({...runtimeState,model:currentModel()}),switchModel:ensureModel,openWorkspace,runReconciliation:runActiveReconciliation};
  installRuntimeUi();
  document.addEventListener('click',event=>{if(event.target.closest('[data-x1-module-choice]'))setTimeout(()=>updateRuntimeUi(),80)});
})();



/* ============================== Inline script 24 ============================== */

(()=>{
  const plus=document.getElementById('x1ComposerPlus');
  const menu=document.getElementById('x1ComposerMenu');
  const hiddenUpload=document.getElementById('x1ComposerUpload');
  const knowledgeUpload=document.getElementById('x1KnowledgeUpload');
  const prompt=document.getElementById('x1PromptInput');
  const composer=document.getElementById('x1FintechComposer');
  const chatThread=document.getElementById('x1ChatThread');
  const send=document.getElementById('x1ComposerSend');
  const microphone=document.getElementById('x1Microphone');
  const voiceStatus=document.getElementById('x1VoiceStatus');
  if(!plus||!menu||!prompt)return;

  const menuButtons=[...menu.querySelectorAll('[role="menuitem"]')];
  function openMenu(){
    menu.hidden=false;
    plus.setAttribute('aria-expanded','true');
    requestAnimationFrame(()=>menuButtons[0]?.focus());
  }
  function closeMenu({focusPlus=false}={}){
    menu.hidden=true;
    plus.setAttribute('aria-expanded','false');
    if(focusPlus)plus.focus();
  }
  function toggleMenu(){menu.hidden?openMenu():closeMenu({focusPlus:true})}

  plus.addEventListener('click',event=>{event.stopPropagation();toggleMenu()});
  menu.addEventListener('click',event=>event.stopPropagation());
  document.addEventListener('click',event=>{if(!menu.hidden&&!event.target.closest('#x1ComposerMenu')&&!event.target.closest('#x1ComposerPlus'))closeMenu()});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!menu.hidden){event.preventDefault();closeMenu({focusPlus:true});return}
    if(menu.hidden||!menu.contains(document.activeElement))return;
    const index=menuButtons.indexOf(document.activeElement);
    if(event.key==='ArrowDown'){event.preventDefault();menuButtons[(index+1+menuButtons.length)%menuButtons.length]?.focus()}
    if(event.key==='ArrowUp'){event.preventDefault();menuButtons[(index-1+menuButtons.length)%menuButtons.length]?.focus()}
  });

  function proxyClick(selector,unavailableMessage){
    const target=document.querySelector(selector);
    if(target){target.click();return true}
    if(unavailableMessage)setVoiceMessage(unavailableMessage,'error');
    return false;
  }
  document.getElementById('x1ComposerAddFiles')?.addEventListener('click',()=>{closeMenu();hiddenUpload?.click()});
  document.getElementById('x1ComposerKnowledge')?.addEventListener('click',()=>{closeMenu();proxyClick('#x1KnowledgeManager')});
  document.getElementById('x1ComposerOllama')?.addEventListener('click',()=>{closeMenu();proxyClick('#x1LocalLlmToggle')});
  document.getElementById('x1ComposerPython')?.addEventListener('click',()=>{closeMenu();proxyClick('#x1PythonEngineToggle','Advanced analytics is still initialising.')});
  document.getElementById('x1ComposerClear')?.addEventListener('click',()=>{closeMenu();proxyClick('#x1ClearConversation')});

  function cleanControlText(value,fallback){
    const text=String(value||'').replace(/\s+/g,' ').trim();
    return text||fallback;
  }
  function mirrorToolLabels(){
    const ollama=document.getElementById('x1LocalLlmToggle');
    const python=document.getElementById('x1PythonEngineToggle');
    const ollamaLabel=document.getElementById('x1ComposerOllamaLabel');
    const pythonLabel=document.getElementById('x1ComposerPythonLabel');
    if(ollamaLabel)ollamaLabel.textContent=cleanControlText(ollama?.textContent,'Advanced synthesis');
    if(pythonLabel)pythonLabel.textContent=cleanControlText(python?.textContent,'Advanced analytics');
  }
  const toolbar=document.querySelector('.x1-chat-toolbar-actions');
  if(toolbar){
    const observer=new MutationObserver(mirrorToolLabels);
    observer.observe(toolbar,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-pressed','class']});
  }
  mirrorToolLabels();
  setTimeout(mirrorToolLabels,250);
  setTimeout(mirrorToolLabels,1200);

  knowledgeUpload?.addEventListener('change',()=>{
    const count=knowledgeUpload.files?.length||0;
    if(count)setVoiceMessage(`${count} document${count===1?'':'s'} selected for analysis.`, 'success', 2600);
  });

  function updateSendState(){
    if(!send)return;
    const hasText=Boolean(prompt.value.trim());
    send.disabled=!hasText;
    send.setAttribute('aria-disabled',String(!hasText));
  }
  prompt.addEventListener('input',updateSendState);
  composer?.addEventListener('submit',()=>{if(listening)stopRecognition();setTimeout(updateSendState,0)});
  if(chatThread){
    const sendStateObserver=new MutationObserver(()=>queueMicrotask(updateSendState));
    sendStateObserver.observe(chatThread,{childList:true,subtree:true});
  }
  updateSendState();

  let messageTimer=0;
  function setVoiceMessage(message,state='idle',clearAfter=0){
    if(!voiceStatus)return;
    clearTimeout(messageTimer);
    voiceStatus.textContent=message||'';
    voiceStatus.classList.toggle('is-active',state==='active');
    voiceStatus.dataset.state=state;
    if(clearAfter)messageTimer=setTimeout(()=>{voiceStatus.textContent='';voiceStatus.classList.remove('is-active');voiceStatus.dataset.state='idle'},clearAfter);
  }

  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  let recognition=null;
  let listening=false;
  let speechBase='';
  let heardSpeech=false;
  let silenceTimer=0;
  let maximumTimer=0;

  function setListeningState(active){
    listening=active;
    if(!microphone)return;
    microphone.classList.toggle('is-listening',active);
    microphone.setAttribute('aria-pressed',String(active));
    microphone.setAttribute('aria-label',active?'Stop dictation':'Dictate a message');
    microphone.title=active?'Stop dictation':'Dictate a message';
    microphone.innerHTML=active?'<i class="fas fa-stop" aria-hidden="true"></i>':'<i class="fas fa-microphone" aria-hidden="true"></i>';
  }
  function clearSpeechTimers(){clearTimeout(silenceTimer);clearTimeout(maximumTimer)}
  function stopRecognition(){
    clearSpeechTimers();
    if(recognition&&listening){try{recognition.stop()}catch(error){setListeningState(false)}}
  }
  function combineSpeech(base,dictation){
    const left=String(base||'').trimEnd();
    const right=String(dictation||'').trim();
    if(!left)return right;
    if(!right)return left;
    return `${left} ${right}`;
  }
  function speechErrorMessage(code){
    const messages={
      'not-allowed':'Microphone permission was denied. Allow microphone access in the browser and try again.',
      'service-not-allowed':'Speech recognition is blocked by the browser or device policy.',
      'audio-capture':'No working microphone was found.',
      'no-speech':'No speech was detected. Select the microphone and try again.',
      'network':'The browser speech-recognition service is unavailable.',
      'aborted':'Dictation stopped.'
    };
    return messages[code]||'Speech recognition could not start.';
  }

  async function startRecognition(){
    if(!SpeechRecognition){
      setVoiceMessage('Speech-to-text is not supported by this browser. Use the latest Chrome or Edge.', 'error', 5200);
      return;
    }
    try{
      if(window.isSecureContext&&navigator.mediaDevices?.getUserMedia){
        const stream=await navigator.mediaDevices.getUserMedia({audio:true});
        stream.getTracks().forEach(track=>track.stop());
      }
    }catch(error){
      setVoiceMessage('Microphone permission was denied. Allow it in the browser address bar and try again.', 'error', 5200);
      return;
    }

    recognition=new SpeechRecognition();
    recognition.lang=document.documentElement.lang||navigator.language||'en-US';
    recognition.continuous=true;
    recognition.interimResults=true;
    recognition.maxAlternatives=1;
    speechBase=prompt.value;
    heardSpeech=false;

    recognition.onstart=()=>{
      setListeningState(true);
      setVoiceMessage('Listening… speak naturally. Select the microphone again to stop.', 'active');
      maximumTimer=setTimeout(stopRecognition,60000);
    };
    recognition.onresult=event=>{
      heardSpeech=true;
      let finalText='';
      let interimText='';
      for(let index=0;index<event.results.length;index++){
        const transcript=event.results[index][0]?.transcript||'';
        if(event.results[index].isFinal)finalText+=`${transcript} `;
        else interimText+=transcript;
      }
      prompt.value=combineSpeech(speechBase,`${finalText}${interimText}`);
      prompt.dispatchEvent(new Event('input',{bubbles:true}));
      prompt.focus();
      clearTimeout(silenceTimer);
      silenceTimer=setTimeout(stopRecognition,1900);
    };
    recognition.onerror=event=>{
      clearSpeechTimers();
      setListeningState(false);
      if(event.error!=='aborted'||!heardSpeech)setVoiceMessage(speechErrorMessage(event.error),'error',5200);
    };
    recognition.onend=()=>{
      clearSpeechTimers();
      const hadSpeech=heardSpeech;
      setListeningState(false);
      recognition=null;
      if(hadSpeech)setVoiceMessage('Dictation added to your message.', 'success', 2300);
      else if(!voiceStatus?.textContent)setVoiceMessage('Dictation stopped.', 'idle', 1600);
    };
    try{recognition.start()}catch(error){
      setListeningState(false);
      setVoiceMessage('Speech recognition is already active or could not start.', 'error', 4200);
    }
  }

  microphone?.addEventListener('click',()=>{if(listening)stopRecognition();else startRecognition()});
  window.addEventListener('x1:conversation-reset',event=>{
    if(listening)stopRecognition();
    closeMenu();
    prompt.value='';
    prompt.style.height='auto';
    prompt.dispatchEvent(new Event('input',{bubbles:true}));
    if(chatThread){chatThread.replaceChildren();chatThread.scrollTop=0;chatThread.removeAttribute('aria-busy');chatThread.dataset.x1Generation=String(event.detail?.generation??window.__x1ConversationGeneration??0)}
    const homePanel=document.querySelector('[data-x1-workspace-panel="home"]');
    document.querySelectorAll('[data-x1-workspace-panel]').forEach(panel=>{panel.hidden=panel!==homePanel});
    document.querySelectorAll('[data-x1-workspace-tab]').forEach(button=>button.classList.toggle('is-active',button.dataset.x1WorkspaceTab==='home'));
    [homePanel?.querySelector('.x1-chatgpt-intro'),homePanel?.querySelector('.x1-composer-wrap'),homePanel?.querySelector('.x1-brain-suggestions')].forEach(element=>{
      if(!element)return;
      element.hidden=false;
      element.removeAttribute('aria-hidden');
      element.style.removeProperty('display');
      element.style.removeProperty('visibility');
      element.style.removeProperty('opacity');
    });
    setVoiceMessage('','idle');
    updateSendState();
  });
  window.addEventListener('beforeunload',()=>{if(recognition){try{recognition.abort()}catch(error){}}});
})();



/* ============================== Inline script 25 ============================== */

(()=>{
  const root=document.documentElement;
  const body=document.body;
  const trigger=document.getElementById('developmentsTrigger');
  const dropdown=document.getElementById('developmentsDropdown');
  const store=document.getElementById('developmentsStoreView');
  const workspace=document.getElementById('x1AppWorkspace');
  const upload=document.getElementById('x1KnowledgeUpload');
  const prompt=document.getElementById('x1PromptInput');
  if(!body||!dropdown||!workspace)return;

  let uploadActive=false;
  let uploadStartedAt=0;
  let uploadSawSelection=false;
  let uploadPoll=0;
  let restoring=false;

  const panels=()=>[...document.querySelectorAll('[data-x1-workspace-panel]')];
  const tabs=()=>[...document.querySelectorAll('[data-x1-workspace-tab]')];
  const isLocked=()=>body.classList.contains('x1-session-locked');

  function setDevelopmentsOpen(){
    if(trigger?.getAttribute('aria-expanded')!=='true')trigger.setAttribute('aria-expanded','true');
    if(trigger&&!trigger.classList.contains('is-active'))trigger.classList.add('is-active');
    const quickActions=trigger?.closest('.quick-actions');
    if(quickActions&&!quickActions.classList.contains('developments-open'))quickActions.classList.add('developments-open');
    if(!root.classList.contains('developments-menu-open'))root.classList.add('developments-menu-open');
    if(!body.classList.contains('developments-menu-open'))body.classList.add('developments-menu-open');
    if(dropdown.hidden)dropdown.hidden=false;
    if(dropdown.getAttribute('aria-hidden')!=='false')dropdown.setAttribute('aria-hidden','false');
    const requiredStyles={height:'100dvh','max-height':'none',top:'0px',bottom:'0px'};
    Object.entries(requiredStyles).forEach(([property,value])=>{
      const current=dropdown.style.getPropertyValue(property).trim();
      const normalised=current==='0'?'0px':current;
      if(normalised!==value||dropdown.style.getPropertyPriority(property)!=='important')dropdown.style.setProperty(property,value,'important');
    });
  }

  function showFinancialAssistant({focus=false}={}){
    if(store&&!store.hidden)store.hidden=true;
    if(workspace.hidden)workspace.hidden=false;
    panels().forEach(panel=>{const shouldHide=panel.dataset.x1WorkspacePanel!=='home';if(panel.hidden!==shouldHide)panel.hidden=shouldHide});
    tabs().forEach(tab=>{const active=tab.dataset.x1WorkspaceTab==='home';if(tab.classList.contains('is-active')!==active)tab.classList.toggle('is-active',active)});
    document.querySelectorAll('[data-x1-open-workflow].is-active').forEach(button=>button.classList.remove('is-active'));
    if(focus)setTimeout(()=>prompt?.focus({preventScroll:true}),0);
  }

  function lockSession({home=false,focus=false}={}){
    body.classList.add('x1-session-locked');
    root.classList.add('x1-session-locked');
    setDevelopmentsOpen();
    if(home)showFinancialAssistant({focus});
    else{
      if(store&&!store.hidden)store.hidden=true;
      if(workspace.hidden)workspace.hidden=false;
    }
  }

  function unlockSession(){
    uploadActive=false;
    uploadSawSelection=false;
    body.classList.remove('x1-session-locked','x1-document-upload-active');
    root.classList.remove('x1-session-locked');
    if(uploadPoll){clearInterval(uploadPoll);uploadPoll=0}
  }

  function restoreLockedState(){
    if(!isLocked()||restoring)return;
    restoring=true;
    try{
      setDevelopmentsOpen();
      if(store&&!store.hidden)store.hidden=true;
      if(workspace.hidden)workspace.hidden=false;
      if(uploadActive)showFinancialAssistant();
    }finally{restoring=false}
  }

  function endUploadLock(){
    uploadActive=false;
    uploadSawSelection=false;
    body.classList.remove('x1-document-upload-active');
    if(uploadPoll){clearInterval(uploadPoll);uploadPoll=0}
    restoreLockedState();
    setTimeout(()=>prompt?.focus({preventScroll:true}),80);
  }

  function beginUploadLock({selected=false}={}){
    uploadActive=true;
    uploadSawSelection=uploadSawSelection||selected;
    uploadStartedAt=Date.now();
    body.classList.add('x1-document-upload-active');
    lockSession({home:true});
    if(uploadPoll)clearInterval(uploadPoll);
    uploadPoll=setInterval(()=>{
      restoreLockedState();
      const elapsed=Date.now()-uploadStartedAt;
      /* The existing importer clears the file-input value only after all files finish processing. */
      if(uploadSawSelection&&upload&&upload.value===''&&elapsed>900){endUploadLock();return}
      if(elapsed>120000)endUploadLock();
    },250);
  }

  /* Opening X1 starts a persistent session. */
  document.querySelectorAll('[data-open-x1-app]').forEach(button=>button.addEventListener('click',()=>{
    lockSession({home:true});
    setTimeout(()=>lockSession({home:true}),0);
  },true));
  document.querySelector('.dev-app-card.is-available')?.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){lockSession({home:true});setTimeout(()=>lockSession({home:true}),0)}
  },true);

  /* These controls are the explicit ways a user can leave or switch away. */
  document.getElementById('x1BackToApps')?.addEventListener('click',unlockSession,true);
  document.getElementById('developmentsClose')?.addEventListener('click',unlockSession,true);
  trigger?.addEventListener('click',()=>{if(trigger.getAttribute('aria-expanded')==='true')unlockSession()},true);
  ['globalInnovationNewsTrigger','securityWindowTrigger','findatCloudTrigger'].forEach(id=>document.getElementById(id)?.addEventListener('click',unlockSession,true));

  /* Add-files always runs inside the Financial Assistant, not the app catalogue or website home. */
  ['x1ComposerAddFiles','x1ComposerUpload','x1KbAddDocuments'].forEach(id=>{
    document.getElementById(id)?.addEventListener('click',()=>beginUploadLock(),true);
  });

  if(upload){
    /* Critical root-cause fix: this hidden input lives outside the Developments panel.
       Stop its synthetic click from being interpreted as an outside click. */
    upload.addEventListener('click',event=>{
      beginUploadLock();
      event.stopPropagation();
    });
    upload.addEventListener('change',()=>{
      if(upload.files?.length)beginUploadLock({selected:true});
      else endUploadLock();
    },true);
  }

  /* File dialogs temporarily remove focus. Refocus X1 rather than allowing a menu reset. */
  window.addEventListener('focus',()=>{
    if(uploadActive){setTimeout(()=>restoreLockedState(),0);setTimeout(()=>restoreLockedState(),350)}
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&uploadActive)restoreLockedState()});

  /* Brute-force guard against any legacy script that toggles hidden/classes while X1 is active. */
  let restoreQueued=false;
  const observer=new MutationObserver(()=>{
    if(!isLocked()||restoreQueued)return;
    restoreQueued=true;
    queueMicrotask(()=>{restoreQueued=false;restoreLockedState()});
  });
  observer.observe(dropdown,{attributes:true,attributeFilter:['hidden','aria-hidden']});
  observer.observe(workspace,{attributes:true,attributeFilter:['hidden']});
  if(store)observer.observe(store,{attributes:true,attributeFilter:['hidden']});

  /* Preserve normal workspace navigation. Only uploads force the Home/Financial Assistant panel. */
  document.addEventListener('click',event=>{
    const tab=event.target.closest?.('[data-x1-workspace-tab]');
    if(tab&&isLocked()&&!uploadActive)setTimeout(restoreLockedState,0);
  },true);

  if(!workspace.hidden)lockSession();
  window.X1PersistentSession={lock:lockSession,unlock:unlockSession,financialAssistant:()=>lockSession({home:true,focus:true}),isLocked};
})();



/* ============================== Inline script 26 ============================== */

(()=>{
      const gallery=document.getElementById('programmeMotionGallery');
      if(!gallery) return;

      const photos=[
        {url:'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1100&q=82',alt:'Contemporary collaborative office interior',source:'Unsplash'},
        {url:'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1100',alt:'Professionals collaborating around a workplace table',source:'Pexels'},
        {url:'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1100&q=82',alt:'Modern city architecture and business district',source:'Unsplash'},
        {url:'https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg?auto=compress&cs=tinysrgb&w=1100',alt:'City skyline and urban buildings',source:'Pexels'},
        {url:'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1100&q=82',alt:'Diverse team working together',source:'Unsplash'},
        {url:'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=1100',alt:'Business team meeting in a bright office',source:'Pexels'},
        {url:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1100&q=82',alt:'Community gathering and shared culture',source:'Unsplash'},
        {url:'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1100',alt:'Food and cultural gathering',source:'Pexels'},
        {url:'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1100&q=82',alt:'Large modern city viewed from above',source:'Unsplash'},
        {url:'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=1100',alt:'Creative workplace discussion',source:'Pexels'},
        {url:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1100&q=82',alt:'Open-plan office and work tables',source:'Unsplash'},
        {url:'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=1100',alt:'Colourful cultural textiles and craft',source:'Pexels'}
      ];

      const tiles=[...gallery.querySelectorAll('.motion-photo')];
      if(!tiles.length) return;
      const shuffled=[...photos].sort(()=>Math.random()-.5);
      const currentByTile=new Map();
      let activeAnimations=0;

      const assignInitial=(tile,index)=>{
        const photo=shuffled[index%shuffled.length];
        const img=tile.querySelector('.motion-current');
        img.src=photo.url;
        img.alt=photo.alt;
        img.dataset.source=photo.source;
        currentByTile.set(tile,photos.indexOf(photo));
      };

      const pickNextIndex=tile=>{
        const current=currentByTile.get(tile);
        const visible=new Set([...currentByTile.values()]);
        const candidates=photos.map((_,i)=>i).filter(i=>i!==current&&!visible.has(i));
        const pool=candidates.length?candidates:photos.map((_,i)=>i).filter(i=>i!==current);
        return pool[Math.floor(Math.random()*pool.length)];
      };

      const changePhoto=tile=>{
        if(document.hidden||tile.classList.contains('is-animating')||activeAnimations>2) return false;
        const current=tile.querySelector('.motion-current');
        const next=tile.querySelector('.motion-next');
        const nextIndex=pickNextIndex(tile);
        const photo=photos[nextIndex];
        activeAnimations++;
        let started=false;

        const finish=()=>{
          tile.classList.add('is-resetting');
          current.src=photo.url;
          current.alt=photo.alt;
          current.dataset.source=photo.source;
          currentByTile.set(tile,nextIndex);
          tile.classList.remove('is-animating');
          next.removeAttribute('src');
          next.alt='';
          requestAnimationFrame(()=>requestAnimationFrame(()=>tile.classList.remove('is-resetting')));
          activeAnimations=Math.max(0,activeAnimations-1);
        };

        const start=()=>{
          if(started) return;
          started=true;
          next.onload=null;
          next.onerror=null;
          requestAnimationFrame(()=>tile.classList.add('is-animating'));
          window.setTimeout(finish,1200);
        };

        next.alt=photo.alt;
        next.onload=start;
        next.onerror=()=>{
          if(started) return;
          started=true;
          next.onload=null;
          next.onerror=null;
          next.removeAttribute('src');
          activeAnimations=Math.max(0,activeAnimations-1);
        };
        next.src=photo.url;
        if(next.complete&&next.naturalWidth) start();
        return true;
      };

      const schedule=tile=>{
        const delay=3900+Math.random()*3600;
        window.setTimeout(()=>{
          changePhoto(tile);
          schedule(tile);
        },delay);
      };

      tiles.forEach((tile,index)=>{
        assignInitial(tile,index);
        window.setTimeout(()=>schedule(tile),900+index*850);
      });
    })();

/* ============================== FINDAT Cloud integration ============================== */
(()=>{
  const trigger=document.getElementById('findatCloudTrigger');
  const dropdown=document.getElementById('findatCloudDropdown');
  const frame=document.getElementById('findatCloudFrame');
  const quickActions=trigger?.closest('.quick-actions');
  const otherTriggers=['globalInnovationNewsTrigger','securityWindowTrigger','developmentsTrigger']
    .map(id=>document.getElementById(id)).filter(Boolean);
  if(!trigger||!dropdown||!quickActions)return;

  const setOpen=(open,{returnFocus=false}={})=>{
    if(open){
      otherTriggers.forEach(item=>{
        if(item.getAttribute('aria-expanded')==='true')item.click();
      });
    }
    trigger.setAttribute('aria-expanded',String(open));
    trigger.classList.toggle('is-active',open);
    quickActions.classList.toggle('cloud-workspace-open',open);
    document.body.classList.toggle('cloud-workspace-menu-open',open);
    dropdown.hidden=!open;
    dropdown.setAttribute('aria-hidden',String(!open));
    if(open){
      window.requestAnimationFrame(()=>frame?.focus({preventScroll:true}));
    }else if(returnFocus){
      trigger.focus({preventScroll:true});
    }
  };

  trigger.addEventListener('click',event=>{
    event.preventDefault();
    const open=trigger.getAttribute('aria-expanded')!=='true';
    setOpen(open,{returnFocus:!open});
  });

  otherTriggers.forEach(item=>item.addEventListener('click',()=>{
    if(trigger.getAttribute('aria-expanded')==='true')setOpen(false);
  }));

  document.addEventListener('click',event=>{
    if(trigger.getAttribute('aria-expanded')==='true'&&!quickActions.contains(event.target))setOpen(false);
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&trigger.getAttribute('aria-expanded')==='true')setOpen(false,{returnFocus:true});
  });

  const connectFrameControls=()=>{
    try{
      const frameDocument=frame?.contentDocument;
      frameDocument?.addEventListener('keydown',event=>{
        if(event.key==='Escape')setOpen(false,{returnFocus:true});
      });
    }catch(error){
      console.warn('FINDAT Cloud frame controls could not be connected.',error);
    }
  };
  frame?.addEventListener('load',connectFrameControls);

  window.addEventListener('message',event=>{
    if(event.source!==frame?.contentWindow)return;
    if(event.data?.type==='findat-cloud:exit')setOpen(false,{returnFocus:true});
  });
})();


/* ============================== Course catalogue, Administrator course studio and profile editor ============================== */
(()=>{
  'use strict';
  const config=window.FINDAT_AUTH_CONFIG||{};
  const supabaseUrl=String(config.supabaseUrl||'');
  const supabaseKey=String(config.publishableKey||config.anonKey||'');
  if(!window.supabase?.createClient||!supabaseUrl||!supabaseKey)return;
  const sharedStorage={
    getItem(key){return sessionStorage.getItem(key)||localStorage.getItem(key)},
    setItem(key,value){localStorage.setItem(key,value)},
    removeItem(key){localStorage.removeItem(key);sessionStorage.removeItem(key)}
  };
  const client=window.FINDAT_SUPABASE_CLIENT||window.supabase.createClient(supabaseUrl,supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storage:sharedStorage,storageKey:'findat-auth-v1'}});
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const escapeHTML=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const safeUrl=value=>/^https?:\/\//i.test(String(value||''))||/^blob:/i.test(String(value||''))||/^Classes\//.test(String(value||''))?String(value):'';
  async function resolveCourseMedia(value){
    const raw=String(value||'');
    if(!raw)return'';
    if(safeUrl(raw))return raw;
    if(!raw.startsWith('course-media://'))return'';
    const path=raw.slice('course-media://'.length);
    const {data,error}=await client.storage.from('findat-course-media').createSignedUrl(path,3600);
    if(error)return'';
    return data?.signedUrl||''
  }
  async function resolveCourseRecord(course){return{...course,cover_url:await resolveCourseMedia(course.cover_url)}}
  async function resolveLessonRecord(lesson){
    const documents=await Promise.all((Array.isArray(lesson.documents)?lesson.documents:[]).map(async doc=>({...doc,url:await resolveCourseMedia(doc.url)})));
    return{...lesson,video_url:await resolveCourseMedia(lesson.video_url),thumbnail_url:await resolveCourseMedia(lesson.thumbnail_url),documents}
  }
  const protectedPoster=window[String.fromCharCode(95,95,70,73,78,68,65,84,95,80,82,79,84,69,67,84,69,68,95,80,79,83,84,69,82,95,95)]||'Classes/Data-Thumbnail.jpg';
  const recordingsMain=$('#recordingsMain');
  const courseGrid=$('#findatCourseCardGrid');
  const dynamicCourse=$('#findatDynamicCourse');
  const legacyHeading=$('.recordings-heading',recordingsMain);
  const legacyLayout=$('.recordings-course-layout',recordingsMain);
  const toolbarTitle=$('.recordings-toolbar-title strong');
  const toolbarProgress=$('.recordings-toolbar-progress');
  let catalogueCourses=[];
  let selectedCourse=null;
  let selectedLesson=null;
  let managerCourses=[];
  let managerLessons=[];
  let managerCourseId='';
  let managerLessonId='';
  let courseCoverFile=null;
  let lessonVideoFile=null;
  let lessonThumbnailFile=null;
  let lessonDocumentFiles=[];
  let quizDraft=[];
  window.FINDAT_COURSE_CATALOGUE=[];

  function stars(rating=5){
    const rounded=Math.max(0,Math.min(5,Number(rating)||0));
    return `${[0,1,2,3,4].map(index=>`<i class="${index+1<=Math.round(rounded)?'fas':'far'} fa-star" aria-hidden="true"></i>`).join('')}<small>${rounded.toFixed(1)}</small>`
  }
  function slugify(value){return String(value||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,150)||`course-${Date.now()}`}
  function fileNameSafe(value){return String(value||'file').replace(/[^A-Za-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(-120)||'file'}
  function showCourseStatus(message,state=''){
    const host=$('#fdCourseManagerStatus');if(!host)return;host.textContent=message||'';host.className=`auth-status${state?` ${state}`:''}`
  }
  async function currentSession(){const{data}=await client.auth.getSession();return data?.session||null}
  async function currentProfile(){const session=await currentSession();if(!session?.user)return null;const{data,error}=await client.from('findat_profiles').select('*').eq('id',session.user.id).maybeSingle();if(error)throw error;return data}

  function showCatalog(){
    if(!recordingsMain)return;
    recordingsMain.classList.add('is-catalog-mode');recordingsMain.classList.remove('is-dynamic-mode');
    if(dynamicCourse)dynamicCourse.hidden=true;
    if(toolbarTitle)toolbarTitle.textContent='FINDAT Academy Courses';
    if(toolbarProgress)toolbarProgress.hidden=true;
    selectedCourse=null;selectedLesson=null;window.FINDAT_SELECTED_COURSE=null;
    const video=$('#findatDynamicVideo');if(video){video.pause();video.removeAttribute('src');video.load()}
    loadCatalogue().catch(error=>console.warn('FINDAT course catalogue unavailable',error))
  }
  function showLegacyCourse(){
    if(!recordingsMain)return;
    selectedCourse=catalogueCourses.find(item=>item.slug==='data-analytics-foundations'||item.is_builtin)||null;window.FINDAT_SELECTED_COURSE=selectedCourse;
    recordingsMain.classList.remove('is-catalog-mode','is-dynamic-mode');
    if(dynamicCourse)dynamicCourse.hidden=true;
    if(legacyHeading)legacyHeading.hidden=false;if(legacyLayout)legacyLayout.hidden=false;
    if(toolbarTitle)toolbarTitle.textContent='Data Analytics Foundations';
    if(toolbarProgress)toolbarProgress.hidden=false;
    const poster=$('#startRecordingLesson');
    const video=$('#findatRecordingPlayer');
    if(protectedPoster){
      if(video)video.poster='Classes/Data-Thumbnail.jpg';
      if(poster){poster.classList.add('has-thumbnail');poster.style.backgroundImage=`linear-gradient(90deg,rgba(8,13,22,.92),rgba(8,13,22,.58) 52%,rgba(8,13,22,.14)),url("Classes/Data-Thumbnail.jpg")`}
    }
    recordingsMain.scrollIntoView({block:'start'})
  }
  function showDynamicCourse(course){
    selectedCourse=course;window.FINDAT_SELECTED_COURSE=course;
    recordingsMain?.classList.remove('is-catalog-mode');recordingsMain?.classList.add('is-dynamic-mode');
    if(dynamicCourse)dynamicCourse.hidden=false;
    if(toolbarTitle)toolbarTitle.textContent=course.title||'FINDAT course';
    if(toolbarProgress)toolbarProgress.hidden=true;
    const cover=$('#findatDynamicCourseCover');
    const coverUrl=safeUrl(course.cover_url)||'';
    if(cover){cover.style.backgroundImage=coverUrl?`url("${coverUrl}")`:'';cover.innerHTML=coverUrl?'':'<i class="fas fa-graduation-cap"></i>'}
    $('#findatDynamicCourseTitle').textContent=course.title||'Course';
    $('#findatDynamicCourseDescription').textContent=course.short_description||course.course_content||'';
    $('#findatDynamicCourseRating').innerHTML=stars(course.rating);
    $('#findatDynamicCourseInstructor').textContent=[course.instructor_name,course.instructor_qualifications].filter(Boolean).join(' — ');
    renderDynamicLessonList(course.lessons||[]);
    if(course.lessons?.length)openDynamicLesson(course.lessons[0]);else openDynamicLesson(null);
    recordingsMain?.scrollIntoView({block:'start'})
  }
  function renderCourseCards(){
    window.FINDAT_COURSE_CATALOGUE=catalogueCourses;
    if(!courseGrid)return;
    if(!catalogueCourses.length){courseGrid.innerHTML='<div class="fd-course-manager-empty">No published courses are available yet.</div>';return}
    courseGrid.innerHTML=catalogueCourses.map(course=>{
      const builtIn=course.slug==='data-analytics-foundations'||course.is_builtin;
      const cover=builtIn?'Classes/Data-Thumbnail.jpg':safeUrl(course.cover_url);
      const lessonCount=course.lessons?.length||0;
      return `<article class="findat-course-card" data-course-id="${course.id}"><div class="findat-course-card-cover" ${cover?`style="background-image:url('${escapeHTML(cover)}')"`:''}><span><i class="fas fa-play-circle"></i>${lessonCount} lesson${lessonCount===1?'':'s'}</span><b class="fd-course-price-badge ${course.is_free!==false||Number(course.price_amount||0)===0?'is-free':'is-paid'}">${course.is_free!==false||Number(course.price_amount||0)===0?'Free':`${escapeHTML(course.currency||'ZMW')} ${Number(course.price_amount||0).toFixed(2)}`}</b></div><div class="findat-course-card-body"><h3>${escapeHTML(course.title)}</h3><p>${escapeHTML(course.short_description||course.course_content||'FINDAT Academy course')}</p><div class="findat-course-card-meta"><span class="findat-course-rating">${stars(course.rating)}</span><span>${escapeHTML(course.instructor_name||'FINDAT Academy')}</span></div><small class="fd-course-access-period"><i class="far fa-clock"></i> ${Math.max(1,Number(course.access_months)||1)} month access</small><button class="findat-course-card-button" data-course-open="${course.id}" type="button">${course.is_free!==false||Number(course.price_amount||0)===0?'Open course':'Request access'}</button></div></article>`
    }).join('')
  }
  async function loadCatalogue(){
    if(courseGrid)courseGrid.innerHTML='<article class="findat-course-card is-loading"><div class="findat-course-card-cover"><span><i class="fas fa-spinner fa-spin"></i></span></div><div class="findat-course-card-body"><h3>Loading courses…</h3><p>Preparing the FINDAT Academy catalogue.</p></div></article>';
    const coursesResult=await client.from('findat_courses').select('*').eq('status','published').order('updated_at',{ascending:false});
    if(coursesResult.error){
      catalogueCourses=[{id:'legacy-data-analytics',slug:'data-analytics-foundations',title:'Data Analytics Foundations',short_description:'Learn how data analytics supports evidence-based decisions across professional domains.',instructor_name:'FINDAT Academy',instructor_qualifications:'Data Analytics | Research | Professional Practice',rating:5,is_builtin:true,is_free:true,price_amount:0,currency:'ZMW',access_months:1,lessons:[{id:'legacy-lesson',title:'Built-in lesson'}]}];
      renderCourseCards();return
    }
    const lessonsResult=await client.from('findat_course_lessons').select('*').eq('is_published',true).order('position',{ascending:true});
    const rawLessons=lessonsResult.error?[]:lessonsResult.data||[];
    const [resolvedCourses,resolvedLessons]=await Promise.all([
      Promise.all((coursesResult.data||[]).map(resolveCourseRecord)),
      Promise.all(rawLessons.map(resolveLessonRecord))
    ]);
    catalogueCourses=resolvedCourses.map(course=>({...course,lessons:resolvedLessons.filter(lesson=>lesson.course_id===course.id)}));
    renderCourseCards()
  }
  function renderDynamicLessonList(lessons){
    const host=$('#findatDynamicLessonList');if(!host)return;
    host.innerHTML=lessons.length?lessons.map(lesson=>{const thumb=safeUrl(lesson.thumbnail_url);return `<button class="findat-dynamic-lesson-button" data-dynamic-lesson="${lesson.id}" type="button"><span class="findat-dynamic-lesson-thumb" ${thumb?`style="background-image:url('${escapeHTML(thumb)}')"`:''}>${thumb?'':'<i class="fas fa-play"></i>'}</span><span><strong>${escapeHTML(lesson.title)}</strong><small>Lesson ${Number(lesson.position)||1}${lesson.duration_seconds?` · ${Math.ceil(lesson.duration_seconds/60)} min`:''}</small></span></button>`}).join(''):'<div class="fd-course-manager-empty">This course has no published lessons yet.</div>'
  }
  function openDynamicLesson(lesson){
    selectedLesson=lesson;
    $$('.findat-dynamic-lesson-button').forEach(button=>button.classList.toggle('is-active',button.dataset.dynamicLesson===lesson?.id));
    const video=$('#findatDynamicVideo'),empty=$('#findatDynamicVideoEmpty'),videoUrl=safeUrl(lesson?.video_url),thumb=safeUrl(lesson?.thumbnail_url);
    if(video){video.pause();if(videoUrl){video.src=videoUrl;video.poster=thumb||'';video.load();if(empty)empty.hidden=true}else{video.removeAttribute('src');video.poster=thumb||'';video.load();if(empty){empty.hidden=false;empty.innerHTML='<i class="fas fa-file-alt"></i><span>This lesson has no video. Use the content, script or documents tabs.</span>'}}}
    $('#findatDynamicLessonTitle').textContent=lesson?.title||'Select a lesson';
    $('#findatDynamicLessonSummary').textContent=lesson?.summary||'';
    $('#findatDynamicLessonContent').innerHTML=lesson?`<p>${escapeHTML(lesson.lesson_content||lesson.summary||'No lesson content was provided.').replace(/\n/g,'</p><p>')}</p>`:'<p>Select a lesson from the list.</p>';
    $('#findatDynamicLessonScript').innerHTML=lesson?.lesson_script?`<pre>${escapeHTML(lesson.lesson_script)}</pre>`:'<p>No lesson script was provided.</p>';
    const docs=Array.isArray(lesson?.documents)?lesson.documents:[];
    $('#findatDynamicLessonDocuments').innerHTML=docs.length?`<div class="findat-dynamic-doc-list">${docs.map(doc=>`<a href="${escapeHTML(safeUrl(doc.url))}" target="_blank" rel="noopener"><i class="fas fa-file-download"></i><span>${escapeHTML(doc.name||'Course document')}</span></a>`).join('')}</div>`:'<p>No lesson documents were provided.</p>';
    renderDynamicQuiz(Array.isArray(lesson?.quiz)?lesson.quiz:[])
  }
  function renderDynamicQuiz(quiz){
    const host=$('#findatDynamicLessonQuiz');if(!host)return;
    if(!quiz.length){host.innerHTML='<p>No quiz was added to this lesson.</p>';return}
    host.innerHTML=`<form class="findat-course-quiz" id="findatDynamicQuizForm">${quiz.map((question,index)=>`<fieldset class="findat-course-quiz-question"><strong>${index+1}. ${escapeHTML(question.question||'Question')}</strong>${(question.options||[]).map((option,optionIndex)=>`<label class="findat-course-quiz-option"><input type="radio" name="q${index}" value="${optionIndex}"><span>${escapeHTML(option)}</span></label>`).join('')}</fieldset>`).join('')}<button class="fd-primary-btn" type="submit"><i class="fas fa-check"></i> Check answers</button><div class="findat-course-quiz-result" id="findatDynamicQuizResult"></div></form>`;
    $('#findatDynamicQuizForm')?.addEventListener('submit',async event=>{event.preventDefault();let score=0;quiz.forEach((question,index)=>{const selected=event.currentTarget.querySelector(`input[name="q${index}"]:checked`);if(selected&&Number(selected.value)===Number(question.correct))score++});const percent=Math.round(score/quiz.length*100);$('#findatDynamicQuizResult').textContent=`Score: ${score} / ${quiz.length} (${percent}%).`;if(selectedCourse?.id&&!String(selectedCourse.id).startsWith('legacy-')){const progress=await client.rpc('findat_update_course_progress',{p_course_id:selectedCourse.id,p_percent:percent});if(progress.error)console.warn('Course progress update failed',progress.error)}})
  }

  function openCourse(course){if(!course)return;if(course.slug==='data-analytics-foundations'||course.is_builtin)showLegacyCourse();else showDynamicCourse(course)}
  window.FINDAT_OPEN_COURSE=openCourse;
  courseGrid?.addEventListener('click',event=>{
    const button=event.target.closest('[data-course-open]');if(!button)return;
    const course=catalogueCourses.find(item=>String(item.id)===String(button.dataset.courseOpen));if(!course)return;
    openCourse(course)
  });
  $('#findatLegacyCourseBack')?.addEventListener('click',showCatalog);
  $('#findatDynamicCourseBack')?.addEventListener('click',showCatalog);
  $('#closeRecordings')?.addEventListener('click',()=>setTimeout(showCatalog,0));
  document.querySelectorAll('a[href="#recordings"]').forEach(link=>link.addEventListener('click',()=>setTimeout(showCatalog,0)));
  if(location.hash==='#recordings')setTimeout(showCatalog,100);
  $$('.findat-dynamic-tabs button').forEach(button=>button.addEventListener('click',()=>{
    const name=button.dataset.dynamicCourseTab;
    $$('.findat-dynamic-tabs button').forEach(item=>item.classList.toggle('is-active',item===button));
    $$('[data-dynamic-course-panel]').forEach(panel=>{const active=panel.dataset.dynamicCoursePanel===name;panel.classList.toggle('is-active',active);panel.hidden=!active})
  }));
  $('#findatDynamicLessonList')?.addEventListener('click',event=>{const button=event.target.closest('[data-dynamic-lesson]');if(!button||!selectedCourse)return;openDynamicLesson((selectedCourse.lessons||[]).find(item=>item.id===button.dataset.dynamicLesson)||null)});

  // ---------------------------------------------------------------------------
  // Professional profile editing
  // ---------------------------------------------------------------------------
  async function populateProfileForm(){
    const form=$('#fdProfessionalProfileForm');if(!form)return;
    try{const profile=await currentProfile();if(!profile)return;form.elements.firstName.value=profile.first_name||'';form.elements.lastName.value=profile.last_name||'';form.elements.phone.value=profile.phone||'';form.elements.organisation.value=profile.organisation||'';form.elements.country.value=profile.country||'';form.elements.qualifications.value=profile.qualifications||'';form.elements.jobTitle.value=profile.job_title||'';form.elements.placeOfWork.value=profile.place_of_work||''}
    catch(error){const status=$('#fdProfilePhotoStatus');if(status){status.textContent=error.message||'Profile details could not be loaded.';status.className='auth-status error'}}
  }
  $('#fdUserProfileButton')?.addEventListener('click',()=>setTimeout(populateProfileForm,30));
  $('#fdProfessionalProfileForm')?.addEventListener('submit',async event=>{
    event.preventDefault();const form=event.currentTarget,status=$('#fdProfilePhotoStatus'),button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;if(status){status.textContent='Saving professional profile…';status.className='auth-status'}
    try{const values=Object.fromEntries(new FormData(form).entries());const{data,error}=await client.rpc('findat_update_own_profile',{p_first_name:String(values.firstName||'').trim(),p_last_name:String(values.lastName||'').trim(),p_phone:String(values.phone||'').trim(),p_organisation:String(values.organisation||'').trim(),p_country:String(values.country||'').trim(),p_qualifications:String(values.qualifications||'').trim(),p_job_title:String(values.jobTitle||'').trim(),p_place_of_work:String(values.placeOfWork||'').trim()});if(error)throw error;const row=Array.isArray(data)?data[0]:data;window.dispatchEvent(new CustomEvent('findat-profile-updated',{detail:{displayName:`${row?.first_name||values.firstName} ${row?.last_name||values.lastName}`.trim(),firstName:row?.first_name||values.firstName,lastName:row?.last_name||values.lastName,phone:row?.phone||values.phone,organisation:row?.organisation||values.organisation,country:row?.country||values.country,qualifications:row?.qualifications||values.qualifications,jobTitle:row?.job_title||values.jobTitle,placeOfWork:row?.place_of_work||values.placeOfWork}}));if(status){status.textContent='Profile saved. Updated names and qualifications will appear in collaboration and article bylines.';status.className='auth-status success'}window.toggleModal?.('fdProfilePhotoModal',false)}catch(error){if(status){status.textContent=error.message||'The profile could not be saved.';status.className='auth-status error'}}finally{if(button)button.disabled=false}
  });

  // ---------------------------------------------------------------------------
  // Administrator course studio
  // ---------------------------------------------------------------------------
  async function requireAdmin(){const profile=await currentProfile();if(!profile||String(profile.role)!=='admin'||profile.active===false)throw new Error('Administrator privileges are required.');return profile}
  function resetCourseForm(){
    const form=$('#fdCourseForm');if(!form)return;form.reset();form.elements.id.value='';form.elements.rating.value='5';form.elements.status.value='draft';if(form.elements.isFree)form.elements.isFree.value='true';if(form.elements.priceAmount)form.elements.priceAmount.value='0';if(form.elements.currency)form.elements.currency.value='ZMW';if(form.elements.accessMonths)form.elements.accessMonths.value='1';managerCourseId='';courseCoverFile=null;$('#fdCourseCoverName').textContent='No picture selected';renderManagerCourseList();resetLessonForm();renderManagerLessonList()
  }
  function resetLessonForm(){const form=$('#fdLessonForm');if(!form)return;form.reset();form.elements.id.value='';form.elements.courseId.value=managerCourseId||'';form.elements.position.value=String((managerLessons.length||0)+1);managerLessonId='';lessonVideoFile=null;lessonThumbnailFile=null;lessonDocumentFiles=[];quizDraft=[];renderQuizDraft();$('#fdLessonUploadSummary').textContent='No lesson media selected.'}
  async function loadManagerData(selectCourseId=''){
    await requireAdmin();showCourseStatus('Loading courses…');
    const [coursesResult,lessonsResult]=await Promise.all([client.from('findat_courses').select('*').order('updated_at',{ascending:false}),client.from('findat_course_lessons').select('*').order('position',{ascending:true})]);
    if(coursesResult.error)throw coursesResult.error;if(lessonsResult.error)throw lessonsResult.error;
    managerCourses=coursesResult.data||[];managerLessons=lessonsResult.data||[];$('#fdCourseNavCount').textContent=String(managerCourses.length);renderManagerCourseList();
    const target=managerCourses.find(item=>item.id===(selectCourseId||managerCourseId))||managerCourses[0];if(target)selectManagerCourse(target.id);else resetCourseForm();showCourseStatus('')
  }
  function renderManagerCourseList(){const host=$('#fdCourseManagerList');if(!host)return;host.innerHTML=managerCourses.length?managerCourses.map(course=>`<button class="fd-course-manager-item ${course.id===managerCourseId?'is-active':''}" data-manager-course="${course.id}" type="button"><strong>${escapeHTML(course.title)}</strong><small>${escapeHTML(course.status)} · ${Number(course.rating||0).toFixed(1)} stars</small></button>`).join(''):'<div class="fd-course-manager-empty">No courses yet. Click New to create one.</div>'}
  function selectManagerCourse(id){const course=managerCourses.find(item=>item.id===id);if(!course)return;managerCourseId=id;const form=$('#fdCourseForm');form.elements.id.value=course.id;form.elements.title.value=course.title||'';form.elements.slug.value=course.slug||'';form.elements.shortDescription.value=course.short_description||'';form.elements.courseContent.value=course.course_content||'';form.elements.instructorName.value=course.instructor_name||'';form.elements.instructorQualifications.value=course.instructor_qualifications||'';form.elements.rating.value=String(course.rating||5);form.elements.status.value=course.status||'draft';if(form.elements.isFree)form.elements.isFree.value=String(course.is_free!==false);if(form.elements.priceAmount)form.elements.priceAmount.value=String(course.price_amount||0);if(form.elements.currency)form.elements.currency.value=course.currency||'ZMW';if(form.elements.accessMonths)form.elements.accessMonths.value=String(Math.max(1,Number(course.access_months)||1));$('#fdCourseCoverName').textContent=course.cover_url?'Existing course picture saved':'No picture selected';courseCoverFile=null;renderManagerCourseList();renderManagerLessonList();const first=managerLessons.filter(item=>item.course_id===id)[0];if(first)selectManagerLesson(first.id);else resetLessonForm()}
  function renderManagerLessonList(){const host=$('#fdCourseLessonList');if(!host)return;const rows=managerLessons.filter(item=>item.course_id===managerCourseId);host.innerHTML=managerCourseId?(rows.length?rows.map(lesson=>`<button class="fd-course-manager-item ${lesson.id===managerLessonId?'is-active':''}" data-manager-lesson="${lesson.id}" type="button"><strong>${escapeHTML(lesson.position)}. ${escapeHTML(lesson.title)}</strong><small>${lesson.video_url?'Video · ':''}${lesson.is_published?'Published':'Hidden'} · ${(lesson.quiz||[]).length} quiz question${(lesson.quiz||[]).length===1?'':'s'}</small></button>`).join(''):'<div class="fd-course-manager-empty">No lessons yet.</div>'):'<div class="fd-course-manager-empty">Save or select a course before adding lessons.</div>'}
  function selectManagerLesson(id){const lesson=managerLessons.find(item=>item.id===id);if(!lesson)return;managerLessonId=id;const form=$('#fdLessonForm');form.elements.id.value=lesson.id;form.elements.courseId.value=lesson.course_id;form.elements.title.value=lesson.title||'';form.elements.position.value=String(lesson.position||1);form.elements.summary.value=lesson.summary||'';form.elements.lessonContent.value=lesson.lesson_content||'';form.elements.lessonScript.value=lesson.lesson_script||'';lessonVideoFile=null;lessonThumbnailFile=null;lessonDocumentFiles=[];quizDraft=Array.isArray(lesson.quiz)?lesson.quiz.map(item=>({...item,options:[...(item.options||[])]})):[];$('#fdLessonUploadSummary').textContent=[lesson.video_url?'Video saved':'',lesson.thumbnail_url?'Thumbnail saved':'',(lesson.documents||[]).length?`${lesson.documents.length} document(s) saved`:'' ].filter(Boolean).join(' · ')||'No lesson media selected.';renderQuizDraft();renderManagerLessonList()}
  function renderQuizDraft(){const host=$('#fdQuizQuestionList');if(!host)return;host.innerHTML=quizDraft.length?quizDraft.map((item,index)=>`<div class="fd-quiz-draft-item"><span><strong>${index+1}.</strong> ${escapeHTML(item.question)} <small>Answer: ${escapeHTML(item.options?.[item.correct]||'')}</small></span><button data-remove-quiz="${index}" type="button"><i class="fas fa-times"></i></button></div>`).join(''):'<div class="fd-course-manager-empty">No quiz questions added.</div>'}
  async function uploadCourseFile(file,courseId,folder){
    if(!file)return'';
    const path=`${courseId}/${folder}/${crypto.randomUUID()}-${fileNameSafe(file.name)}`;
    const{error}=await client.storage.from('findat-course-media').upload(path,file,{upsert:false,contentType:file.type||undefined,cacheControl:'3600'});
    if(error)throw error;
    return `course-media://${path}`
  }
  $('#fdCourseManagerButton')?.addEventListener('click',async()=>{window.toggleModal?.('fdCourseManagerModal',true);try{await loadManagerData()}catch(error){showCourseStatus(error.message||'Course manager could not be opened.','error')}});
  $('#fdCourseManagerClose')?.addEventListener('click',()=>window.toggleModal?.('fdCourseManagerModal',false));
  $('#fdCourseManagerList')?.addEventListener('click',event=>{const button=event.target.closest('[data-manager-course]');if(button)selectManagerCourse(button.dataset.managerCourse)});
  $('#fdCourseLessonList')?.addEventListener('click',event=>{const button=event.target.closest('[data-manager-lesson]');if(button)selectManagerLesson(button.dataset.managerLesson)});
  $('#fdNewCourseButton')?.addEventListener('click',resetCourseForm);
  $('#fdNewLessonButton')?.addEventListener('click',()=>{if(!managerCourseId){showCourseStatus('Save or select a course before creating a lesson.','error');return}resetLessonForm();$('#fdLessonForm input[name="title"]')?.focus()});
  $('#fdCourseForm input[name="title"]')?.addEventListener('input',event=>{const slug=$('#fdCourseForm input[name="slug"]');if(slug&&!slug.dataset.edited)slug.value=slugify(event.target.value)});
  $('#fdCourseForm input[name="slug"]')?.addEventListener('input',event=>{event.target.dataset.edited='true'});
  $('#fdCourseCoverInput')?.addEventListener('change',event=>{courseCoverFile=event.target.files?.[0]||null;$('#fdCourseCoverName').textContent=courseCoverFile?courseCoverFile.name:'No picture selected'});
  $('#fdLessonVideoInput')?.addEventListener('change',event=>{lessonVideoFile=event.target.files?.[0]||null;updateLessonUploadSummary()});
  $('#fdLessonThumbnailInput')?.addEventListener('change',event=>{lessonThumbnailFile=event.target.files?.[0]||null;updateLessonUploadSummary()});
  $('#fdLessonDocumentsInput')?.addEventListener('change',event=>{lessonDocumentFiles=[...(event.target.files||[])];updateLessonUploadSummary()});
  function updateLessonUploadSummary(){$('#fdLessonUploadSummary').textContent=[lessonVideoFile?`Video: ${lessonVideoFile.name}`:'',lessonThumbnailFile?`Thumbnail: ${lessonThumbnailFile.name}`:'',lessonDocumentFiles.length?`${lessonDocumentFiles.length} document(s) selected`:'' ].filter(Boolean).join(' · ')||'No lesson media selected.'}
  $('#fdAddQuizQuestion')?.addEventListener('click',()=>{const question=$('#fdQuizQuestion').value.trim(),options=[$('#fdQuizOptionA').value.trim(),$('#fdQuizOptionB').value.trim(),$('#fdQuizOptionC').value.trim(),$('#fdQuizOptionD').value.trim()],correct=Number($('#fdQuizCorrect').value);if(!question||options.some(option=>!option)){showCourseStatus('Complete the question and all four options.','error');return}quizDraft.push({question,options,correct});['#fdQuizQuestion','#fdQuizOptionA','#fdQuizOptionB','#fdQuizOptionC','#fdQuizOptionD'].forEach(selector=>$(selector).value='');$('#fdQuizCorrect').value='0';renderQuizDraft();showCourseStatus('Quiz question added. Save the lesson to store it.','success')});
  $('#fdQuizQuestionList')?.addEventListener('click',event=>{const button=event.target.closest('[data-remove-quiz]');if(!button)return;quizDraft.splice(Number(button.dataset.removeQuiz),1);renderQuizDraft()});
  $('#fdCourseForm')?.addEventListener('submit',async event=>{
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;showCourseStatus('Saving course…');
    try{const profile=await requireAdmin(),values=Object.fromEntries(new FormData(form).entries()),id=String(values.id||crypto.randomUUID()),existing=managerCourses.find(item=>item.id===id),coverUrl=courseCoverFile?await uploadCourseFile(courseCoverFile,id,'course-cover'):(existing?.cover_url||'');const row={id,slug:slugify(values.slug||values.title),title:String(values.title||'').trim(),short_description:String(values.shortDescription||'').trim(),course_content:String(values.courseContent||'').trim(),cover_url:coverUrl,instructor_name:String(values.instructorName||'').trim(),instructor_qualifications:String(values.instructorQualifications||'').trim(),rating:Number(values.rating)||5,status:String(values.status||'draft'),is_free:String(values.isFree)!=='false',price_amount:String(values.isFree)!=='false'?0:Math.max(0,Number(values.priceAmount)||0),currency:['ZMW','USD','GBP'].includes(String(values.currency))?String(values.currency):'ZMW',access_months:Math.max(1,Math.min(36,Number(values.accessMonths)||1)),created_by:existing?.created_by||profile.id};if(!row.title)throw new Error('Course title is required.');const{data,error}=await client.from('findat_courses').upsert(row).select().single();if(error)throw error;managerCourseId=data.id;courseCoverFile=null;await loadManagerData(data.id);showCourseStatus('Course saved. Published courses appear as cards in Recordings.','success');await loadCatalogue();window.toggleModal?.('fdCourseManagerModal',false)}
    catch(error){showCourseStatus(error.message||'The course could not be saved.','error')}finally{if(button)button.disabled=false}
  });
  $('#fdDeleteCourseButton')?.addEventListener('click',async()=>{if(!managerCourseId)return;if(!confirm('Delete this course and all its lessons?'))return;try{const{error}=await client.from('findat_courses').delete().eq('id',managerCourseId);if(error)throw error;managerCourseId='';await loadManagerData();showCourseStatus('Course deleted.','success');await loadCatalogue()}catch(error){showCourseStatus(error.message||'The course could not be deleted.','error')}});
  $('#fdLessonForm')?.addEventListener('submit',async event=>{
    event.preventDefault();if(!managerCourseId){showCourseStatus('Save or select a course first.','error');return}const form=event.currentTarget,button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;showCourseStatus('Uploading lesson media and saving lesson…');
    try{const profile=await requireAdmin(),values=Object.fromEntries(new FormData(form).entries()),id=String(values.id||crypto.randomUUID()),existing=managerLessons.find(item=>item.id===id),videoUrl=lessonVideoFile?await uploadCourseFile(lessonVideoFile,managerCourseId,'videos'):(existing?.video_url||''),thumbnailUrl=lessonThumbnailFile?await uploadCourseFile(lessonThumbnailFile,managerCourseId,'thumbnails'):(existing?.thumbnail_url||''),documents=[...(Array.isArray(existing?.documents)?existing.documents:[])];for(const file of lessonDocumentFiles){documents.push({name:file.name,url:await uploadCourseFile(file,managerCourseId,'documents'),type:file.type||''})}const row={id,course_id:managerCourseId,position:Math.max(1,Number(values.position)||1),title:String(values.title||'').trim(),summary:String(values.summary||'').trim(),lesson_content:String(values.lessonContent||'').trim(),lesson_script:String(values.lessonScript||'').trim(),video_url:videoUrl,thumbnail_url:thumbnailUrl,documents,quiz:quizDraft,is_published:true,created_by:existing?.created_by||profile.id};if(!row.title)throw new Error('Lesson title is required.');const{data,error}=await client.from('findat_course_lessons').upsert(row).select().single();if(error)throw error;managerLessonId=data.id;lessonVideoFile=null;lessonThumbnailFile=null;lessonDocumentFiles=[];await loadManagerData(managerCourseId);selectManagerLesson(data.id);showCourseStatus('Lesson saved. Video thumbnail, documents, script and quiz are ready.','success');await loadCatalogue();window.toggleModal?.('fdCourseManagerModal',false)}
    catch(error){showCourseStatus(error.message||'The lesson could not be saved.','error')}finally{if(button)button.disabled=false}
  });
  $('#fdDeleteLessonButton')?.addEventListener('click',async()=>{if(!managerLessonId)return;if(!confirm('Delete this lesson?'))return;try{const{error}=await client.from('findat_course_lessons').delete().eq('id',managerLessonId);if(error)throw error;managerLessonId='';await loadManagerData(managerCourseId);showCourseStatus('Lesson deleted.','success');await loadCatalogue()}catch(error){showCourseStatus(error.message||'The lesson could not be deleted.','error')}});

  // Keep catalogue current when Administrators publish or edit courses.
  if(typeof client.channel==='function')client.channel('findat-course-catalogue').on('postgres_changes',{event:'*',schema:'public',table:'findat_courses'},()=>loadCatalogue().catch(console.warn)).on('postgres_changes',{event:'*',schema:'public',table:'findat_course_lessons'},()=>loadCatalogue().catch(console.warn)).subscribe();
  loadCatalogue().catch(console.warn)
})();


/* FINDAT commerce, x1 training, Cloud access and interface refinements */
(()=>{
  'use strict';
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const client=window.FINDAT_SUPABASE_CLIENT;
  if(!client)return;
  const escapeHTML=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const fmtDate=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleString(undefined,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})};
  const currentAccount=()=>window.FINDAT_ACTIVE_ACCOUNT||null;
  const isAdmin=()=>currentAccount()?.role==='admin';
  const showStatus=(id,message,state='')=>{const el=$(`#${id}`);if(!el)return;el.textContent=message||'';el.className=`${el.classList.contains('auth-status')?'auth-status':'fd-status-line'}${state?` ${state}`:''}`};
  const modal=(id,open)=>window.toggleModal?.(id,open);

  // ---------------------------------------------------------------------------
  // Statistical tools: exclusive, visible Open/Close state and close after insert.
  // ---------------------------------------------------------------------------
  const toolPanels=[$('#fdDataTools'),$('#fdPythonTools')].filter(Boolean);
  function syncToolPanel(panel){const label=$('summary small',panel);if(label)label.textContent=panel.open?'Close':'Open'}
  toolPanels.forEach(panel=>{
    panel.open=false;syncToolPanel(panel);
    panel.addEventListener('toggle',()=>{
      if(panel.open)toolPanels.filter(item=>item!==panel).forEach(item=>{item.open=false;syncToolPanel(item)});
      syncToolPanel(panel)
    })
  });
  ['fdInsertDataTable','fdInsertDataSummary','fdInsertDataChart'].forEach(id=>$('#'+id)?.addEventListener('click',()=>setTimeout(()=>{const panel=$('#fdDataTools');if(panel){panel.open=false;syncToolPanel(panel)}},80)));
  $('#fdInsertPythonChart')?.addEventListener('click',()=>setTimeout(()=>{const panel=$('#fdPythonTools');if(panel){panel.open=false;syncToolPanel(panel)}},80));

  // ---------------------------------------------------------------------------
  // Registry search and filters.
  // ---------------------------------------------------------------------------
  function applyRegistryFilters(){
    const query=String($('#fdAccountRegistrySearch')?.value||'').trim().toLowerCase();
    const role=$('#fdAccountRegistryRole')?.value||'';
    const status=$('#fdAccountRegistryStatus')?.value||'';
    $$('#fdAccountTableBody tr').forEach(row=>{
      if(!row.dataset.accountRole){row.hidden=false;return}
      const text=row.textContent.toLowerCase();
      const roleOk=!role||row.dataset.accountRole===role;
      const statusOk=!status||(status==='unconfirmed'?row.dataset.accountConfirmed==='unconfirmed':row.dataset.accountActive===status);
      row.hidden=!(roleOk&&statusOk&&(!query||text.includes(query)))
    })
  }
  ['fdAccountRegistrySearch','fdAccountRegistryRole','fdAccountRegistryStatus'].forEach(id=>$('#'+id)?.addEventListener(id.includes('Search')?'input':'change',applyRegistryFilters));
  const accountBody=$('#fdAccountTableBody');
  if(accountBody)new MutationObserver(applyRegistryFilters).observe(accountBody,{childList:true,subtree:true});

  // ---------------------------------------------------------------------------
  // My Learning, payment requests, access periods and certificates.
  // ---------------------------------------------------------------------------
  let learningRows=[];
  async function loadLearning(){
    const host=$('#fdMyLearningList');
    if(!currentAccount()){if(host)host.innerHTML='<div class="fd-empty-large"><i class="fas fa-lock"></i>Sign in to view your learning history.</div>';return []}
    if(host)host.innerHTML='<div class="fd-empty-large"><i class="fas fa-spinner fa-spin"></i>Loading learning history…</div>';
    const result=await client.rpc('findat_my_learning');
    if(result.error){if(host)host.innerHTML=`<div class="fd-empty-large"><i class="fas fa-exclamation-circle"></i>${escapeHTML(result.error.message)}</div>`;return []}
    learningRows=result.data||[];
    const active=learningRows.filter(row=>row.enrollment_status&&row.enrollment_status!=='expired');
    if($('#fdMyLearningNavCount'))$('#fdMyLearningNavCount').textContent=String(active.length);
    if(!host)return learningRows;
    host.innerHTML=learningRows.length?learningRows.map(row=>{
      const hasAccess=row.is_free||(['active','completed'].includes(row.enrollment_status)&&(!row.access_expires_at||new Date(row.access_expires_at)>new Date()));
      const price=row.is_free?'Free':`${row.currency||'ZMW'} ${Number(row.price_amount||0).toFixed(2)}`;
      return `<article class="fd-learning-card"><div class="fd-learning-cover" ${row.cover_url?`style="background-image:url('${escapeHTML(row.cover_url)}')"`:''}><i class="fas fa-graduation-cap"></i></div><div><div class="fd-learning-card-head"><h3>${escapeHTML(row.course_title)}</h3><span class="${row.is_free?'is-free':'is-paid'}">${escapeHTML(price)}</span></div><p>${hasAccess?`Access ${row.access_expires_at?`until ${escapeHTML(fmtDate(row.access_expires_at))}`:'active'}`:row.payment_status==='pending'?'Payment confirmation pending':'Access not active'}</p><div class="fd-learning-progress"><span style="width:${Math.max(0,Math.min(100,Number(row.completion_percent||0)))}%"></span></div><small>${Number(row.completion_percent||0).toFixed(0)}% complete</small>${row.certificate_number?`<div class="fd-certificate-chip"><i class="fas fa-certificate"></i> ${escapeHTML(row.certificate_number)}</div>`:''}<div class="fd-learning-meta">${row.payment_status?`<span>Payment: ${escapeHTML(row.payment_status)}</span>`:''}${row.payment_reference?`<span>Reference: ${escapeHTML(row.payment_reference)}</span>`:''}</div></div></article>`
    }).join(''):'<div class="fd-empty-large"><i class="fas fa-graduation-cap"></i>No learning history is available yet.</div>';
    return learningRows
  }
  $('#fdMyLearningButton')?.addEventListener('click',()=>{setTimeout(()=>{if($('#fdTopbarTitle'))$('#fdTopbarTitle').textContent='My Learning';loadLearning().catch(console.warn)},0)});

  // Paid courses: prevent opening until access is active; create a payment request.
  $('#findatCourseCardGrid')?.addEventListener('click',async event=>{
    const button=event.target.closest('[data-course-open]');if(!button)return;
    const course=(window.FINDAT_COURSE_CATALOGUE||[]).find(item=>String(item.id)===String(button.dataset.courseOpen));
    if(!course||course.is_free!==false||Number(course.price_amount||0)===0||isAdmin())return;
    event.preventDefault();event.stopImmediatePropagation();
    const account=currentAccount();
    if(!account){modal('loginPopup',true);return}
    const access=await client.rpc('findat_course_has_access',{p_course_id:course.id,p_user_id:account.id});
    if(!access.error&&access.data===true){
      window.FINDAT_OPEN_COURSE?.(course);
      return
    }
    if(!confirm(`Request access to “${course.title}” for ${course.currency||'ZMW'} ${Number(course.price_amount||0).toFixed(2)}? An Administrator will confirm the payment and activate access.`))return;
    const request=await client.rpc('findat_request_course_access',{p_course_id:course.id});
    if(request.error){alert(request.error.message||'Course access could not be requested.');return}
    const row=Array.isArray(request.data)?request.data[0]:request.data;
    alert(row?.message||'Your course access request was recorded.');
    loadLearning().catch(console.warn)
  },true);

  // Course payment administration.
  async function loadCoursePayments(){
    const host=$('#fdCoursePaymentList');if(!host||!isAdmin())return;
    host.innerHTML='<div class="fd-course-manager-empty"><i class="fas fa-spinner fa-spin"></i> Loading payment requests…</div>';
    const result=await client.rpc('findat_course_payment_admin_feed');
    if(result.error){host.innerHTML=`<div class="fd-course-manager-empty">${escapeHTML(result.error.message)}</div>`;return}
    const rows=result.data||[];
    host.innerHTML=rows.length?rows.map(row=>`<article class="fd-course-payment-row"><div><strong>${escapeHTML(row.learner_name||row.learner_username)}</strong><span>@${escapeHTML(row.learner_username||'')} · ${escapeHTML(row.course_title)}</span><small>${escapeHTML(row.currency)} ${Number(row.amount||0).toFixed(2)} · requested ${escapeHTML(fmtDate(row.requested_at))}</small></div><span class="fd-payment-status is-${escapeHTML(row.status)}">${escapeHTML(row.status)}</span>${row.status==='pending'?`<button class="fd-primary-btn" data-confirm-payment="${row.payment_id}" type="button"><i class="fas fa-check"></i> Confirm payment</button>`:`<small>${row.access_expires_at?`Access until ${escapeHTML(fmtDate(row.access_expires_at))}`:''}</small>`}</article>`).join(''):'<div class="fd-course-manager-empty">No course payment requests are available.</div>'
  }
  $('#fdCourseManagerButton')?.addEventListener('click',()=>setTimeout(()=>loadCoursePayments().catch(console.warn),120));
  $('#fdRefreshCoursePayments')?.addEventListener('click',()=>loadCoursePayments().catch(console.warn));
  $('#fdCoursePaymentList')?.addEventListener('click',async event=>{
    const button=event.target.closest('[data-confirm-payment]');if(!button)return;
    const reference=prompt('Enter the payment reference or receipt number:','');if(reference===null)return;
    button.disabled=true;
    const result=await client.rpc('findat_record_course_payment',{p_payment_id:button.dataset.confirmPayment,p_reference:reference,p_method:'manual'});
    button.disabled=false;
    if(result.error){alert(result.error.message||'Payment could not be confirmed.');return}
    await loadCoursePayments();
    alert('Payment confirmed and course access activated.')
  });

  // ---------------------------------------------------------------------------
  // Monthly FINDAT Cloud password administration and credential notification.
  // ---------------------------------------------------------------------------
  async function loadCloudRegistry(){
    const host=$('#fdCloudAccessList');if(!host||!isAdmin())return;
    showStatus('fdCloudAccessStatus','Loading Cloud access…');
    const result=await client.rpc('findat_cloud_access_registry');
    if(result.error){showStatus('fdCloudAccessStatus',result.error.message||'Cloud access could not be loaded.','error');return}
    const rows=result.data||[];
    host.innerHTML=rows.length?rows.map(row=>`<article class="fd-cloud-access-row"><div><strong>${escapeHTML(row.display_name||row.username)}</strong><span>@${escapeHTML(row.username)} · ${escapeHTML(row.role)}</span><small>${row.expires_at?`Expires ${escapeHTML(fmtDate(row.expires_at))}`:'No password generated'}</small></div><span class="fd-cloud-state ${row.cloud_active&&!row.expired?'is-active':'is-inactive'}">${row.cloud_active&&!row.expired?'Active':row.expired?'Expired':'Inactive'}</span><div><button class="fd-primary-btn" data-cloud-generate="${row.user_id}" type="button"><i class="fas fa-key"></i> ${row.expires_at?'Renew':'Generate'}</button><button class="fd-mini-btn ${row.cloud_active?'is-danger':'is-success'}" data-cloud-toggle="${row.user_id}" data-cloud-next="${row.cloud_active?'false':'true'}" type="button">${row.cloud_active?'Cancel / suspend':'Activate'}</button></div></article>`).join(''):'<div class="fd-empty-large"><i class="fas fa-cloud"></i>No eligible Client or Consultant accounts were found.</div>';
    showStatus('fdCloudAccessStatus','')
  }
  $('#fdRefreshCloudAccess')?.addEventListener('click',()=>loadCloudRegistry().catch(console.warn));
  $('[data-dashboard-view="accounts"]')?.addEventListener('click',()=>setTimeout(()=>loadCloudRegistry().catch(console.warn),150));
  $('#fdCloudAccessList')?.addEventListener('click',async event=>{
    const generate=event.target.closest('[data-cloud-generate]'),toggle=event.target.closest('[data-cloud-toggle]');
    if(generate){generate.disabled=true;const result=await client.rpc('findat_generate_cloud_access',{p_user_id:generate.dataset.cloudGenerate});generate.disabled=false;if(result.error){showStatus('fdCloudAccessStatus',result.error.message||'Password could not be generated.','error');return}const row=Array.isArray(result.data)?result.data[0]:result.data;showStatus('fdCloudAccessStatus',`Cloud password generated for @${row.username}. The user received it in Notifications.`,'success');await loadCloudRegistry();return}
    if(toggle){toggle.disabled=true;const result=await client.rpc('findat_set_cloud_access_active',{p_user_id:toggle.dataset.cloudToggle,p_active:toggle.dataset.cloudNext==='true'});toggle.disabled=false;if(result.error){showStatus('fdCloudAccessStatus',result.error.message||'Cloud access could not be changed.','error');return}await loadCloudRegistry()}
  });

  // Cloud-access notifications open in a dedicated popup and can be copied.
  $('#fdCollaborationInboxList')?.addEventListener('click',event=>{
    const card=event.target.closest('[data-notification-kind="cloud_access"]');if(!card)return;
    event.preventDefault();event.stopImmediatePropagation();
    const text=card.dataset.notificationMessage||card.querySelector('p')?.textContent||'';
    $('#fdCloudCredentialText').textContent=text;
    modal('fdCollaborationInboxModal',false);modal('fdCloudCredentialModal',true)
  },true);
  $('#fdCloudCredentialClose')?.addEventListener('click',()=>modal('fdCloudCredentialModal',false));
  $('#fdCopyCloudCredential')?.addEventListener('click',async()=>{
    const text=$('#fdCloudCredentialText')?.textContent||'';
    try{await navigator.clipboard.writeText(text);showStatus('fdCloudCredentialStatus','Cloud access details copied.','success')}catch{showStatus('fdCloudCredentialStatus','Select the text and copy it manually.','error')}
  });

  // ---------------------------------------------------------------------------
  // x1 | ProATR controlled training studio.
  // ---------------------------------------------------------------------------
  let trainingEntries=[];
  let selectedTrainingId='';
  let trainingFiles=[];
  const trainingForm=$('#fdX1TrainingForm');
  function trainingStatus(message,state=''){showStatus('fdX1TrainingStatus',message,state)}
  function resetTrainingForm(){trainingForm?.reset();if(trainingForm?.elements.id)trainingForm.elements.id.value='';selectedTrainingId='';trainingFiles=[];$('#fdX1TrainingDocumentSummary').textContent='No training documents selected.';renderTrainingList();trainingStatus('')}
  function renderTrainingList(){const host=$('#fdX1TrainingList');if(!host)return;host.innerHTML=trainingEntries.length?trainingEntries.map(row=>`<button class="fd-course-manager-item ${row.id===selectedTrainingId?'is-active':''}" data-training-entry="${row.id}" type="button"><strong>${escapeHTML(row.title)}</strong><small>${escapeHTML(row.status)} · ${escapeHTML(fmtDate(row.updated_at))}</small></button>`).join(''):'<div class="fd-course-manager-empty">No x1 training entries yet.</div>';if($('#fdX1TrainingNavCount'))$('#fdX1TrainingNavCount').textContent=String(trainingEntries.filter(row=>row.status==='active').length)}
  function selectTraining(id){const row=trainingEntries.find(item=>item.id===id);if(!row||!trainingForm)return;selectedTrainingId=id;trainingForm.elements.id.value=row.id;trainingForm.elements.title.value=row.title||'';trainingForm.elements.status.value=row.status||'draft';trainingForm.elements.tags.value=(row.tags||[]).join(', ');trainingForm.elements.inputText.value=row.input_text||'';trainingForm.elements.expectedOutput.value=row.expected_output||'';trainingForm.elements.pythonCode.value=row.python_code||'';renderTrainingList()}
  async function loadTraining(){
    if(!isAdmin())return;
    trainingStatus('Loading x1 training entries…');
    const result=await client.from('findat_x1_training_entries').select('*').order('updated_at',{ascending:false});
    if(result.error){trainingStatus(result.error.message||'Training entries could not be loaded.','error');return}
    trainingEntries=result.data||[];renderTrainingList();if(selectedTrainingId)selectTraining(selectedTrainingId);trainingStatus('')
  }
  async function applyActiveTraining(){
    const result=await client.rpc('findat_x1_training_feed');
    if(!result.error&&window.FINDAT_X1_ADD_TRAINING_KNOWLEDGE)window.FINDAT_X1_ADD_TRAINING_KNOWLEDGE(result.data||[])
  }
  async function readTrainingFile(file){
    const name=file.name.toLowerCase();
    if(/\.(txt|csv|json|md)$/i.test(name))return (await file.text()).slice(0,100000);
    if(name.endsWith('.docx')&&window.mammoth){const data=await file.arrayBuffer();return String((await window.mammoth.extractRawText({arrayBuffer:data})).value||'').slice(0,100000)}
    if(/\.xlsx?$/i.test(name)&&window.XLSX){const data=await file.arrayBuffer(),book=window.XLSX.read(data,{type:'array'});return book.SheetNames.map(sheet=>window.XLSX.utils.sheet_to_csv(book.Sheets[sheet])).join('\n\n').slice(0,100000)}
    if(name.endsWith('.pdf')&&window.pdfjsLib){const pdf=await window.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let text='';for(let page=1;page<=Math.min(pdf.numPages,60);page++){const content=await (await pdf.getPage(page)).getTextContent();text+=content.items.map(item=>item.str).join(' ')+'\n'}return text.slice(0,100000)}
    return ''
  }
  $('#fdX1TrainingButton')?.addEventListener('click',async()=>{modal('fdX1TrainingModal',true);await loadTraining()});
  $('#fdX1TrainingClose')?.addEventListener('click',()=>modal('fdX1TrainingModal',false));
  $('#fdX1NewTraining')?.addEventListener('click',resetTrainingForm);
  $('#fdX1TrainingList')?.addEventListener('click',event=>{const button=event.target.closest('[data-training-entry]');if(button)selectTraining(button.dataset.trainingEntry)});
  $('#fdX1TrainingDocuments')?.addEventListener('change',event=>{trainingFiles=[...(event.target.files||[])];$('#fdX1TrainingDocumentSummary').textContent=trainingFiles.length?`${trainingFiles.length} training document(s) selected.`:'No training documents selected.'});
  trainingForm?.addEventListener('submit',async event=>{
    event.preventDefault();if(!isAdmin())return;
    const submit=event.currentTarget.querySelector('button[type="submit"]');if(submit)submit.disabled=true;trainingStatus('Saving training entry…');
    try{
      const values=Object.fromEntries(new FormData(event.currentTarget).entries()),session=(await client.auth.getSession()).data?.session,id=String(values.id||crypto.randomUUID());
      const row={id,title:String(values.title||'').trim(),tags:String(values.tags||'').split(',').map(item=>item.trim()).filter(Boolean).slice(0,20),input_text:String(values.inputText||'').trim(),expected_output:String(values.expectedOutput||'').trim(),python_code:String(values.pythonCode||''),status:String(values.status||'draft'),created_by:session?.user?.id};
      if(!row.title)throw new Error('Training title is required.');
      const saved=await client.from('findat_x1_training_entries').upsert(row).select().single();if(saved.error)throw saved.error;selectedTrainingId=saved.data.id;
      for(const file of trainingFiles){const path=`findat-v1/x1-training/${saved.data.id}/${crypto.randomUUID()}-${file.name.replace(/[^A-Za-z0-9._-]+/g,'-')}`;const upload=await client.storage.from('findat-documents').upload(path,file,{contentType:file.type||undefined});if(upload.error)throw upload.error;const publicUrl=client.storage.from('findat-documents').getPublicUrl(path).data?.publicUrl||'';const extracted=await readTrainingFile(file);const doc=await client.from('findat_x1_training_documents').insert({entry_id:saved.data.id,file_name:file.name,file_url:publicUrl,mime_type:file.type||'',file_size:file.size,extracted_text:extracted,created_by:session?.user?.id});if(doc.error)throw doc.error}
      trainingFiles=[];await loadTraining();await applyActiveTraining();trainingStatus('Training saved and active knowledge applied to x1.','success');modal('fdX1TrainingModal',false)
    }catch(error){trainingStatus(error.message||'Training could not be saved.','error')}finally{if(submit)submit.disabled=false}
  });
  $('#fdX1DeleteTraining')?.addEventListener('click',async()=>{if(!selectedTrainingId||!confirm('Delete this x1 training entry and its documents?'))return;const result=await client.from('findat_x1_training_entries').delete().eq('id',selectedTrainingId);if(result.error){trainingStatus(result.error.message,'error');return}resetTrainingForm();await loadTraining();await applyActiveTraining()});
  let x1Worker=null,x1RunId=0;
  $('#fdX1RunTrainingPython')?.addEventListener('click',()=>{
    const code=String(trainingForm?.elements.pythonCode?.value||'').trim();if(!code){trainingStatus('Enter Python code first.','error');return}
    if(!x1Worker)x1Worker=new Worker('assets/js/x1-training-worker.mjs',{type:'module'});
    const id=++x1RunId;trainingStatus('Running Python validation…');
    const listener=event=>{if(event.data?.id!==id)return;x1Worker.removeEventListener('message',listener);const output=event.data.ok?event.data.output:event.data.error;$('#fdX1TestOutput').textContent=output||'Python completed without output.';trainingStatus(event.data.ok?'Python validation completed.':'Python validation failed.',event.data.ok?'success':'error')};
    x1Worker.addEventListener('message',listener);x1Worker.postMessage({id,code,inputText:String(trainingForm?.elements.inputText?.value||''),expectedOutput:String(trainingForm?.elements.expectedOutput?.value||'')})
  });
  $('#fdX1TestResponse')?.addEventListener('click',async()=>{await applyActiveTraining();const prompt=String($('#fdX1TestPrompt')?.value||'').trim();if(!prompt){trainingStatus('Enter a test input first.','error');return}const output=window.FINDAT_X1_TEST_PROMPT?window.FINDAT_X1_TEST_PROMPT(prompt):'x1 is still loading its training index.';$('#fdX1TestOutput').textContent=output;trainingStatus('x1 test response generated.','success')});

  // Keep active training synchronized when a signed-in session becomes available.
  client.auth.onAuthStateChange((event,session)=>{if(session?.user)setTimeout(()=>applyActiveTraining().catch(console.warn),250)});
  setTimeout(()=>applyActiveTraining().catch(()=>{}),700);

  // Course completion synchronises with the learner's account history.
  async function recordSelectedCourseProgress(percent){
    const course=window.FINDAT_SELECTED_COURSE||window.FINDAT_COURSE_CATALOGUE?.find(item=>item.slug==='data-analytics-foundations');
    if(!course?.id||String(course.id).startsWith('legacy-')||!currentAccount())return;
    const freeOrAccess=await client.rpc('findat_request_course_access',{p_course_id:course.id});
    if(freeOrAccess.error&&course.is_free!==false)return;
    const result=await client.rpc('findat_update_course_progress',{p_course_id:course.id,p_percent:Math.max(0,Math.min(100,Number(percent)||0))});
    if(!result.error)loadLearning().catch(console.warn)
  }
  $('#markRecordingComplete')?.addEventListener('click',()=>setTimeout(()=>{if($('#markRecordingComplete')?.classList.contains('is-complete'))recordSelectedCourseProgress(100).catch(console.warn)},50));
  $('#findatRecordingPlayer')?.addEventListener('ended',()=>recordSelectedCourseProgress(100).catch(console.warn));

  // Save/submit actions close their open modal or tool container when successful.
  $('#fdAdminCreateAccountForm')?.addEventListener('submit',()=>setTimeout(()=>{if($('#fdAdminAccountStatus')?.classList.contains('success'))$('#fdAdminCreateAccountForm').reset()},500));
})();

