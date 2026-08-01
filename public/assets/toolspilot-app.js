/* ToolsPilot — shared interactions */
(function () {
  'use strict';
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('tp-theme'); } catch (e) {}
  if (saved) root.setAttribute('data-theme', saved);
  else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) root.setAttribute('data-theme', 'dark');
  function toggleTheme(){ var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; root.setAttribute('data-theme', next); try { localStorage.setItem('tp-theme', next); } catch(e){} }
  function toast(msg){ var t=document.createElement('div'); t.className='tp-toast'; t.textContent=msg; t.setAttribute('role','status'); document.body.appendChild(t); requestAnimationFrame(function(){t.classList.add('show')}); setTimeout(function(){t.classList.remove('show'); setTimeout(function(){t.remove()},250)},2600); }
  function openDrawer(){ var d=document.getElementById('drawer'); if(d)d.classList.add('open'); document.body.style.overflow='hidden'; }
  function closeDrawer(){ var d=document.getElementById('drawer'); if(d)d.classList.remove('open'); document.body.style.overflow=''; }
  function saveArticle(btn){ var url=location.pathname; var title=btn.getAttribute('data-title') || document.title; var saved=[]; try { saved=JSON.parse(localStorage.getItem('tp-saved')||'[]'); } catch(e){} var exists=saved.some(function(x){return x.url===url}); if(!exists) saved.unshift({url:url,title:title,ts:Date.now()}); else saved=saved.filter(function(x){return x.url!==url}); try { localStorage.setItem('tp-saved', JSON.stringify(saved.slice(0,80))); } catch(e){} btn.setAttribute('aria-pressed', exists ? 'false' : 'true'); toast(exists ? 'Removed from saved articles.' : 'Saved to this browser.'); }
  function shareArticle(btn){ var data={title:btn.getAttribute('data-title')||document.title, url:location.href}; if(navigator.share){ navigator.share(data).catch(function(){}); } else if(navigator.clipboard){ navigator.clipboard.writeText(data.url).then(function(){toast('Link copied.');}, function(){toast(data.url);}); } else toast(data.url); }
  document.addEventListener('click', function(e){ var t=e.target.closest('[data-action]'); if(!t){ if(e.target.id==='drawer'||e.target.classList.contains('drawer__scrim')) closeDrawer(); return; } var a=t.getAttribute('data-action'); if(a==='theme') toggleTheme(); else if(a==='open-menu') openDrawer(); else if(a==='close-menu') closeDrawer(); else if(a==='save-article') saveArticle(t); else if(a==='share-article') shareArticle(t); });

  document.querySelectorAll('[data-action="save-article"]').forEach(function(btn){ try { var saved=JSON.parse(localStorage.getItem('tp-saved')||'[]'); if(saved.some(function(x){return x.url===location.pathname})) btn.setAttribute('aria-pressed','true'); } catch(e){} });

  var revealEls=document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && revealEls.length){ var io=new IntersectionObserver(function(entries){ entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.remove('pre'); en.target.classList.add('in'); io.unobserve(en.target); } }); },{threshold:0.1,rootMargin:'0px 0px -8% 0px'}); var fold=window.innerHeight*0.92; revealEls.forEach(function(el,i){ var top=el.getBoundingClientRect().top; if(top>fold){ el.classList.add('pre'); el.style.transitionDelay=(Math.min(i%3,3)*70)+'ms'; io.observe(el); } }); }

  var bar=document.getElementById('progress-bar'); var article=document.getElementById('article-body');
  if(bar && article){ var onScroll=function(){ var rect=article.getBoundingClientRect(); var total=article.offsetHeight-window.innerHeight; var passed=-rect.top; var p=total>0?Math.min(1,Math.max(0,passed/total)):0; bar.style.width=(p*100)+'%'; }; window.addEventListener('scroll',onScroll,{passive:true}); window.addEventListener('resize',onScroll); onScroll(); }

  var tocLinks=document.querySelectorAll('.toc a[href^="#"]');
  if(tocLinks.length && 'IntersectionObserver' in window){ var map={}; tocLinks.forEach(function(l){map[l.getAttribute('href').slice(1)]=l;}); var heads=[]; Object.keys(map).forEach(function(id){var el=document.getElementById(id); if(el)heads.push(el);}); var spy=new IntersectionObserver(function(entries){ entries.forEach(function(en){ if(en.isIntersecting){ tocLinks.forEach(function(l){l.classList.remove('active')}); var lk=map[en.target.id]; if(lk)lk.classList.add('active'); } }); },{rootMargin:'-20% 0px -70% 0px',threshold:0}); heads.forEach(function(h){spy.observe(h)}); }

  var filterRoot=document.getElementById('filter-root');
  if(filterRoot){ var chips=filterRoot.querySelectorAll('.chip[data-cat]'); var items=document.querySelectorAll('[data-card]'); var searchInput=document.getElementById('archive-search'); var emptyState=document.getElementById('empty-state'); var countOut=document.getElementById('result-count'); var activeCat='all'; function apply(){ var q=((searchInput&&searchInput.value)||'').trim().toLowerCase(); var shown=0; items.forEach(function(it){ var cat=it.getAttribute('data-cat')||''; var text=((it.getAttribute('data-search')||it.textContent||'')).toLowerCase(); var okCat=activeCat==='all'||cat===activeCat; var okQ=!q||text.indexOf(q)!==-1; var vis=okCat&&okQ; it.style.display=vis?'':'none'; if(vis)shown++; }); if(emptyState)emptyState.style.display=shown?'none':''; if(countOut)countOut.textContent=shown; } chips.forEach(function(c){ c.addEventListener('click',function(){ chips.forEach(function(x){x.classList.remove('is-active');x.setAttribute('aria-pressed','false')}); c.classList.add('is-active'); c.setAttribute('aria-pressed','true'); activeCat=c.getAttribute('data-cat'); apply(); }); }); if(searchInput) searchInput.addEventListener('input',apply); apply(); }
  document.addEventListener('keydown', function(e){ if(e.key==='/' && !/INPUT|TEXTAREA/.test(((document.activeElement||{}).tagName)||'')){ var s=document.querySelector('[data-search-focus]'); if(s){e.preventDefault();s.focus();} } if(e.key==='Escape') closeDrawer(); });

})();
