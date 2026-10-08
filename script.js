(function(){
  var root = document.documentElement;

  /* ---------- French cities + postal codes (Base Adresse Nationale / data.gouv.fr) ---------- */
  var SGA_CITIES = [];
  var EU_CITIES = [];
  var ALL_CITIES = [];
  /* The city lists live in cities.js (loaded on demand so the home page stays light). */
  (function(){
    var requested = false;
    function load(){
      if(requested) return;
      requested = true;
      var s = document.createElement('script');
      s.src = 'cities.js?v=7b860ea6';
      s.async = true;
      s.onload = function(){
        SGA_CITIES.push.apply(SGA_CITIES, window.__SGA_CITIES || []);
        EU_CITIES.push.apply(EU_CITIES, window.__EU_CITIES || []);
        ALL_CITIES.push.apply(ALL_CITIES, SGA_CITIES.concat(EU_CITIES));
        if(window.__sgaWarmCities){ window.__sgaWarmCities(); }
      };
      s.onerror = function(){ requested = false; };
      document.head.appendChild(s);
    }
    window.__loadSgaCities = load;
    if(window.location.hash === '#devis'){ load(); }
    window.addEventListener('hashchange', function(){ if(window.location.hash === '#devis'){ load(); } });
    document.addEventListener('focusin', function(e){ if(e.target && /^f-(depart|arrivee)$/.test(e.target.id || '')){ load(); } });
  })();

  /* ---------- City autocomplete (depart/arrivee) with postal codes ---------- */
  (function(){
    function stripAccents(s){
      return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    function norm(s){ return stripAccents(String(s||'')).toLowerCase().replace(/[-'’]/g, ' ').replace(/\s+/g, ' ').trim(); }

    function setupCityAutocomplete(inputId, suggestId){
      var input = document.getElementById(inputId);
      var box = document.getElementById(suggestId);
      if(!input || !box) return;
      var items = [];
      var hlIndex = -1;
      var debounceTimer = null;

      function close(){ box.classList.remove('open'); box.innerHTML = ''; items = []; hlIndex = -1; }

      function render(matches, query){
        items = matches;
        hlIndex = -1;
        if(!matches.length){
          box.innerHTML = '<div class="cs-empty">' + (t('city.noMatch') || 'Aucune ville trouvée') + '</div>';
          box.classList.add('open');
          return;
        }
        var html = '';
        for(var i=0;i<matches.length;i++){
          var name = matches[i][0];
          var cp = matches[i][1];
          html += '<button type="button" data-i="'+i+'"><span>'+escapeHtml(name)+'</span><span class="cs-cp">'+escapeHtml(cp)+'</span></button>';
        }
        box.innerHTML = html;
        box.classList.add('open');
      }

      var normCache = [], normDone = 0;
      /* Warm the normalised-name cache in small slices once the city list has loaded,
         so the first keystroke is instant and the page never freezes. */
      if(!window.__sgaWarmCities){
        window.__sgaWarmCities = function(){
          (function step(){
            var end = Math.min(normDone + 3000, ALL_CITIES.length);
            for(var k=normDone;k<end;k++){ normCache[k] = norm(ALL_CITIES[k][0]); }
            normDone = end;
            if(normDone < ALL_CITIES.length){ setTimeout(step, 8); }
          })();
        };
      }
      function search(q){
        var raw = String(q||'').trim();
        var starts = [];
        var contains = [];

        /* Postal-code mode: a purely numeric query matches by postal code prefix,
           so "34000" (or even just "340") surfaces every city sharing that code.
           Covers France and continental Europe (numeric postal systems); UK postcodes
           are alphanumeric and are matched via name search instead.
           The full combined list (France + Europe) is scanned without an early break,
           so a short query doesn't get capped by French matches before European ones
           are ever considered. */
        if(/^\d+$/.test(raw)){
          if(raw.length < 2){ close(); return; }
          for(var j=0;j<ALL_CITIES.length;j++){
            if(ALL_CITIES[j][1].indexOf(raw) === 0){
              starts.push(ALL_CITIES[j]);
            }
          }
          render(starts.slice(0, 8), q);
          return;
        }

        var nq = norm(raw);
        if(nq.length < 2){ close(); return; }
        /* normalised names are computed once (the list can hold tens of thousands of towns) */
        for(var k=normDone;k<ALL_CITIES.length;k++){ normCache[k] = norm(ALL_CITIES[k][0]); }
        normDone = ALL_CITIES.length;
        for(var i=0;i<ALL_CITIES.length;i++){
          var nn = normCache[i];
          if(nn.indexOf(nq) === 0){
            starts.push(ALL_CITIES[i]);
          } else if(nn.indexOf(nq) > 0){
            contains.push(ALL_CITIES[i]);
          }
        }
        var matches = starts.concat(contains).slice(0, 8);
        render(matches, q);
      }

      function selectItem(i){
        var m = items[i];
        if(!m) return;
        input.value = m[0] + ' (' + m[1] + ')';
        input.setAttribute('data-postal', m[1]);
        close();
      }

      function setHl(i){
        var btns = box.querySelectorAll('button');
        btns.forEach(function(b){ b.classList.remove('hl'); });
        if(i >= 0 && i < btns.length){ btns[i].classList.add('hl'); btns[i].scrollIntoView({block:'nearest'}); }
        hlIndex = i;
      }

      input.addEventListener('input', function(){
        input.removeAttribute('data-postal');
        var val = input.value;
        if(debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function(){ search(val); }, 120);
      });
      input.addEventListener('keydown', function(e){
        if(!box.classList.contains('open')) return;
        if(e.key === 'ArrowDown'){ e.preventDefault(); setHl(Math.min(hlIndex+1, items.length-1)); }
        else if(e.key === 'ArrowUp'){ e.preventDefault(); setHl(Math.max(hlIndex-1, 0)); }
        else if(e.key === 'Enter'){ if(hlIndex >= 0){ e.preventDefault(); selectItem(hlIndex); } }
        else if(e.key === 'Escape'){ close(); }
      });
      input.addEventListener('blur', function(){ setTimeout(close, 180); });
      input.addEventListener('focus', function(){ if(input.value.length >= 2) search(input.value); });
      box.addEventListener('mousedown', function(e){
        var btn = e.target.closest('button[data-i]');
        if(btn){ selectItem(parseInt(btn.getAttribute('data-i'), 10)); }
      });
    }

    setupCityAutocomplete('f-depart', 'f-depart-suggest');
    setupCityAutocomplete('f-arrivee', 'f-arrivee-suggest');
  })();

  /* ---------- Theme ---------- */
  var toggles = document.querySelectorAll('.theme-toggle');
  function applyTheme(t){ if(t){ root.setAttribute('data-theme', t); } else { root.removeAttribute('data-theme'); } }
  var saved = null;
  try{ saved = localStorage.getItem('sga-theme'); }catch(e){}
  if(saved){ applyTheme(saved); }
  toggles.forEach(function(toggle){
    toggle.addEventListener('click', function(){
      var current = root.getAttribute('data-theme');
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      var effectiveDark = current ? current === 'dark' : prefersDark;
      var next = effectiveDark ? 'light' : 'dark';
      applyTheme(next);
      try{ localStorage.setItem('sga-theme', next); }catch(e){}
    });
  });

  /* ---------- i18n (FR / EN / ES) ---------- */
  var I18N = {
    fr: {
      'nav.about':'À propos','nav.activities':'Activités','nav.implantation':'Implantation','nav.team':'Contact',
      'cta.quote':'Demander un devis','devisBack':'Retour au site',
      'hero.eyebrow':'Affréteur national & international',
      'svc.eyebrow':'Nos services en détail','svc.title':'Affrètement, transport et stockage : ce que SGA fait pour vous','svc.more':'En savoir plus',
      'svc.1.title':'Affrètement routier','svc.1.text':"Lots complets ou demi-lots, en France et en Europe : nous trouvons le transporteur adapté à votre marchandise.",
      'svc.2.title':'Transport national & international','svc.2.text':"Routier, ferroviaire, maritime ou aérien : le bon mode de transport pour chaque trajet, du local à l'international.",
      'svc.3.title':'Stockage & logistique','svc.3.text':"Entreposage flexible pour absorber vos pics d'activité et pilotage de vos flux, de bout en bout.",
      'footer.servicesTitle':'Services','footer.svc.affretement':'Affrètement routier','footer.svc.transport':'Transport national & international','footer.svc.stockage':'Stockage & logistique','footer.svc.faq':'Questions fréquentes','footer.svc.about':'Qui est SGA Groupe ?','footer.legal':'Mentions légales',
      'hero.title':'Votre fret livré au bon <em>endroit</em>, au bon <em>moment</em>.',
      'hero.sub':"SGA organise vos transports routiers, ferroviaires, maritimes et aériens, du local à l'international — avec un interlocuteur dédié du premier appel à la livraison.",
      'hero.ctaQuote':'Demander un devis gratuit','hero.ctaActivities':'Découvrir nos activités','hero.fastReply':'Réponse sous 30 minutes',
      'stat.collab':'Transporteurs partenaires','stat.clients':'Clients','stat.sites':'Sites en France','stat.response':'Réponse devis',
      'trust.label':'Ils nous font confiance',
      'about.eyebrow':'Qui sommes-nous','about.title':'Une équipe jeune et dynamique, ancrée dans le transport',
      'about.text':"SGA est une entreprise ancrée depuis plusieurs années dans l'organisation de transport, de la logistique et de l'affrètement. Nous sommes une équipe jeune et dynamique à l'écoute des besoins de nos clients. Capable d'organiser tous types de transports sur le plan multimodal, notre réactivité nous a permis de nous déployer au niveau international.",
      'about.notion.transport':'Transport','about.notion.logistique':'Logistique','about.notion.affretement':'Affrètement','about.notion.multimodal':'Multimodal','about.notion.international':'International',
      'about.note':"Un large réseau de transporteurs sélectionnés pour répondre à chaque besoin, en France comme à l'international.",
      'about.photoTag':'Nos bureaux',
      'activities.eyebrow':'Nos activités','activities.title':'Un affréteur, quatre métiers',
      'activities.sub':"De l'organisation du transport à la mise à disposition d'espaces de stockage, SGA prend en charge l'ensemble de votre chaîne logistique.",
      'activities.stop1.title':'Affrètement','activities.stop1.text':'La solution de transport la plus adaptée à votre marchandise, en lots ou demi-lots.',
      'activities.stop2.title':'Stockage','activities.stop2.text':"Des solutions d'entreposage flexibles pour absorber vos pics d'activité.",
      'activities.stop3.title':'Logistique','activities.stop3.text':'Le pilotage de vos flux pour une chaîne de transport fluide, de bout en bout.',
      'activities.stop4.title':'Livraison express','activities.stop4.text':"Du local à l'international, une réactivité maximale sur vos délais serrés.",
      'cap.eyebrow':'Nos capacités','cap.title':'Des solutions de transport complètes et flexibles',
      'cap.tagline':'Des solutions concrètes et un réseau solide pour répondre à tous vos besoins de transport.',
      'cap.card1.title':'Transport routier','cap.card1.text':'Lots complets ou demi-lots : la solution routière la plus adaptée à votre marchandise.','cap.card1.tag2':'Plateau','cap.card1.tag3':'Fourgon',
      'cap.card2.title':'Multimodal','cap.card2.text':'Du ferroviaire à l\'aérien, nous organisons vos transports sur tous les modes selon vos contraintes.','cap.card2.rail':'Ferroviaire','cap.card2.sea':'Maritime','cap.card2.air':'Aérien',
      'cap.card3.text':"Une couverture qui s'étend du local à l'international, portée par nos deux sites en France.",
      'cap.card4.title':'Solutions sur mesure','cap.card4.text':'Température dirigée, hors gabarit, hayon : nous adaptons le véhicule aux contraintes de votre marchandise.','cap.card4.tag1':'Température dirigée','cap.card4.tag2':'Porte-voitures','cap.card4.tag3':'Hors norme',
      'pillar.transport.title':'Transport','pillar.transport.text':'Routier national et international, lots complets ou demi-lots.',
      'pillar.affretement.title':'Affrètement','pillar.affretement.text':'Un partenaire fiable pour chaque mission, chaque marchandise.',
      'pillar.europe.title':'France & Europe','pillar.europe.text':"Un réseau dense de plus de 4 000 transporteurs, pour couvrir toute la France et l'Europe.",
      'pillar.multimodal.title':'Multimodal','pillar.multimodal.text':'Routier, ferroviaire, maritime, aérien.',
      'why.eyebrow':'Pourquoi nous choisir','why.title':'Un partenaire, pas un simple prestataire',
      'why.item1':'Réduction des coûts de transport','why.item2':'Respect des délais de livraison','why.item3':'Délais de réponse rapides','why.item4':'Un interlocuteur dédié',
      'impl.eyebrow':'Implantation & réseau','impl.title':'Deux implantations, un réseau qui couvre la France et l\'Europe',
      'impl.legend.siege':'Siège social','impl.legend.bureau':'Bureau','impl.legend.reseau':'Réseau France','impl.legend.eu':'Réseau Europe',
      'team.eyebrow':'Notre équipe','team.title':"Des interlocuteurs dédiés, pas un centre d'appels",
      'role.director':'Directeur','role.intlForwarder':'Affréteur international','role.salesTransport':'Commercial transport','role.president':'Présidente / DAF','role.accounting':'Service comptabilité',
      'cta.title':'Prêt à optimiser votre transport ?','cta.text':'Un devis clair, une équipe réactive, un interlocuteur dédié à chaque étape.',
      'footer.tagline':"Affrètement, stockage et logistique — du local à l'international, sur tous les modes de transport.",
      'footer.navTitle':'Navigation','footer.contactTitle':'Contact',
      'footer.rights':'SGA Groupe — Fret, Stockage, Logistique. Tous droits réservés.','footer.madeWith':'Site réalisé avec Claude',
      'devis.eyebrow':'Devis en moins de 2 minutes','devis.title':'Demande de devis',
      'devis.sub':"Quelques informations et notre équipe revient vers vous avec une solution de transport adaptée.",
      'ps.contact':'Coordonnées','ps.route':'Trajet & dates','ps.goods':'Marchandise','ps.vehicle':'Véhicule','ps.recap':'Récap',
      's1.title':'Vos coordonnées','s1.sub':'Pour que notre équipe puisse revenir vers vous.',
      's1.nameLabel':'Nom / prénom ou société <span class="req">*</span>','s1.namePh':'Jean Dupont ou nom de société',
      's1.phoneLabel':'Téléphone <span class="req">*</span>','s1.phonePh':'06 00 00 00 00',
      's1.emailLabel':'E-mail <span class="req">*</span>','s1.emailPh':'vous@exemple.fr',
      'err.required':'Ce champ est requis.','err.weight':'Veuillez indiquer un poids valide.','btn.continue':'Continuer','btn.back':'Retour','city.noMatch':'Aucune ville trouvée',
      's2.title':'Votre trajet & vos délais','s2.sub':'D\'où part la marchandise, où doit-elle arriver, et quand ?',
      's2.dateFromLabel':'Date de chargement (départ) <span class="req">*</span>',
      's2.dateToLabel':'Date de livraison (arrivée) <span class="req">*</span>',
      's2.optLabel':'Délai & options',
      's2.urgent':'Transport urgent',
      's2.urgentHint':'Prise en charge prioritaire : nous traitons votre demande en premier.',
      's2.express':'Livraison express, le jour même',
      's2.expressHint':'Chargement et livraison le même jour. La date de livraison suit la date de chargement.',
      's2.rdv':'Rendez-vous imposé',
      's2.rdvHint':'Un horaire précis est exigé au chargement, à la livraison, ou aux deux.',
      's2.rdvRemove':'Retirer le rendez-vous',
      's2.rdvWhere':'Où le rendez-vous est-il imposé ? <span class="req">*</span>',
      's2.rdv.charg':'Au chargement',
      's2.rdv.livr':'À la livraison',
      's2.rdv.both':'Aux deux',
      's2.rdvTimeFrom':'Heure au chargement <span class="req">*</span>',
      's2.rdvTimeTo':'Heure à la livraison <span class="req">*</span>',
      'err.datePast':'La date ne peut pas être dans le passé.',
      'err.dateOrder':'La livraison ne peut pas précéder le chargement.',
      'recap.dateFrom':'Chargement',
      'recap.dateTo':'Livraison',
      'recap.urgent':'Urgent',
      'recap.express':'Livraison express (jour même)',
      'recap.rdv':'Rendez-vous',
      'rdv.charg':'chargement',
      'rdv.livr':'livraison',
      'rdv.at':'à',
      'mail.dateFrom':'Date de chargement : ',
      'mail.dateTo':'Date de livraison : ',
      'mail.urgent':'URGENT : oui',
      'mail.express':'Livraison express (jour même) : oui',
      'mail.rdv':'Rendez-vous : ',
      'mail.urgentTag':'URGENT',
      'mail.expressTag':'EXPRESS',
      'mail.yes':'Oui',
      'mail.no':'Non',

      's2.fromLabel':'Ville de départ <span class="req">*</span>','s2.fromPh':'Ville ou code postal',
      's2.toLabel':"Ville d'arrivée <span class=\"req\">*</span>",'s2.toPh':'Ville ou code postal',
      's3.title':'Votre marchandise','s3.sub':'Un ou plusieurs types de palettes / marchandises à transporter.',
      's3.addMerch':'Ajouter un autre type de marchandise',
      'merch.typeLabel':'Type de palette','merch.opt.europe':'Palette Europe / EUR – 120 × 80 cm','merch.opt.industrielle':'Palette industrielle – 120 × 100 cm','merch.opt.camion':'Camion complet','merch.opt.autre':'Autre / Hors norme',
      'merch.qtyLabel':'Nombre de palettes','merch.weightLabel':'Poids (kg) <span class="req">*</span>','merch.weightPh':'Ex : 350',
      'merch.weightMode.unit':'kg / palette','merch.weightMode.total':'kg au total',
      'merch.gerbableLabel':'Gerbable','merch.gerbable.yes':'Gerbable','merch.gerbable.no':'Non gerbable',
      'merch.dim.l':'Longueur (cm)','merch.dim.w':'Largeur (cm)','merch.dim.h':'Hauteur (cm)','merch.removeAria':'Supprimer',
      's4.title':'Véhicule & équipements','s4.sub':'Le type de véhicule et les équipements nécessaires.',
      's4.vehicleLabel':'Type de véhicule','s4.vehicle.tautliner':'Tautliner','s4.vehicle.plateau':'Plateau','s4.vehicle.fourgon':'Fourgon / camion','s4.vehicle.autre':'Autre',
      's4.equipLabel':'Équipements nécessaires','s4.equip.hayon':'Hayon','s4.equip.nohayon':'Pas de hayon nécessaire','s4.equip.autre':'Autre besoin',
      's4.hayonLocLabel':'Où le hayon est-il nécessaire ? <span class="req">*</span>','s4.hayonLoc.depart':'Au départ','s4.hayonLoc.arrivee':'À l\'arrivée','s4.hayonLoc.both':'Au départ et à l\'arrivée',
      's4.needLabel':'Besoin spécifique / information complémentaire','s4.needPh':'Précisions utiles pour votre transport (optionnel)',
      'btn.viewRecap':'Voir le récapitulatif',
      's5.title':'Récapitulatif','s5.sub':"Vérifiez votre demande avant l'envoi.",
      'recap.contact':'Coordonnées','recap.route':'Trajet','recap.goods':'Marchandise','recap.vehicle':'Véhicule','recap.edit':'Modifier',
      'btn.send':'Envoyer ma demande','btn.sending':'Envoi en cours…',
      'success.title':'Demande envoyée avec succès !',
      'success.text':'Notre équipe vous répond sous 30 minutes.',
      'success.backHome':"Retour à l'accueil",
      'error.title':'Une erreur est survenue',
      'error.text':"Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer ou nous contacter directement.",
      'error.retry':'Réessayer','error.callUs':'07 64 19 10 17',
      'mail.subjectPrefix':'Demande de devis - ','mail.fallbackName':'Site web','mail.intro':'Nouvelle demande de devis via le site SGA',
      'mail.contactHeader':'CONTACT','mail.name':'Nom / société : ','mail.phone':'Téléphone : ','mail.email':'E-mail : ',
      'mail.routeHeader':'TRAJET','mail.from':'Départ : ','mail.to':'Arrivée : ',
      'mail.goodsHeader':'MARCHANDISE','mail.vehicleHeader':'VEHICULE','mail.type':'Type : ','mail.equip':'Équipement : ',
      'mail.specificHeader':'BESOIN SPECIFIQUE','mail.perPallet':'par palette','mail.total':'au total','mail.dims':'dims','mail.notSpecified':'Non précisé',
      'vehicle.tautliner':'Tautliner','vehicle.plateau':'Plateau','vehicle.fourgon':'Fourgon / camion','vehicle.autre':'Autre',
      'hayon.hayon':'Hayon nécessaire','hayon.pas_hayon':'Pas de hayon nécessaire','hayon.autre_besoin':'Autre besoin',
      'hayonLoc.depart':'au départ','hayonLoc.arrivee':'à l\'arrivée','hayonLoc.depart_arrivee':'au départ et à l\'arrivée',
      'palette.europe':'Palette Europe / EUR (120 × 80 cm)','palette.industrielle':'Palette industrielle (120 × 100 cm)','palette.camion':'Camion complet','palette.autre':'Autre / Hors norme',
      'meta.title':'SGA Groupe — Affréteur routier national & international'
    },
    en: {
      'nav.about':'About us','nav.activities':'Activities','nav.implantation':'Locations','nav.team':'Contact',
      'cta.quote':'Request a quote','devisBack':'Back to site',
      'hero.eyebrow':'National & international freight forwarder',
      'svc.eyebrow':'Our services in detail','svc.title':'Freight brokerage, transport and storage: what SGA does for you','svc.more':'Learn more',
      'svc.1.title':'Road freight brokerage','svc.1.text':"Full or part loads, across France and Europe: we find the carrier that fits your goods.",
      'svc.2.title':'National & international transport','svc.2.text':"Road, rail, sea or air: the right mode of transport for every route, from local to international.",
      'svc.3.title':'Storage & logistics','svc.3.text':"Flexible warehousing to absorb your peaks in activity, and end-to-end management of your flows.",
      'footer.servicesTitle':'Services','footer.svc.affretement':'Road freight brokerage','footer.svc.transport':'National & international transport','footer.svc.stockage':'Storage & logistics','footer.svc.faq':'Frequently asked questions','footer.svc.about':'Who is SGA Groupe?','footer.legal':'Legal notice',
      'hero.title':'Your freight delivered to the right <em>place</em>, at the right <em>time</em>.',
      'hero.sub':'SGA organises your road, rail, sea and air transport, from local to international — with a dedicated contact from the first call through to delivery.',
      'hero.ctaQuote':'Request a free quote','hero.ctaActivities':'Discover our services','hero.fastReply':'Reply within 30 minutes',
      'stat.collab':'Partner carriers','stat.clients':'Clients','stat.sites':'Sites in France','stat.response':'Quote response',
      'trust.label':'Trusted by',
      'about.eyebrow':'Who we are','about.title':'A young, dynamic team, rooted in transport',
      'about.text':'SGA has been established for several years in the organisation of transport, logistics and freight brokerage. We are a young, dynamic team attentive to our clients\' needs. Able to organise all types of multimodal transport, our responsiveness has allowed us to expand internationally.',
      'about.notion.transport':'Transport','about.notion.logistique':'Logistics','about.notion.affretement':'Freight brokerage','about.notion.multimodal':'Multimodal','about.notion.international':'International',
      'about.note':'A wide network of carefully selected carriers to meet every need, in France and internationally.',
      'about.photoTag':'Our offices',
      'activities.eyebrow':'Our services','activities.title':'One forwarder, four areas of expertise',
      'activities.sub':"From organising transport to providing storage space, SGA takes care of your entire logistics chain.",
      'activities.stop1.title':'Freight forwarding','activities.stop1.text':'The transport solution best suited to your goods, full or part loads.',
      'activities.stop2.title':'Storage','activities.stop2.text':'Flexible storage solutions to absorb your activity peaks.',
      'activities.stop3.title':'Logistics','activities.stop3.text':'Managing your flows for a smooth, end-to-end transport chain.',
      'activities.stop4.title':'Express delivery','activities.stop4.text':'From local to international, maximum responsiveness for your tight deadlines.',
      'cap.eyebrow':'Our capabilities','cap.title':'Complete, flexible transport solutions',
      'cap.tagline':'Real solutions and a solid network to meet all your transport needs.',
      'cap.card1.title':'Road transport','cap.card1.text':'Full or part loads: the road solution best suited to your goods.','cap.card1.tag2':'Flatbed','cap.card1.tag3':'Box van',
      'cap.card2.title':'Multimodal','cap.card2.text':'From rail to air, we organise your transport across every mode to suit your constraints.','cap.card2.rail':'Rail','cap.card2.sea':'Sea','cap.card2.air':'Air',
      'cap.card3.text':'Coverage that spans from local to international, backed by our two sites in France.',
      'cap.card4.title':'Tailor-made solutions','cap.card4.text':'Temperature-controlled, oversized loads, tail lift: we adapt the vehicle to your goods\' requirements.','cap.card4.tag1':'Temperature-controlled','cap.card4.tag2':'Car transporter','cap.card4.tag3':'Oversized',
      'pillar.transport.title':'Transport','pillar.transport.text':'National and international road transport, full or part loads.',
      'pillar.affretement.title':'Freight brokerage','pillar.affretement.text':'A reliable partner for every job, every type of goods.',
      'pillar.europe.title':'France & Europe','pillar.europe.text':'A dense network of 4,000+ carriers, covering all of France and Europe.',
      'pillar.multimodal.title':'Multimodal','pillar.multimodal.text':'Road, rail, sea, air.',
      'why.eyebrow':'Why choose us','why.title':'A partner, not just a service provider',
      'why.item1':'Reduced transport costs','why.item2':'On-time deliveries','why.item3':'Fast response times','why.item4':'A dedicated contact',
      'impl.eyebrow':'Locations & network','impl.title':'Two locations, a network covering France and Europe',
      'impl.legend.siege':'Head office','impl.legend.bureau':'Office','impl.legend.reseau':'French network','impl.legend.eu':'European network',
      'team.eyebrow':'Our team','team.title':'Dedicated contacts, not a call centre',
      'role.director':'Director','role.intlForwarder':'International freight forwarder','role.salesTransport':'Transport sales','role.president':'President / CFO','role.accounting':'Accounting department',
      'cta.title':'Ready to optimise your transport?','cta.text':'A clear quote, a responsive team, a dedicated contact at every step.',
      'footer.tagline':'Freight forwarding, storage and logistics — from local to international, across every transport mode.',
      'footer.navTitle':'Navigation','footer.contactTitle':'Contact',
      'footer.rights':'SGA Groupe — Freight, Storage, Logistics. All rights reserved.','footer.madeWith':'Website built with Claude',
      'devis.eyebrow':'Quote in under 2 minutes','devis.title':'Quote request',
      'devis.sub':"A few details and our team will get back to you with a suitable transport solution.",
      'ps.contact':'Contact','ps.route':'Route & dates','ps.goods':'Goods','ps.vehicle':'Vehicle','ps.recap':'Summary',
      's1.title':'Your contact details','s1.sub':'So our team can get back to you.',
      's1.nameLabel':'Name or company <span class="req">*</span>','s1.namePh':'John Smith or company name',
      's1.phoneLabel':'Phone <span class="req">*</span>','s1.phonePh':'+33 6 00 00 00 00',
      's1.emailLabel':'Email <span class="req">*</span>','s1.emailPh':'you@example.com',
      'err.required':'This field is required.','err.weight':'Please enter a valid weight.','btn.continue':'Continue','btn.back':'Back','city.noMatch':'No matching city found',
      's2.title':'Your route & timing','s2.sub':'Where does the shipment start, where must it arrive, and when?',
      's2.dateFromLabel':'Pickup date <span class="req">*</span>',
      's2.dateToLabel':'Delivery date <span class="req">*</span>',
      's2.optLabel':'Timing & options',
      's2.urgent':'Urgent transport',
      's2.urgentHint':'Priority handling: we deal with your request first.',
      's2.express':'Express delivery, same day',
      's2.expressHint':'Pickup and delivery on the same day. The delivery date follows the pickup date.',
      's2.rdv':'Fixed appointment',
      's2.rdvHint':'A specific time is required at pickup, at delivery, or at both.',
      's2.rdvRemove':'Remove appointment',
      's2.rdvWhere':'Where is the appointment required? <span class="req">*</span>',
      's2.rdv.charg':'At pickup',
      's2.rdv.livr':'At delivery',
      's2.rdv.both':'At both',
      's2.rdvTimeFrom':'Pickup time <span class="req">*</span>',
      's2.rdvTimeTo':'Delivery time <span class="req">*</span>',
      'err.datePast':'The date cannot be in the past.',
      'err.dateOrder':'Delivery cannot be before pickup.',
      'recap.dateFrom':'Pickup',
      'recap.dateTo':'Delivery',
      'recap.urgent':'Urgent',
      'recap.express':'Express delivery (same day)',
      'recap.rdv':'Appointment',
      'rdv.charg':'pickup',
      'rdv.livr':'delivery',
      'rdv.at':'at',
      'mail.dateFrom':'Pickup date: ',
      'mail.dateTo':'Delivery date: ',
      'mail.urgent':'URGENT: yes',
      'mail.express':'Express delivery (same day): yes',
      'mail.rdv':'Appointment: ',
      'mail.urgentTag':'URGENT',
      'mail.expressTag':'EXPRESS',
      'mail.yes':'Yes',
      'mail.no':'No',

      's2.fromLabel':'Departure city <span class="req">*</span>','s2.fromPh':'City or postal code',
      's2.toLabel':'Arrival city <span class="req">*</span>','s2.toPh':'City or postal code',
      's3.title':'Your goods','s3.sub':'One or more types of pallets / goods to transport.',
      's3.addMerch':'Add another type of goods',
      'merch.typeLabel':'Pallet type','merch.opt.europe':'Euro pallet / EUR – 120 × 80 cm','merch.opt.industrielle':'Industrial pallet – 120 × 100 cm','merch.opt.camion':'Full truckload','merch.opt.autre':'Other / Oversized',
      'merch.qtyLabel':'Number of pallets','merch.weightLabel':'Weight (kg) <span class="req">*</span>','merch.weightPh':'E.g. 350',
      'merch.weightMode.unit':'kg / pallet','merch.weightMode.total':'kg total',
      'merch.gerbableLabel':'Stackable','merch.gerbable.yes':'Stackable','merch.gerbable.no':'Not stackable',
      'merch.dim.l':'Length (cm)','merch.dim.w':'Width (cm)','merch.dim.h':'Height (cm)','merch.removeAria':'Remove',
      's4.title':'Vehicle & equipment','s4.sub':'The vehicle type and any equipment you need.',
      's4.vehicleLabel':'Vehicle type','s4.vehicle.tautliner':'Tautliner','s4.vehicle.plateau':'Flatbed','s4.vehicle.fourgon':'Box van / truck','s4.vehicle.autre':'Other',
      's4.equipLabel':'Equipment needed','s4.equip.hayon':'Tail lift','s4.equip.nohayon':'No tail lift needed','s4.equip.autre':'Other requirement',
      's4.hayonLocLabel':'Where is the tail lift needed? <span class="req">*</span>','s4.hayonLoc.depart':'At pickup','s4.hayonLoc.arrivee':'At delivery','s4.hayonLoc.both':'At pickup and delivery',
      's4.needLabel':'Specific needs / additional information','s4.needPh':'Any useful details for your transport (optional)',
      'btn.viewRecap':'View summary',
      's5.title':'Summary','s5.sub':'Please review your request before sending.',
      'recap.contact':'Contact details','recap.route':'Route','recap.goods':'Goods','recap.vehicle':'Vehicle','recap.edit':'Edit',
      'btn.send':'Send my request','btn.sending':'Sending…',
      'success.title':'Request sent successfully!',
      'success.text':'Our team will get back to you within 30 minutes.',
      'success.backHome':'Back to homepage',
      'error.title':'Something went wrong',
      'error.text':'An error occurred while sending your request. Please try again or contact us directly.',
      'error.retry':'Try again','error.callUs':'+33 7 64 19 10 17',
      'mail.subjectPrefix':'Quote request - ','mail.fallbackName':'Website','mail.intro':'New quote request via the SGA website',
      'mail.contactHeader':'CONTACT','mail.name':'Name / company: ','mail.phone':'Phone: ','mail.email':'Email: ',
      'mail.routeHeader':'ROUTE','mail.from':'From: ','mail.to':'To: ',
      'mail.goodsHeader':'GOODS','mail.vehicleHeader':'VEHICLE','mail.type':'Type: ','mail.equip':'Equipment: ',
      'mail.specificHeader':'SPECIFIC REQUIREMENTS','mail.perPallet':'per pallet','mail.total':'total','mail.dims':'dims','mail.notSpecified':'Not specified',
      'vehicle.tautliner':'Tautliner','vehicle.plateau':'Flatbed','vehicle.fourgon':'Box van / truck','vehicle.autre':'Other',
      'hayon.hayon':'Tail lift required','hayon.pas_hayon':'No tail lift needed','hayon.autre_besoin':'Other requirement',
      'hayonLoc.depart':'at pickup','hayonLoc.arrivee':'at delivery','hayonLoc.depart_arrivee':'at pickup and delivery',
      'palette.europe':'Euro pallet / EUR (120 × 80 cm)','palette.industrielle':'Industrial pallet (120 × 100 cm)','palette.camion':'Full truckload','palette.autre':'Other / Oversized',
      'meta.title':'SGA Groupe — National & International Freight Forwarder'
    },
    es: {
      'nav.about':'Quiénes somos','nav.activities':'Actividades','nav.implantation':'Sedes','nav.team':'Contacto',
      'cta.quote':'Solicitar presupuesto','devisBack':'Volver al sitio',
      'hero.eyebrow':'Transitario nacional e internacional',
      'svc.eyebrow':'Nuestros servicios en detalle','svc.title':'Contratación de transporte, transporte y almacenaje: lo que SGA hace por usted','svc.more':'Saber más',
      'svc.1.title':'Contratación de transporte por carretera','svc.1.text':"Cargas completas o parciales, en Francia y en Europa: encontramos el transportista adecuado para su mercancía.",
      'svc.2.title':'Transporte nacional e internacional','svc.2.text':"Carretera, ferrocarril, mar o aire: el modo de transporte adecuado para cada trayecto, de lo local a lo internacional.",
      'svc.3.title':'Almacenaje y logística','svc.3.text':"Almacenamiento flexible para absorber sus picos de actividad y gestión de sus flujos de principio a fin.",
      'footer.servicesTitle':'Servicios','footer.svc.affretement':'Contratación de transporte por carretera','footer.svc.transport':'Transporte nacional e internacional','footer.svc.stockage':'Almacenaje y logística','footer.svc.faq':'Preguntas frecuentes','footer.svc.about':'¿Quién es SGA Groupe?','footer.legal':'Aviso legal',
      'hero.title':'Su mercancía entregada en el <em>lugar</em> justo, en el <em>momento</em> justo.',
      'hero.sub':'SGA organiza su transporte por carretera, ferrocarril, mar y aire, de lo local a lo internacional, con un interlocutor dedicado desde la primera llamada hasta la entrega.',
      'hero.ctaQuote':'Solicitar presupuesto gratuito','hero.ctaActivities':'Descubrir nuestras actividades','hero.fastReply':'Respuesta en 30 minutos',
      'stat.collab':'Transportistas asociados','stat.clients':'Clientes','stat.sites':'Sedes en Francia','stat.response':'Respuesta al presupuesto',
      'trust.label':'Confían en nosotros',
      'about.eyebrow':'Quiénes somos','about.title':'Un equipo joven y dinámico, arraigado en el transporte',
      'about.text':'SGA lleva varios años dedicada a la organización del transporte, la logística y la contratación de transporte. Somos un equipo joven y dinámico que escucha las necesidades de sus clientes. Capaces de organizar todo tipo de transporte multimodal, nuestra capacidad de respuesta nos ha permitido expandirnos a nivel internacional.',
      'about.notion.transport':'Transporte','about.notion.logistique':'Logística','about.notion.affretement':'Contratación de transporte','about.notion.multimodal':'Multimodal','about.notion.international':'Internacional',
      'about.note':'Una amplia red de transportistas seleccionados para responder a cada necesidad, en Francia y a nivel internacional.',
      'about.photoTag':'Nuestras oficinas',
      'activities.eyebrow':'Nuestras actividades','activities.title':'Un transitario, cuatro oficios',
      'activities.sub':"Desde la organización del transporte hasta la puesta a disposición de espacios de almacenaje, SGA se ocupa de toda su cadena logística.",
      'activities.stop1.title':'Contratación de transporte','activities.stop1.text':'La solución de transporte más adecuada para su mercancía, en cargas completas o parciales.',
      'activities.stop2.title':'Almacenaje','activities.stop2.text':'Soluciones de almacenamiento flexibles para absorber sus picos de actividad.',
      'activities.stop3.title':'Logística','activities.stop3.text':'La gestión de sus flujos para una cadena de transporte fluida, de principio a fin.',
      'activities.stop4.title':'Entrega urgente','activities.stop4.text':'De lo local a lo internacional, máxima capacidad de respuesta ante sus plazos ajustados.',
      'cap.eyebrow':'Nuestras capacidades','cap.title':'Soluciones de transporte completas y flexibles',
      'cap.tagline':'Soluciones concretas y una red sólida para responder a todas sus necesidades de transporte.',
      'cap.card1.title':'Transporte por carretera','cap.card1.text':'Cargas completas o parciales: la solución por carretera más adecuada para su mercancía.','cap.card1.tag2':'Plataforma','cap.card1.tag3':'Furgón',
      'cap.card2.title':'Multimodal','cap.card2.text':'Del ferrocarril al avión, organizamos su transporte con todos los modos según sus condicionantes.','cap.card2.rail':'Ferrocarril','cap.card2.sea':'Marítimo','cap.card2.air':'Aéreo',
      'cap.card3.text':'Una cobertura que va de lo local a lo internacional, respaldada por nuestras dos sedes en Francia.',
      'cap.card4.title':'Soluciones a medida','cap.card4.text':'Temperatura controlada, cargas excepcionales, plataforma elevadora: adaptamos el vehículo a las exigencias de su mercancía.','cap.card4.tag1':'Temperatura controlada','cap.card4.tag2':'Portacoches','cap.card4.tag3':'Carga excepcional',
      'pillar.transport.title':'Transporte','pillar.transport.text':'Transporte por carretera nacional e internacional, en cargas completas o parciales.',
      'pillar.affretement.title':'Contratación de transporte','pillar.affretement.text':'Un socio de confianza para cada trabajo y cada tipo de mercancía.',
      'pillar.europe.title':'Francia y Europa','pillar.europe.text':'Una densa red de más de 4.000 transportistas, para cubrir toda Francia y Europa.',
      'pillar.multimodal.title':'Multimodal','pillar.multimodal.text':'Carretera, ferrocarril, mar, aire.',
      'why.eyebrow':'Por qué elegirnos','why.title':'Un socio, no solo un proveedor de servicios',
      'why.item1':'Costes de transporte reducidos','why.item2':'Entregas puntuales','why.item3':'Respuesta rápida','why.item4':'Un interlocutor dedicado',
      'impl.eyebrow':'Sedes y red','impl.title':'Dos sedes, una red que cubre Francia y Europa',
      'impl.legend.siege':'Sede central','impl.legend.bureau':'Oficina','impl.legend.reseau':'Red francesa','impl.legend.eu':'Red europea',
      'team.eyebrow':'Nuestro equipo','team.title':'Interlocutores dedicados, no un centro de llamadas',
      'role.director':'Director','role.president':'Presidenta / Directora financiera','role.intlForwarder':'Transitario internacional','role.salesTransport':'Comercial de transporte','role.accounting':'Departamento de contabilidad',
      'cta.title':'¿Listo para optimizar su transporte?','cta.text':'Un presupuesto claro, un equipo ágil y un interlocutor dedicado en cada etapa.',
      'footer.tagline':'Transporte de mercancías, almacenaje y logística: de lo local a lo internacional, en todos los modos de transporte.',
      'footer.navTitle':'Navegación','footer.contactTitle':'Contacto',
      'footer.rights':'SGA Groupe — Transporte, almacenaje, logística. Todos los derechos reservados.','footer.madeWith':'Sitio web creado con Claude',
      'devis.eyebrow':'Presupuesto en menos de 2 minutos','devis.title':'Solicitud de presupuesto',
      'devis.sub':"Unos pocos datos y nuestro equipo le responderá con una solución de transporte adecuada.",
      'ps.contact':'Contacto','ps.route':'Trayecto y fechas','ps.goods':'Mercancía','ps.vehicle':'Vehículo','ps.recap':'Resumen',
      's1.title':'Sus datos de contacto','s1.sub':'Para que nuestro equipo pueda responderle.',
      's1.nameLabel':'Nombre o empresa <span class="req">*</span>','s1.namePh':'Juan Pérez o nombre de la empresa',
      's1.phoneLabel':'Teléfono <span class="req">*</span>','s1.phonePh':'+34 600 00 00 00',
      's1.emailLabel':'Correo electrónico <span class="req">*</span>','s1.emailPh':'usted@ejemplo.com',
      'err.required':'Este campo es obligatorio.','err.weight':'Introduzca un peso válido.','btn.continue':'Continuar','btn.back':'Atrás','city.noMatch':'No se ha encontrado ninguna ciudad',
      's2.title':'Su trayecto y plazos','s2.sub':'¿Dónde empieza el envío, adónde debe llegar y cuándo?',
      's2.dateFromLabel':'Fecha de carga (recogida) <span class="req">*</span>',
      's2.dateToLabel':'Fecha de entrega (llegada) <span class="req">*</span>',
      's2.optLabel':'Plazo y opciones',
      's2.urgent':'Transporte urgente',
      's2.urgentHint':'Gestión prioritaria: atendemos su solicitud en primer lugar.',
      's2.express':'Entrega exprés, el mismo día',
      's2.expressHint':'Carga y entrega el mismo día. La fecha de entrega sigue a la de carga.',
      's2.rdv':'Cita fijada',
      's2.rdvHint':'Se exige una hora concreta en la carga, en la entrega o en ambas.',
      's2.rdvRemove':'Quitar la cita',
      's2.rdvWhere':'¿Dónde se exige la cita? <span class="req">*</span>',
      's2.rdv.charg':'En la carga',
      's2.rdv.livr':'En la entrega',
      's2.rdv.both':'En ambas',
      's2.rdvTimeFrom':'Hora de carga <span class="req">*</span>',
      's2.rdvTimeTo':'Hora de entrega <span class="req">*</span>',
      'err.datePast':'La fecha no puede estar en el pasado.',
      'err.dateOrder':'La entrega no puede ser anterior a la carga.',
      'recap.dateFrom':'Carga',
      'recap.dateTo':'Entrega',
      'recap.urgent':'Urgente',
      'recap.express':'Entrega exprés (mismo día)',
      'recap.rdv':'Cita',
      'rdv.charg':'carga',
      'rdv.livr':'entrega',
      'rdv.at':'a las',
      'mail.dateFrom':'Fecha de carga: ',
      'mail.dateTo':'Fecha de entrega: ',
      'mail.urgent':'URGENTE: sí',
      'mail.express':'Entrega exprés (mismo día): sí',
      'mail.rdv':'Cita: ',
      'mail.urgentTag':'URGENTE',
      'mail.expressTag':'EXPRÉS',
      'mail.yes':'Sí',
      'mail.no':'No',

      's2.fromLabel':'Ciudad de origen <span class="req">*</span>','s2.fromPh':'Ciudad o código postal',
      's2.toLabel':'Ciudad de destino <span class="req">*</span>','s2.toPh':'Ciudad o código postal',
      's3.title':'Su mercancía','s3.sub':'Uno o varios tipos de palés / mercancías que transportar.',
      's3.addMerch':'Añadir otro tipo de mercancía',
      'merch.typeLabel':'Tipo de palé','merch.opt.europe':'Palé europeo / EUR – 120 × 80 cm','merch.opt.industrielle':'Palé industrial – 120 × 100 cm','merch.opt.camion':'Camión completo','merch.opt.autre':'Otro / Carga especial',
      'merch.qtyLabel':'Número de palés','merch.weightLabel':'Peso (kg) <span class="req">*</span>','merch.weightPh':'Ej. 350',
      'merch.weightMode.unit':'kg / palé','merch.weightMode.total':'kg en total',
      'merch.gerbableLabel':'Apilable','merch.gerbable.yes':'Apilable','merch.gerbable.no':'No apilable',
      'merch.dim.l':'Largo (cm)','merch.dim.w':'Ancho (cm)','merch.dim.h':'Alto (cm)','merch.removeAria':'Eliminar',
      's4.title':'Vehículo y equipamiento','s4.sub':'El tipo de vehículo y el equipamiento que necesita.',
      's4.vehicleLabel':'Tipo de vehículo','s4.vehicle.tautliner':'Tautliner (lona corredera)','s4.vehicle.plateau':'Plataforma','s4.vehicle.fourgon':'Furgón / camión furgón','s4.vehicle.autre':'Otro',
      's4.equipLabel':'Equipamiento necesario','s4.equip.hayon':'Plataforma elevadora','s4.equip.nohayon':'No se necesita plataforma elevadora','s4.equip.autre':'Otra necesidad',
      's4.hayonLocLabel':'¿Dónde se necesita la plataforma elevadora? <span class="req">*</span>','s4.hayonLoc.depart':'En la recogida','s4.hayonLoc.arrivee':'En la entrega','s4.hayonLoc.both':'En la recogida y en la entrega',
      's4.needLabel':'Necesidades específicas / información adicional','s4.needPh':'Cualquier detalle útil para su transporte (opcional)',
      'btn.viewRecap':'Ver resumen',
      's5.title':'Resumen','s5.sub':'Revise su solicitud antes de enviarla.',
      'recap.contact':'Datos de contacto','recap.route':'Trayecto','recap.goods':'Mercancía','recap.vehicle':'Vehículo','recap.edit':'Modificar',
      'btn.send':'Enviar mi solicitud','btn.sending':'Enviando…',
      'success.title':'¡Solicitud enviada correctamente!',
      'success.text':'Nuestro equipo le responderá en un plazo de 30 minutos.',
      'success.backHome':'Volver al inicio',
      'error.title':'Algo ha salido mal',
      'error.text':'Se ha producido un error al enviar su solicitud. Inténtelo de nuevo o contáctenos directamente.',
      'error.retry':'Reintentar','error.callUs':'+33 7 64 19 10 17',
      'mail.subjectPrefix':'Solicitud de presupuesto - ','mail.fallbackName':'Sitio web','mail.intro':'Nueva solicitud de presupuesto a través del sitio web de SGA',
      'mail.contactHeader':'CONTACTO','mail.name':'Nombre / empresa: ','mail.phone':'Teléfono: ','mail.email':'Correo electrónico: ',
      'mail.routeHeader':'TRAYECTO','mail.from':'Origen: ','mail.to':'Destino: ',
      'mail.goodsHeader':'MERCANCÍA','mail.vehicleHeader':'VEHÍCULO','mail.type':'Tipo: ','mail.equip':'Equipamiento: ',
      'mail.specificHeader':'NECESIDADES ESPECÍFICAS','mail.perPallet':'por palé','mail.total':'en total','mail.dims':'dimensiones','mail.notSpecified':'No especificado',
      'vehicle.tautliner':'Tautliner (lona corredera)','vehicle.plateau':'Plataforma','vehicle.fourgon':'Furgón / camión furgón','vehicle.autre':'Otro',
      'hayon.hayon':'Plataforma elevadora necesaria','hayon.pas_hayon':'No se necesita plataforma elevadora','hayon.autre_besoin':'Otra necesidad',
      'hayonLoc.depart':'en la recogida','hayonLoc.arrivee':'en la entrega','hayonLoc.depart_arrivee':'en la recogida y en la entrega',
      'palette.europe':'Palé europeo / EUR (120 × 80 cm)','palette.industrielle':'Palé industrial (120 × 100 cm)','palette.camion':'Camión completo','palette.autre':'Otro / Carga especial',
      'meta.title':'SGA Groupe — Transitario nacional e internacional'
    }
  };
  var currentLang = 'fr';
  function t(key){
    var d = I18N[currentLang] || I18N.fr;
    if(d[key] != null) return d[key];
    return (I18N.fr[key] != null) ? I18N.fr[key] : key;
  }
  function applyI18nScope(scope){
    scope.querySelectorAll('[data-i18n]').forEach(function(el){ el.textContent = t(el.getAttribute('data-i18n')); });
    scope.querySelectorAll('[data-i18n-html]').forEach(function(el){ el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    scope.querySelectorAll('[data-i18n-ph]').forEach(function(el){ el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
    scope.querySelectorAll('[data-i18n-aria]').forEach(function(el){ el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
  }
  var langChangeCallbacks = [];
  function applyLanguage(lang){
    currentLang = (lang === 'en' || lang === 'es') ? lang : 'fr';
    try{ localStorage.setItem('sga-lang', currentLang); }catch(e){}
    root.setAttribute('lang', currentLang);
    document.title = t('meta.title');
    applyI18nScope(document);
    document.querySelectorAll('.lang-btn').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-lang') === currentLang);
    });
    langChangeCallbacks.forEach(function(fn){ fn(currentLang); });
  }
  var savedLang = null;
  try{ savedLang = localStorage.getItem('sga-lang'); }catch(e){}
  document.querySelectorAll('.lang-btn').forEach(function(btn){
    btn.addEventListener('click', function(){ applyLanguage(btn.getAttribute('data-lang')); });
  });
  applyLanguage((savedLang === 'en' || savedLang === 'es') ? savedLang : 'fr');

  /* ---------- Header scroll ----------
     Throttled to one check per animation frame (not per scroll event, which can
     fire far more often than 60fps during momentum/trackpad scrolling), and uses
     two different thresholds to enter vs. exit the "scrolled" state (hysteresis)
     so the header never flickers on/off while the scroll position settles near
     the boundary. The class is only ever toggled when it actually needs to
     change, so no unnecessary style recalculation happens on every frame. */
  var header = document.getElementById('site-header');
  var devisHeader = document.querySelector('.devis-header');
  var headerScrolled = false;
  var headerTicking = false;
  function applyHeaderScrollState(){
    headerTicking = false;
    var y = window.scrollY || window.pageYOffset || 0;
    if(!headerScrolled && y > 40){ headerScrolled = true; }
    else if(headerScrolled && y < 16){ headerScrolled = false; }
    if(header && header.classList.contains('scrolled') !== headerScrolled){ header.classList.toggle('scrolled', headerScrolled); }
    if(devisHeader && devisHeader.classList.contains('scrolled') !== headerScrolled){ devisHeader.classList.toggle('scrolled', headerScrolled); }
  }
  window.addEventListener('scroll', function(){
    if(!headerTicking){
      headerTicking = true;
      window.requestAnimationFrame(applyHeaderScrollState);
    }
  }, {passive:true});
  applyHeaderScrollState();

  /* ---------- Pause off-screen continuous animations ----------
     The background drift (.bg-motif) and the Implantation map's animated
     connection lines / pin pulses keep SGA's visual identity, but there is no
     reason to keep painting them every frame while their section is scrolled
     out of view. IntersectionObserver toggles a class that pauses them via
     animation-play-state (no removal, no restart glitch) whenever the element
     is not near the viewport, and resumes them as soon as it is. */
  if('IntersectionObserver' in window){
    var motifTargets = document.querySelectorAll('.bg-motif, .impl-map-card');
    if(motifTargets.length){
      var motifObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          entry.target.classList.toggle('motif-paused', !entry.isIntersecting);
        });
      }, {rootMargin:'120px 0px 120px 0px', threshold:0});
      motifTargets.forEach(function(el){ motifObserver.observe(el); });
    }
  }

  /* ---------- Arrivée depuis une autre page : toujours en haut ---------- */
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

  /* ---------- Mobile nav ---------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('mainNav');
  if(burger && nav){
    burger.addEventListener('click', function(){ nav.classList.toggle('open'); });
    nav.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', function(){ nav.classList.remove('open'); }); });
  }

  /* ---------- Marquee duplication ---------- */
  var track = document.getElementById('marqueeTrack');
  if(track){ track.innerHTML += track.innerHTML; }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){ entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, {threshold:.12, rootMargin:'0px 0px -60px 0px'});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in'); });
  }

  var yearEl = document.getElementById('year');
  if(yearEl){ yearEl.textContent = new Date().getFullYear(); }

  /* ---------- Road timeline (activités) ---------- */
  (function(){
    var lane = document.querySelector('.road-lane');
    var truck = document.getElementById('roadTruck');
    var stops = document.querySelectorAll('.road-stop');
    if(!lane || !truck || !stops.length) return;
    var ticking = false;
    function update(){
      var rect = lane.getBoundingClientRect();
      var laneHeight = rect.height;
      var truckH = truck.offsetHeight || 90;
      var viewportCenter = window.innerHeight * 0.48;
      var progress = (viewportCenter - rect.top) / laneHeight;
      progress = Math.max(0, Math.min(1, progress));
      var maxTop = Math.max(0, laneHeight - truckH);
      truck.style.top = (progress * maxTop) + 'px';
      stops.forEach(function(stop){
        var srect = stop.getBoundingClientRect();
        var scenter = srect.top + srect.height / 2;
        if(Math.abs(scenter - viewportCenter) < srect.height * 0.62){
          stop.classList.add('active');
        }
      });
      ticking = false;
    }
    function onScroll(){
      if(!ticking){ window.requestAnimationFrame(update); ticking = true; }
    }
    window.addEventListener('scroll', onScroll, {passive:true});
    window.addEventListener('resize', onScroll);
    update();
  })();

  /* ---------- About photo carousel (bureaux) ---------- */
  (function(){
    var box = document.getElementById('aboutPhoto');
    if(!box) return;
    var imgs = Array.prototype.slice.call(box.querySelectorAll('img'));
    var dots = Array.prototype.slice.call(box.querySelectorAll('.about-photo-dots button'));
    if(imgs.length < 2) return;
    var idx = 0;
    var timer = null;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function go(n){
      idx = (n + imgs.length) % imgs.length;
      imgs.forEach(function(img, i){ img.classList.toggle('active', i === idx); });
      dots.forEach(function(d, i){ d.classList.toggle('active', i === idx); });
    }
    function next(){ go(idx + 1); }
    function start(){
      if(reduceMotion || timer) return;
      timer = setInterval(next, 4200);
    }
    function stop(){
      if(timer){ clearInterval(timer); timer = null; }
    }
    dots.forEach(function(d, i){
      d.addEventListener('click', function(){ go(i); stop(); start(); });
    });
    /* Only a real mouse pointer pauses the slideshow: on a phone a tap fires emulated
       mouse events that would freeze it until the visitor taps somewhere else. */
    box.addEventListener('pointerenter', function(e){ if(e.pointerType === 'mouse'){ stop(); } });
    box.addEventListener('pointerleave', function(e){ if(e.pointerType === 'mouse'){ start(); } });
    start();
  })();

  /* ================================================================ */
  /* ========================= VIEW ROUTER =========================== */
  /* ================================================================ */
  var viewHome = document.getElementById('view-home');
  var viewDevis = document.getElementById('view-devis');
  function showView(hash){
    if(hash === '#devis'){
      /* Only wipe the wizard if the previous visit ended in a successful
         send — a fresh request should start from a blank form. If the
         visitor is just mid-way through filling it in (or hit an error)
         and navigates away/back, their answers must stay intact. */
      if(typeof devisSuccessfullySent !== 'undefined' && devisSuccessfullySent && typeof resetWizardForm === 'function'){
        resetWizardForm();
      }
      viewHome.hidden = true;
      viewDevis.hidden = false;
      window.scrollTo(0,0);
    } else {
      viewDevis.hidden = true;
      viewHome.hidden = false;
    }
  }
  window.addEventListener('hashchange', function(){ showView(window.location.hash); });
  showView(window.location.hash);

  /* ================================================================ */
  /* ============================ WIZARD =============================*/
  /* ================================================================ */
  var form = document.getElementById('devisForm');
  if(!form) return;

  var TOTAL_STEPS = 5;
  var currentStep = 1;
  var devisSuccessfullySent = false;
  var steps = form.querySelectorAll('.wizard-step[data-step]');
  var progressFill = document.getElementById('progressFill');
  var progressSteps = document.querySelectorAll('.progress-steps .ps');
  var progressWrap = document.getElementById('progressWrap');

  function goToStep(n){
    currentStep = n;
    steps.forEach(function(s){
      s.classList.toggle('active', s.getAttribute('data-step') == String(n));
    });
    if(n === 'success'){
      progressWrap.style.display = 'none';
    } else {
      progressWrap.style.display = '';
      progressFill.style.width = (n / TOTAL_STEPS * 100) + '%';
      progressSteps.forEach(function(ps){
        var psNum = parseInt(ps.getAttribute('data-ps'), 10);
        ps.classList.toggle('active', psNum === n);
        ps.classList.toggle('done', psNum < n);
      });
    }
    var card = document.querySelector('.wizard-card');
    if(card){ card.scrollIntoView({behavior:'smooth', block:'start'}); }
    if(n === 5){ renderRecap(); }
  }

  function validateStep(n){
    var stepEl = form.querySelector('.wizard-step[data-step="'+n+'"]');
    if(!stepEl) return true;
    var ok = true;
    var required = stepEl.querySelectorAll('[required]');
    required.forEach(function(inp){
      var valid = inp.value && inp.value.trim().length > 0;
      if(inp.type === 'email' && valid){ valid = /\S+@\S+\.\S+/.test(inp.value); }
      if(inp.type === 'number' && valid){
        var n2 = parseFloat(inp.value);
        valid = !isNaN(n2) && isFinite(n2) && n2 > 0;
      }
      inp.classList.toggle('field-error', !valid);
      var fieldWrap = inp.closest('.field') || inp.parentElement;
      var err = fieldWrap ? fieldWrap.querySelector('.error-msg') : null;
      if(err){ err.classList.toggle('show', !valid); }
      if(!valid){ ok = false; }
    });
    /* Dates, express & appointment (step 2) */
    if(n === 2 && !validateTiming()){ ok = false; }
    /* Hayon: once "Hayon" is selected, where it's needed becomes mandatory. */
    if(n === 4){
      var hayonCode = getChoiceValue('hayonGroup');
      var locErr = document.getElementById('hayonLocationError');
      if(hayonCode === 'hayon' && !getChoiceValue('hayonLocationGroup')){
        ok = false;
        if(locErr){ locErr.classList.add('show'); }
      } else if(locErr){
        locErr.classList.remove('show');
      }
    }
    return ok;
  }

  form.querySelectorAll('.js-next').forEach(function(btn){
    btn.addEventListener('click', function(){
      if(!validateStep(currentStep)) return;
      goToStep(Math.min(currentStep + 1, TOTAL_STEPS));
    });
  });
  form.querySelectorAll('.js-back').forEach(function(btn){
    btn.addEventListener('click', function(){
      goToStep(Math.max(currentStep - 1, 1));
    });
  });

  /* ---------- Choice groups (single select buttons) ----------
     Delegated on the document (rather than bound per-group at load time) so
     that groups created later — the per-merchandise-row "gerbable" choice —
     work identically to the static ones without needing their own wiring. */
  document.addEventListener('click', function(e){
    var btn = e.target.closest('.choice-group .choice-btn');
    if(!btn) return;
    var group = btn.closest('.choice-group');
    group.querySelectorAll('.choice-btn').forEach(function(b){ b.classList.remove('selected'); });
    btn.classList.add('selected');
    if(group.id === 'hayonGroup'){
      var locField = document.getElementById('hayonLocationField');
      if(locField){
        var needsLoc = btn.getAttribute('data-value') === 'hayon';
        locField.hidden = !needsLoc;
        if(!needsLoc){
          var locGroup = document.getElementById('hayonLocationGroup');
          if(locGroup){ locGroup.querySelectorAll('.choice-btn').forEach(function(b){ b.classList.remove('selected'); }); }
          var locErr = document.getElementById('hayonLocationError');
          if(locErr){ locErr.classList.remove('show'); }
        }
      }
    }
  });
  function getChoiceValue(groupId){
    var group = document.getElementById(groupId);
    if(!group) return '';
    var sel = group.querySelector('.choice-btn.selected');
    return sel ? sel.getAttribute('data-value') : '';
  }

  /* ---------- Dates, urgency, express & appointment (step 2) ---------- */
  var fDateFrom = document.getElementById('f-date-depart');
  var fDateTo = document.getElementById('f-date-arrivee');
  var fUrgent = document.getElementById('f-urgent');
  var fExpress = document.getElementById('f-express');
  var fRdv = document.getElementById('f-rdv');
  var rdvBox = document.getElementById('rdvBox');
  var rdvFromWrap = document.getElementById('rdvTimeFromWrap');
  var rdvToWrap = document.getElementById('rdvTimeToWrap');
  var fRdvFrom = document.getElementById('f-rdv-charg');
  var fRdvTo = document.getElementById('f-rdv-livr');

  function todayISO(){
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }
  function fmtDate(iso){
    if(!iso){ return ''; }
    var p = iso.split('-');
    var loc = currentLang === 'es' ? 'es-ES' : (currentLang === 'en' ? 'en-GB' : 'fr-FR');
    try{
      return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(loc, {weekday:'long', day:'numeric', month:'long', year:'numeric'});
    }catch(e){ return p[2] + '/' + p[1] + '/' + p[0]; }
  }
  function syncDateLimits(){
    var today = todayISO();
    fDateFrom.min = today;
    fDateTo.min = (fDateFrom.value && fDateFrom.value > today) ? fDateFrom.value : today;
    if(fExpress.checked){
      fDateTo.value = fDateFrom.value;
      fDateTo.readOnly = true;
    } else {
      fDateTo.readOnly = false;
    }
    /* delivery can never stay before pickup */
    if(!fExpress.checked && fDateFrom.value && fDateTo.value && fDateTo.value < fDateFrom.value){ fDateTo.value = fDateFrom.value; }
  }
  function syncOptionCards(){
    [fUrgent, fExpress, fRdv].forEach(function(cb){
      var card = cb.closest('.opt-card');
      if(card){ card.classList.toggle('checked', cb.checked); }
    });
  }
  function syncRdv(){
    var on = fRdv.checked;
    rdvBox.hidden = !on;
    var code = on ? getChoiceValue('rdvGroup') : '';
    var needFrom = (code === 'charg' || code === 'both');
    var needTo = (code === 'livr' || code === 'both');
    rdvFromWrap.hidden = !needFrom;
    rdvToWrap.hidden = !needTo;
    if(!needFrom){ fRdvFrom.value = ''; }
    if(!needTo){ fRdvTo.value = ''; }
    if(!on){
      var g = document.getElementById('rdvGroup');
      if(g){ g.querySelectorAll('.choice-btn').forEach(function(b){ b.classList.remove('selected'); }); }
      var e = document.getElementById('rdvWhereError'); if(e){ e.classList.remove('show'); }
    }
  }
  fDateFrom.addEventListener('change', syncDateLimits);
  fDateFrom.addEventListener('input', syncDateLimits);
  fExpress.addEventListener('change', function(){
    if(fExpress.checked){
      if(!fDateFrom.value){ fDateFrom.value = todayISO(); }
      fUrgent.checked = true;
    }
    syncDateLimits(); syncOptionCards();
  });
  fUrgent.addEventListener('change', syncOptionCards);
  fRdv.addEventListener('change', function(){ syncRdv(); syncOptionCards(); });
  document.getElementById('rdvRemove').addEventListener('click', function(){
    fRdv.checked = false; syncRdv(); syncOptionCards();
    [fRdvFrom, fRdvTo].forEach(function(inp){ inp.classList.remove('field-error'); var f = inp.closest('.field'); var m = f && f.querySelector('.error-msg'); if(m){ m.classList.remove('show'); } });
    var card = fRdv.closest('.opt-card'); if(card && card.scrollIntoView){ try{ card.scrollIntoView({block:'nearest',behavior:'smooth'}); }catch(e){} }
  });
  document.addEventListener('click', function(e){
    var b = e.target.closest('#rdvGroup .choice-btn');
    if(b){ syncRdv(); var er = document.getElementById('rdvWhereError'); if(er){ er.classList.remove('show'); } }
  });
  syncDateLimits();

  function setExtra(id, show){
    var el = document.getElementById(id);
    if(el){ el.classList.toggle('show', !!show); }
  }
  function validateTiming(){
    var ok = true, today = todayISO();
    var df = fDateFrom.value, dt = fDateTo.value;
    var pastErr = !!(df && df < today);
    var orderErr = !!(df && dt && dt < df);
    setExtra('dateFromPast', pastErr);
    setExtra('dateToOrder', orderErr);
    if(pastErr){ fDateFrom.classList.add('field-error'); ok = false; }
    if(orderErr){ fDateTo.classList.add('field-error'); ok = false; }
    if(fRdv.checked){
      var code = getChoiceValue('rdvGroup');
      var whereErr = document.getElementById('rdvWhereError');
      if(!code){
        ok = false;
        if(whereErr){ whereErr.classList.add('show'); }
      } else {
        if(whereErr){ whereErr.classList.remove('show'); }
        [[fRdvFrom, rdvFromWrap], [fRdvTo, rdvToWrap]].forEach(function(pair){
          var inp = pair[0], wrap = pair[1];
          if(wrap.hidden){ inp.classList.remove('field-error'); return; }
          var valid = !!inp.value;
          inp.classList.toggle('field-error', !valid);
          var err = wrap.querySelector('.error-msg');
          if(err){ err.classList.toggle('show', !valid); }
          if(!valid){ ok = false; }
        });
      }
    }
    return ok;
  }
  function collectTiming(){
    var code = fRdv.checked ? getChoiceValue('rdvGroup') : '';
    var parts = [];
    if((code === 'charg' || code === 'both') && fRdvFrom.value){ parts.push(t('rdv.charg') + ' ' + t('rdv.at') + ' ' + fRdvFrom.value); }
    if((code === 'livr' || code === 'both') && fRdvTo.value){ parts.push(t('rdv.livr') + ' ' + t('rdv.at') + ' ' + fRdvTo.value); }
    return {
      from: fmtDate(fDateFrom.value),
      to: fmtDate(fDateTo.value),
      urgent: fUrgent.checked,
      express: fExpress.checked,
      rdv: parts.join(' · ')
    };
  }

  /* ---------- Merchandise rows ---------- */
  var merchList = document.getElementById('merchList');
  var merchCount = 0;

  function addMerchRow(){
    merchCount++;
    var id = merchCount;
    var row = document.createElement('div');
    row.className = 'merch-row';
    row.setAttribute('data-merch-id', id);
    row.innerHTML =
      '<button type="button" class="merch-remove" aria-label="Supprimer" data-i18n-aria="merch.removeAria" data-remove="'+id+'">'+
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'+
      '</button>'+
      '<div class="field-row">'+
        '<div class="field">'+
          '<label data-i18n="merch.typeLabel">Type de palette</label>'+
          '<select class="merch-type" data-id="'+id+'">'+
            '<option value="europe" data-i18n="merch.opt.europe">Palette Europe / EUR – 120 × 80 cm</option>'+
            '<option value="industrielle" data-i18n="merch.opt.industrielle">Palette industrielle – 120 × 100 cm</option>'+
            '<option value="camion" data-i18n="merch.opt.camion">Camion complet</option>'+
            '<option value="autre" data-i18n="merch.opt.autre">Autre / Hors norme</option>'+
          '</select>'+
        '</div>'+
        '<div class="field merch-qty-field">'+
          '<label data-i18n="merch.qtyLabel">Nombre de palettes</label>'+
          '<div class="stepper">'+
            '<button type="button" class="merch-qty-minus" data-id="'+id+'">−</button>'+
            '<input type="number" class="merch-qty" data-id="'+id+'" value="1" min="1">'+
            '<button type="button" class="merch-qty-plus" data-id="'+id+'">+</button>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div class="field">'+
        '<label data-i18n-html="merch.weightLabel">Poids (kg) <span class="req">*</span></label>'+
        '<div class="weight-inline">'+
          '<input type="number" class="merch-weight" data-id="'+id+'" min="0" step="any" placeholder="Ex : 350" data-i18n-ph="merch.weightPh" required>'+
          '<select class="merch-weight-mode" data-id="'+id+'">'+
            '<option value="unitaire" data-i18n="merch.weightMode.unit">kg / palette</option>'+
            '<option value="total" data-i18n="merch.weightMode.total">kg au total</option>'+
          '</select>'+
        '</div>'+
        '<span class="error-msg" data-i18n="err.weight">Veuillez indiquer un poids valide.</span>'+
      '</div>'+
      '<div class="field">'+
        '<label data-i18n="merch.gerbableLabel">Gerbable</label>'+
        '<div class="choice-group merch-gerbable-group" data-id="'+id+'">'+
          '<button type="button" class="choice-btn" data-value="gerbable" data-i18n="merch.gerbable.yes">Gerbable</button>'+
          '<button type="button" class="choice-btn" data-value="non_gerbable" data-i18n="merch.gerbable.no">Non gerbable</button>'+
        '</div>'+
      '</div>'+
      '<div class="merch-dims" data-id="'+id+'">'+
        '<div class="field"><label data-i18n="merch.dim.l">Longueur (cm)</label><input type="number" class="merch-l" data-id="'+id+'" min="0"></div>'+
        '<div class="field"><label data-i18n="merch.dim.w">Largeur (cm)</label><input type="number" class="merch-w" data-id="'+id+'" min="0"></div>'+
        '<div class="field"><label data-i18n="merch.dim.h">Hauteur (cm)</label><input type="number" class="merch-h" data-id="'+id+'" min="0"></div>'+
      '</div>';
    merchList.appendChild(row);
    applyI18nScope(row);
    updateMerchRemoveButtons();
  }

  function updateMerchRemoveButtons(){
    var rows = merchList.querySelectorAll('.merch-row');
    rows.forEach(function(row){
      var btn = row.querySelector('.merch-remove');
      btn.style.visibility = rows.length > 1 ? 'visible' : 'hidden';
    });
  }

  merchList.addEventListener('click', function(e){
    var removeBtn = e.target.closest('.merch-remove');
    if(removeBtn){
      var id = removeBtn.getAttribute('data-remove');
      var row = merchList.querySelector('.merch-row[data-merch-id="'+id+'"]');
      if(row) row.remove();
      updateMerchRemoveButtons();
      return;
    }
    var minus = e.target.closest('.merch-qty-minus');
    if(minus){
      var qi = merchList.querySelector('.merch-qty[data-id="'+minus.getAttribute('data-id')+'"]');
      qi.value = Math.max(1, (parseInt(qi.value,10)||1) - 1);
      return;
    }
    var plus = e.target.closest('.merch-qty-plus');
    if(plus){
      var qi2 = merchList.querySelector('.merch-qty[data-id="'+plus.getAttribute('data-id')+'"]');
      qi2.value = (parseInt(qi2.value,10)||1) + 1;
      return;
    }
  });

  merchList.addEventListener('change', function(e){
    if(e.target.classList.contains('merch-type')){
      var id = e.target.getAttribute('data-id');
      var dims = merchList.querySelector('.merch-dims[data-id="'+id+'"]');
      if(dims){ dims.classList.toggle('show', e.target.value === 'autre'); }
      applyTruckMode(e.target.closest('.merch-row'));
    }
  });

  /* "Camion complet": no pallet count or dimensions to fill in, the weight (mandatory)
     is given for the whole load. */
  function applyTruckMode(row){
    if(!row) return;
    var isTruck = row.querySelector('.merch-type').value === 'camion';
    row.classList.toggle('is-truck', isTruck);
    var mode = row.querySelector('.merch-weight-mode');
    if(isTruck){
      mode.value = 'total';
      mode.disabled = true;
      row.querySelector('.merch-qty').value = 1;
    } else {
      mode.disabled = false;
    }
  }

  document.getElementById('addMerchBtn').addEventListener('click', addMerchRow);
  addMerchRow(); // first row by default

  function collectMerch(){
    var rows = merchList.querySelectorAll('.merch-row');
    var list = [];
    rows.forEach(function(row){
      var id = row.getAttribute('data-merch-id');
      var type = row.querySelector('.merch-type').value;
      var qty = row.querySelector('.merch-qty').value;
      var weight = row.querySelector('.merch-weight').value;
      var weightMode = row.querySelector('.merch-weight-mode').value;
      var gerbableBtn = row.querySelector('.merch-gerbable-group .choice-btn.selected');
      var gerbableCode = gerbableBtn ? gerbableBtn.getAttribute('data-value') : '';
      var item = {
        type: type,
        typeLabel: t('palette.'+type) || type,
        qty: type === 'camion' ? '1' : qty,
        weight: weight,
        weightMode: weightMode === 'total' ? t('mail.total') : t('mail.perPallet'),
        gerbable: gerbableCode,
        gerbableLabel: gerbableCode ? t('merch.gerbable.'+(gerbableCode === 'gerbable' ? 'yes' : 'no')) : ''
      };
      if(type === 'autre'){
        item.l = row.querySelector('.merch-l').value;
        item.w = row.querySelector('.merch-w').value;
        item.h = row.querySelector('.merch-h').value;
      }
      list.push(item);
    });
    return list;
  }

  /* ---------- Recap ---------- */
  function renderRecap(){
    var nom = document.getElementById('f-nom').value;
    var tel = document.getElementById('f-tel').value;
    var email = document.getElementById('f-email').value;
    var depart = document.getElementById('f-depart').value;
    var arrivee = document.getElementById('f-arrivee').value;
    var vehiculeCode = getChoiceValue('vehiculeGroup');
    var hayonCode = getChoiceValue('hayonGroup');
    var hayonLocCode = getChoiceValue('hayonLocationGroup');
    var vehicule = vehiculeCode ? t('vehicle.'+vehiculeCode) : '—';
    var hayon = hayonCode ? t('hayon.'+hayonCode) : '—';
    if(hayonCode === 'hayon' && hayonLocCode){ hayon += ' (' + t('hayonLoc.'+hayonLocCode) + ')'; }
    var besoin = document.getElementById('f-besoin').value;
    var merch = collectMerch();

    var tm = collectTiming();
    var timingHtml = '<div><b>' + t('recap.dateFrom') + '</b> : ' + escapeHtml(tm.from) + '</div>' +
      '<div><b>' + t('recap.dateTo') + '</b> : ' + escapeHtml(tm.to) + '</div>';
    if(tm.rdv){ timingHtml += '<div><b>' + t('recap.rdv') + '</b> : ' + escapeHtml(tm.rdv) + '</div>'; }
    if(tm.urgent || tm.express){
      timingHtml += '<div>' + (tm.urgent ? '<span class="recap-tag">' + t('recap.urgent') + '</span>' : '') +
        (tm.express ? '<span class="recap-tag">' + t('recap.express') + '</span>' : '') + '</div>';
    }

    var merchHtml = merch.map(function(m){
      var line = '<div>' + (m.type === 'camion' ? '' : m.qty + '× ') + '<b>' + m.typeLabel + '</b>';
      if(m.weight){ line += ' — ' + m.weight + ' kg (' + m.weightMode + ')'; }
      if(m.gerbableLabel){ line += ' — ' + m.gerbableLabel; }
      if(m.type === 'autre' && (m.l || m.w || m.h)){ line += ' — ' + (m.l||'?') + '×' + (m.w||'?') + '×' + (m.h||'?') + ' cm'; }
      line += '</div>';
      return line;
    }).join('');

    var html =
      '<div class="recap-block"><h4>'+t('recap.contact')+' <a href="#" data-goto="1">'+t('recap.edit')+'</a></h4>'+
        '<div class="recap-content"><div><b>'+escapeHtml(nom)+'</b></div><div>'+escapeHtml(tel)+' · '+escapeHtml(email)+'</div></div></div>'+
      '<div class="recap-block"><h4>'+t('recap.route')+' <a href="#" data-goto="2">'+t('recap.edit')+'</a></h4>'+
        '<div class="recap-content"><div>'+escapeHtml(depart)+' → '+escapeHtml(arrivee)+'</div>'+timingHtml+'</div></div>'+
      '<div class="recap-block"><h4>'+t('recap.goods')+' <a href="#" data-goto="3">'+t('recap.edit')+'</a></h4>'+
        '<div class="recap-content">'+(merchHtml || '<div>—</div>')+'</div></div>'+
      '<div class="recap-block"><h4>'+t('recap.vehicle')+' <a href="#" data-goto="4">'+t('recap.edit')+'</a></h4>'+
        '<div class="recap-content"><div>'+escapeHtml(vehicule)+' · '+escapeHtml(hayon)+'</div>'+(besoin ? '<div>'+escapeHtml(besoin)+'</div>' : '')+'</div></div>';

    document.getElementById('recapContent').innerHTML = html;
    document.getElementById('recapContent').querySelectorAll('[data-goto]').forEach(function(a){
      a.addEventListener('click', function(e){ e.preventDefault(); goToStep(parseInt(a.getAttribute('data-goto'),10)); });
    });
  }
  langChangeCallbacks.push(function(){ if(currentStep === 5){ renderRecap(); } });

  function escapeHtml(str){
    var d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  /* ---------- Submit — automatic e-mail sending ----------
     DEVIS_MAIL_CONFIG is the single place to reconfigure where/how quote
     requests are sent once the site is moved to its own hosting:
       - recipientEmail : inbox that receives the request
       - senderName     : display name shown as the sender of the notification
       - subjectPrefix  : text prepended to the customer's name in the e-mail subject
       - endpoint       : leave empty to keep using the FormSubmit.co relay
                           (https://formsubmit.co/ajax/<recipientEmail>, no backend required).
                           Set it to an absolute URL (e.g. "/send-devis.php", see the
                           bundled send-devis.php) to post to your own mail backend instead —
                           no other code change is required, the JSON payload below is the
                           same shape either way. */
  var DEVIS_MAIL_CONFIG = {
    recipientEmail: 'loris@sga-groupe.fr',
    senderName: 'Site web SGA Groupe',
    subjectPrefix: 'Demande de devis - ',
    endpoint: ''
  };

  var devisIsSubmitting = false;

  form.addEventListener('submit', function(e){
    e.preventDefault();
    if(devisIsSubmitting){ return; }

    /* Defense in depth: re-check the steps that carry mandatory fields
       (weight, hayon location) before anything is actually sent, in case
       the recap was reached any other way than the normal "next" flow. */
    if(!validateStep(2)){ goToStep(2); return; }
    if(!validateStep(3)){ goToStep(3); return; }
    if(!validateStep(4)){ goToStep(4); return; }

    var nom = document.getElementById('f-nom').value;
    var tel = document.getElementById('f-tel').value;
    var email = document.getElementById('f-email').value;
    var depart = document.getElementById('f-depart').value;
    var arrivee = document.getElementById('f-arrivee').value;
    var vehiculeCode = getChoiceValue('vehiculeGroup');
    var hayonCode = getChoiceValue('hayonGroup');
    var hayonLocCode = getChoiceValue('hayonLocationGroup');
    var vehicule = vehiculeCode ? t('vehicle.'+vehiculeCode) : t('mail.notSpecified');
    var hayon = hayonCode ? t('hayon.'+hayonCode) : t('mail.notSpecified');
    if(hayonCode === 'hayon' && hayonLocCode){ hayon += ' (' + t('hayonLoc.'+hayonLocCode) + ')'; }
    var besoin = document.getElementById('f-besoin').value;
    var merch = collectMerch();
    var tm = collectTiming();

    var lines = [
      t('mail.intro'),
      '',
      t('mail.contactHeader'),
      t('mail.name') + nom,
      t('mail.phone') + tel,
      t('mail.email') + email,
      '',
      t('mail.routeHeader'),
      t('mail.from') + depart,
      t('mail.to') + arrivee,
      t('mail.dateFrom') + tm.from,
      t('mail.dateTo') + tm.to
    ];
    if(tm.urgent){ lines.push(t('mail.urgent')); }
    if(tm.express){ lines.push(t('mail.express')); }
    if(tm.rdv){ lines.push(t('mail.rdv') + tm.rdv); }
    lines.push('');
    lines.push(t('mail.goodsHeader'));
    merch.forEach(function(m, i){
      var l = (i+1) + '. ' + (m.type === 'camion' ? '' : m.qty + ' x ') + m.typeLabel;
      if(m.weight){ l += ' — ' + m.weight + ' kg (' + m.weightMode + ')'; }
      if(m.gerbableLabel){ l += ' — ' + m.gerbableLabel; }
      if(m.type === 'autre' && (m.l || m.w || m.h)){ l += ' — ' + t('mail.dims') + ' ' + (m.l||'?') + 'x' + (m.w||'?') + 'x' + (m.h||'?') + ' cm'; }
      lines.push(l);
    });
    lines.push('');
    lines.push(t('mail.vehicleHeader'));
    lines.push(t('mail.type') + vehicule);
    lines.push(t('mail.equip') + hayon);
    if(besoin){ lines.push(''); lines.push(t('mail.specificHeader')); lines.push(besoin); }

    var subjectTags = (tm.urgent ? '[' + t('mail.urgentTag') + '] ' : '') + (tm.express ? '[' + t('mail.expressTag') + '] ' : '');
    var subjectText = subjectTags + DEVIS_MAIL_CONFIG.subjectPrefix + (nom || t('mail.fallbackName'));
    var bodyText = lines.join('\n');

    var submitBtn = form.querySelector('.wizard-step[data-step="5"] button[type="submit"]');
    var submitBtnOriginal = submitBtn ? submitBtn.textContent : '';

    devisIsSubmitting = true;
    if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = t('btn.sending'); }

    var payload = {
      _subject: subjectText,
      _template: 'table',
      _captcha: 'false',
      _replyto: email,
      'Expéditeur': DEVIS_MAIL_CONFIG.senderName,
      'Nom / société': nom,
      'Téléphone': tel,
      'E-mail': email,
      'Départ': depart,
      'Arrivée': arrivee,
      'Date de chargement': tm.from,
      'Date de livraison': tm.to,
      'Urgent': tm.urgent ? t('mail.yes') : t('mail.no'),
      'Livraison express (jour même)': tm.express ? t('mail.yes') : t('mail.no'),
      'Rendez-vous': tm.rdv || t('mail.no'),
      'Véhicule': vehicule,
      'Équipement': hayon,
      'Détail de la demande': bodyText
    };

    var endpoint = DEVIS_MAIL_CONFIG.endpoint || ('https://formsubmit.co/ajax/' + DEVIS_MAIL_CONFIG.recipientEmail);

    var done = false;
    var safetyTimer = setTimeout(function(){ onResult(false); }, 15000);

    function onResult(success){
      if(done){ return; }
      done = true;
      clearTimeout(safetyTimer);
      devisIsSubmitting = false;
      if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = submitBtnOriginal; }
      if(success){
        try{ sessionStorage.setItem('sgaDevisLastSent', String(Date.now())); }catch(err){}
        try{ if(window.sgaTrack){ window.sgaTrack('quote'); } }catch(err){}
      }
      showDevisResult(success);
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(res){
      onResult(!!(res && res.ok));
    }).catch(function(){
      onResult(false);
    });
  });

  /* Shows the genuine outcome of the send: never a success screen unless the
     request actually went through. */
  function showDevisResult(success){
    var successBox = document.getElementById('devisSuccessBox');
    var errorBox = document.getElementById('devisErrorBox');
    if(successBox){ successBox.hidden = !success; }
    if(errorBox){ errorBox.hidden = !!success; }
    devisSuccessfullySent = !!success;
    goToStep('success');
  }

  /* Wipes the wizard back to a blank step 1 — used only when re-opening the
     form after a request was already sent successfully, so a second request
     starts clean. Never called while the visitor is mid-form or on the
     error screen, so an accidental "back to home" never loses what they
     already typed. */
  function resetWizardForm(){
    form.reset();
    form.querySelectorAll('.choice-group .choice-btn.selected').forEach(function(b){ b.classList.remove('selected'); });
    form.querySelectorAll('.field-error').forEach(function(el){ el.classList.remove('field-error'); });
    form.querySelectorAll('.error-msg.show').forEach(function(el){ el.classList.remove('show'); });
    var locField = document.getElementById('hayonLocationField');
    if(locField){ locField.hidden = true; }
    syncRdv(); syncOptionCards(); syncDateLimits();
    ['dateFromPast','dateToOrder','rdvWhereError'].forEach(function(id){ setExtra(id, false); });
    if(merchList){
      merchList.innerHTML = '';
      addMerchRow();
    }
    var successBox = document.getElementById('devisSuccessBox');
    var errorBox = document.getElementById('devisErrorBox');
    if(successBox){ successBox.hidden = false; }
    if(errorBox){ errorBox.hidden = true; }
    devisIsSubmitting = false;
    devisSuccessfullySent = false;
    goToStep(1);
  }

  var retryBtn = document.getElementById('retrySubmitBtn');
  if(retryBtn){
    retryBtn.addEventListener('click', function(){
      if(devisIsSubmitting){ return; }
      if(form.requestSubmit){
        form.requestSubmit();
      } else {
        var evt = document.createEvent('Event');
        evt.initEvent('submit', true, true);
        form.dispatchEvent(evt);
      }
    });
  }

})();
