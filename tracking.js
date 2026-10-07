/* SGA Groupe - suivi des conversions Google Ads, uniquement après accord du visiteur.
   Inactif tant qu'aucun identifiant Google Ads n'est renseigné (aucun cookie, aucun bandeau). */
(function(){
  var CFG = { id:'', quote:'', call:'' };
  if(!/^AW-\d+$/.test(CFG.id)){ return; }
  var KEY='sga-consent', MAX=1000*60*60*24*180, loaded=false, box=null;
  var T={
    fr:{txt:"Nous utilisons un cookie de mesure publicitaire (Google Ads) pour savoir si une annonce a mené à une demande de devis. Il n'est déposé qu'avec votre accord.",ok:"Accepter",no:"Refuser",more:"En savoir plus",link:"Cookies",legal:"mentions-legales",aria:"Gestion des cookies"},
    en:{txt:"We use an advertising measurement cookie (Google Ads) to know whether an ad led to a quote request. It is only set with your consent.",ok:"Accept",no:"Decline",more:"Learn more",link:"Cookies",legal:"mentions-legales",aria:"Cookie settings"},
    es:{txt:"Usamos una cookie de medición publicitaria (Google Ads) para saber si un anuncio ha generado una solicitud de presupuesto. Solo se instala con su consentimiento.",ok:"Aceptar",no:"Rechazar",more:"Más información",link:"Cookies",legal:"mentions-legales",aria:"Gestión de cookies"}
  };
  function lang(){ var l=(document.documentElement.getAttribute('lang')||'fr').slice(0,2); return T[l]?l:'fr'; }
  function get(){ try{ var v=JSON.parse(localStorage.getItem(KEY)||'null'); if(v&&v.t&&Date.now()-v.t<MAX){ return v.v; } }catch(e){} return null; }
  function set(v){ try{ localStorage.setItem(KEY,JSON.stringify({v:v,t:Date.now()})); }catch(e){} }
  function load(){
    if(loaded){ return; } loaded=true;
    window.dataLayer=window.dataLayer||[];
    window.gtag=function(){ window.dataLayer.push(arguments); };
    window.gtag('js',new Date());
    window.gtag('config',CFG.id);
    var s=document.createElement('script'); s.async=true; s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(CFG.id);
    document.head.appendChild(s);
  }
  window.sgaTrack=function(kind){
    if(!loaded||get()!=='granted'){ return; }
    var label = kind==='quote' ? CFG.quote : CFG.call;
    if(!label || label.indexOf('__')===0){ return; }
    window.gtag('event','conversion',{send_to:CFG.id+'/'+label});
  };
  document.addEventListener('click',function(e){
    var a=e.target&&e.target.closest?e.target.closest('a[href^="tel:"]'):null;
    if(a){ window.sgaTrack('call'); }
  });
  function css(){
    if(document.getElementById('sga-consent-css')){ return; }
    var st=document.createElement('style'); st.id='sga-consent-css';
    st.textContent='#sga-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:520px;margin:0 auto;background:#062138;color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:16px 18px;box-shadow:0 12px 40px rgba(0,0,0,.35);font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}'+
    '#sga-consent p{margin:0 0 12px}#sga-consent a{color:#7fd8f5;text-decoration:underline}'+
    '#sga-consent .sc-b{display:flex;gap:10px}#sga-consent button{flex:1;min-height:42px;border-radius:99px;font:600 14px/1 inherit;font-family:inherit;cursor:pointer;border:1.5px solid #11b3e5}'+
    '#sga-consent .sc-ok{background:#11b3e5;color:#062138}#sga-consent .sc-no{background:transparent;color:#fff}'+
    '#sga-consent button:focus-visible{outline:3px solid #fff;outline-offset:2px}';
    document.head.appendChild(st);
  }
  function render(){
    if(!box){ return; }
    var t=T[lang()];
    var legal=(location.pathname.replace(/[^/]*$/,'')||'/')+t.legal;
    box.setAttribute('aria-label',t.aria);
    box.innerHTML='<p>'+t.txt+' <a href="'+legal+'">'+t.more+'</a></p><div class="sc-b"><button type="button" class="sc-no">'+t.no+'</button><button type="button" class="sc-ok">'+t.ok+'</button></div>';
    box.querySelector('.sc-ok').onclick=function(){ set('granted'); hide(); load(); };
    box.querySelector('.sc-no').onclick=function(){ set('denied'); hide(); };
  }
  function show(){
    css();
    if(!box){ box=document.createElement('div'); box.id='sga-consent'; box.setAttribute('role','dialog'); document.body.appendChild(box); }
    render();
  }
  function hide(){ if(box&&box.parentNode){ box.parentNode.removeChild(box); } box=null; }
  function footerLink(){
    var host=document.querySelector('.footer-legal'); if(!host||document.getElementById('sga-cookie-link')){ return; }
    var sep=document.createElement('span'); sep.setAttribute('aria-hidden','true'); sep.textContent=' · ';
    var a=document.createElement('a'); a.id='sga-cookie-link'; a.href='#'; a.textContent=T[lang()].link;
    a.addEventListener('click',function(e){ e.preventDefault(); show(); });
    host.insertBefore(a,host.firstChild); host.insertBefore(sep,a.nextSibling);
  }
  function init(){
    footerLink();
    var c=get();
    if(c==='granted'){ load(); } else if(c===null){ show(); }
    new MutationObserver(function(){ render(); var l=document.getElementById('sga-cookie-link'); if(l){ l.textContent=T[lang()].link; } })
      .observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',init); } else { init(); }
})();
