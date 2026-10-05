(function(){
  var root = document.documentElement;
  /* always open a page at its top (also when the previous page was scrolled down) */
  (function(){
    try{ if('scrollRestoration' in history){ history.scrollRestoration = 'manual'; } }catch(e){}
    function top(){
      if(window.location.hash){ return; }
      try{ window.scrollTo({top:0,left:0,behavior:'instant'}); }catch(e){ window.scrollTo(0,0); }
      document.documentElement.scrollTop = 0;
      if(document.body){ document.body.scrollTop = 0; if(document.body.scrollIntoView){ document.body.scrollIntoView(true); } }
    }
    top();
    window.addEventListener('load', top);
    window.addEventListener('pageshow', top);
    setTimeout(top, 150);
  })();
  /* theme */
  document.querySelectorAll('.theme-toggle').forEach(function(toggle){
    toggle.addEventListener('click', function(){
      var current = root.getAttribute('data-theme');
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      var effectiveDark = current ? current === 'dark' : prefersDark;
      var next = effectiveDark ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try{ localStorage.setItem('sga-theme', next); }catch(e){}
    });
  });
  /* header shrink on scroll */
  var header = document.getElementById('site-header');
  var scrolled = false, ticking = false;
  function apply(){
    ticking = false;
    var y = window.scrollY || window.pageYOffset || 0;
    if(!scrolled && y > 40){ scrolled = true; } else if(scrolled && y < 16){ scrolled = false; }
    if(header && header.classList.contains('scrolled') !== scrolled){ header.classList.toggle('scrolled', scrolled); }
  }
  window.addEventListener('scroll', function(){ if(!ticking){ ticking = true; window.requestAnimationFrame(apply); } }, {passive:true});
  apply();
  /* mobile menu */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('mainNav');
  if(burger && nav){
    burger.addEventListener('click', function(){ nav.classList.toggle('open'); });
    nav.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', function(){ nav.classList.remove('open'); }); });
  }
  var y = document.getElementById('year');
  if(y){ y.textContent = new Date().getFullYear(); }
  /* pause decorative animation off-screen */
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ e.target.classList.toggle('motif-paused', !e.isIntersecting); });
    }, {rootMargin:'120px 0px'});
    document.querySelectorAll('.bg-motif').forEach(function(el){ io.observe(el); });
  }
})();
