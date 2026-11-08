/* Sidesuites: the owner's colour circles (the home's lending panel, every walnut closing card) glide out of their
   corners when the card scrolls into view (again each time it comes back) and drift a little with the scroll.
   Load it with defer on any page that has a .lend-media or .close-card. It adds .circ-ready only when it can watch the
   card, .circ-in at 30% visible (removed when the card is fully out, so the entrance replays), and sets --p (0 as the
   card enters at the bottom, 1 as it leaves at the top) for the drift. The look and the motion are in css/site.css
   (CLOSING CARD, BRAND CIRCLES). Without this script, or under Reduce Motion, the shapes simply sit in place. */
(function(){
  'use strict';
  if(!('IntersectionObserver' in window)) return;
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var cards=[].slice.call(document.querySelectorAll('.lend-media, .close-card'));
  if(!cards.length) return;
  var near=[], raf=0;
  function drift(){
    raf=0; var vh=window.innerHeight;
    near.forEach(function(el){ var r=el.getBoundingClientRect(); el.style.setProperty('--p', Math.min(1, Math.max(0, (vh-r.top)/(vh+r.height))).toFixed(3)); });
  }
  function queue(){ if(!raf && near.length) raf=requestAnimationFrame(drift); }
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){
      var i=near.indexOf(e.target);
      if(e.isIntersecting){ if(i<0) near.push(e.target); if(e.intersectionRatio>=.3) e.target.classList.add('circ-in'); }
      else { if(i>-1) near.splice(i,1); e.target.classList.remove('circ-in'); }
    });
    queue();
  }, {threshold:[0, .3]});
  cards.forEach(function(el){ el.classList.add('circ-ready'); io.observe(el); });
  window.addEventListener('scroll', queue, {passive:true});
  window.addEventListener('resize', queue);
})();
