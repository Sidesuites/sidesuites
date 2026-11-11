/* Sidesuites walkthrough chrome: small helpers around the DD-9 engine (app.js), which is not changed.
   - the loading screen reads the engine's progress bar and shows it as a percentage, and turns red on an error
   - inside the homepage's sheet (an iframe, or ?embed=1) a Close button and Esc hand control back to the page,
     the unit switch keeps the sheet, and the page is told which unit is showing */
(function(){
  'use strict';
  var $ = function(id){ return document.getElementById(id); };
  var unit = document.body.getAttribute('data-unit');

  /* loading: percentage from the bar's scaleX (the engine maps progress p to .05 + .9p) */
  var bar = $('loadbar'), msg = $('loadmsg'), load = $('load'), last = -1;
  if (bar && msg && window.MutationObserver) {
    new MutationObserver(function(){
      var m = /scaleX\(([\d.]+)\)/.exec(bar.style.transform || '');
      if (!m) return;
      var p = Math.max(0, Math.min(100, Math.round((parseFloat(m[1]) - 0.05) / 0.9 * 100)));
      if (p !== last) { last = p; msg.textContent = p >= 100 ? 'Opening the door' : 'Loading the rooms · ' + p + '%'; }
    }).observe(bar, { attributes: true, attributeFilter: ['style'] });
    /* the engine writes its own sentence here only when something fails */
    new MutationObserver(function(){
      if (/did not load|could not start/.test(msg.textContent)) load.classList.add('err');
    }).observe(msg, { childList: true, characterData: true, subtree: true });
  }

  /* the plan's lettering is the engine's Barlow Condensed: once it has loaded, redraw so the plan never keeps a fallback face */
  if (document.fonts && document.fonts.load) {
    document.fonts.load('600 9.5px "Barlow Condensed"').then(function(){
      var tries = 0;
      (function redraw(){ if (window.__wt && window.__wt.ready) window.__wt.invalidate(3); else if (tries++ < 120) setTimeout(redraw, 250); })();
    }).catch(function(){});
  }

  /* on a touch screen the help card says tap, not click */
  if (window.matchMedia && matchMedia('(pointer: coarse)').matches) {
    document.querySelectorAll('#help kbd').forEach(function(k){ k.textContent = k.textContent.replace('Click', 'Tap'); });
    var walk = document.querySelector('#help li:nth-child(2) span');
    if (walk) walk.textContent = 'Walk there, or use the stick';
  }

  /* embedded in the homepage */
  var params = new URLSearchParams(location.search);
  var embedded = params.get('embed') === '1' || window.self !== window.top;
  var close = $('bClose');
  function tell(type){ try { if (window.parent !== window) window.parent.postMessage({ source: 'sidesuites-walk', type: type, unit: unit }, location.origin); } catch (e) {} }
  if (embedded) {
    document.body.classList.add('embed');
    if (close) {
      close.hidden = false;
      close.addEventListener('click', function(){ tell('close'); });
    }
    document.querySelectorAll('.seg a').forEach(function(a){ a.href = a.getAttribute('href') + '?embed=1'; });
    window.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && !document.pointerLockElement && !document.fullscreenElement) tell('close');
    });
    tell('unit');
  }
})();
