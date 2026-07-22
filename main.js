/* ANASA — site controller */
(function(){
  'use strict';

  function hasWebGL(){
    try{
      const c=document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl')||c.getContext('experimental-webgl')));
    }catch(e){ return false; }
  }

  document.addEventListener('DOMContentLoaded', function(){
    const webgl = hasWebGL() && typeof THREE !== 'undefined';
    if(!webgl) document.documentElement.classList.add('no-webgl');

    /* ---------- header condense ---------- */
    const header = document.querySelector('.site-header');
    const onScrollHeader = ()=>{ header.classList.toggle('condensed', window.scrollY > 40); };
    onScrollHeader(); window.addEventListener('scroll', onScrollHeader, {passive:true});

    /* settle(): guarantees the visible end-state even where the document
       timeline is frozen (transitions can't advance). Ends on the real
       transitionend; the timer covers the longest duration+delay in use
       (1.1s + .52s stagger) as the safety net. */
    function settle(el){
      const done = ()=>{ el.style.transition='none'; el.style.opacity='1'; el.style.transform='none'; };
      el.addEventListener('transitionend', done, {once:true});
      setTimeout(done, 1800);
    }

    /* ---------- mobile nav ---------- */
    const navToggle = document.getElementById('navToggle');
    const navClose  = document.getElementById('navClose');
    const mobileNav = document.getElementById('mobileNav');
    if(navToggle && mobileNav){
      let lastFocus = null;
      const openNav = ()=>{
        lastFocus = document.activeElement;
        mobileNav.classList.add('open');
        mobileNav.setAttribute('aria-hidden','false');
        navToggle.setAttribute('aria-expanded','true');
        document.body.style.overflow='hidden';
        (navClose || mobileNav.querySelector('a')).focus();
      };
      const closeNav = ()=>{
        mobileNav.classList.remove('open');
        mobileNav.setAttribute('aria-hidden','true');
        navToggle.setAttribute('aria-expanded','false');
        document.body.style.overflow='';
        (lastFocus && document.contains(lastFocus) ? lastFocus : navToggle).focus();
      };
      navToggle.addEventListener('click', openNav);
      navClose && navClose.addEventListener('click', closeNav);
      mobileNav.querySelectorAll('a').forEach(a=> a.addEventListener('click', closeNav));
      document.addEventListener('keydown', e=>{
        if(!mobileNav.classList.contains('open')) return;
        if(e.key==='Escape'){ closeNav(); return; }
        if(e.key!=='Tab') return;
        const items = mobileNav.querySelectorAll('button, a[href]');
        const first = items[0], last = items[items.length-1];
        if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
      });
    }

    /* ---------- hero entrance ---------- */
    const heroSec = document.querySelector('.hero');
    if(heroSec){
      setTimeout(()=> heroSec.classList.add('ready'), 90);
      heroSec.querySelectorAll('.hero-anim').forEach(settle);
    }

    /* ---------- reveal on scroll ---------- */
    const revs = document.querySelectorAll('.reveal');
    if('IntersectionObserver' in window){
      const io = new IntersectionObserver((ents)=>{
        ents.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); settle(e.target); io.unobserve(e.target); } });
      }, { threshold:0.16, rootMargin:'0px 0px -8% 0px' });
      revs.forEach(r=>io.observe(r));
    } else { revs.forEach(r=>{ r.classList.add('in'); settle(r); }); }

    /* ---------- 3D scenes ---------- */
    let hero=null, anatomy=null;
    const anatomySection = document.getElementById('anatomy');
    const track = document.querySelector('.anatomy-track');
    /* collapse the tall scroll track whenever the 3D cross-section is replaced
       by the static fallback, so no dead scroll distance remains */
    function anatomyFallback(){
      if(anatomySection) anatomySection.classList.add('no-3d');
      if(track) track.style.height='auto';
    }
    if(!webgl && track) track.style.height='auto';

    if(webgl){
      const heroCanvas = document.getElementById('hero-canvas');
      const anaCanvas  = document.getElementById('anatomy-canvas');
      const overlay    = document.querySelector('.anatomy-overlay');
      try{ hero = window.ANASA_initHero(heroCanvas); }
      catch(e){
        console.warn('hero failed', e);
        document.documentElement.classList.add('no-webgl');
        if(track) track.style.height='auto';
      }
      if(!document.documentElement.classList.contains('no-webgl')){
        try{ anatomy = window.ANASA_initAnatomy(anaCanvas, overlay); }
        catch(e){ console.warn('anatomy failed', e); anatomyFallback(); }
      }
      window.__hero = hero; window.__anatomy = anatomy;

      // play/pause by visibility for performance
      if('IntersectionObserver' in window){
        if(hero){
          const ho=new IntersectionObserver((es)=>es.forEach(e=> e.isIntersecting?hero.play():hero.stop()), {threshold:0.02});
          ho.observe(document.querySelector('.hero'));
        }
        if(anatomy){
          const ao=new IntersectionObserver((es)=>es.forEach(e=> e.isIntersecting?anatomy.play():anatomy.stop()), {threshold:0.02});
          ao.observe(document.querySelector('.anatomy-sticky'));
        }
      } else { hero&&hero.play(); anatomy&&anatomy.play(); }
    }

    /* ---------- scroll-linked progress ---------- */
    const heroEl = document.querySelector('.hero');
    const progBar= document.querySelector('.anatomy-progress .bar i');
    const anatomyIntro = document.querySelector('.anatomy-intro');
    let heroH = window.innerHeight, trackTop = 0, trackSpan = 0, lastP = -1;
    function onScroll(){
      // hero scroll factor (0 at top -> 1 after one viewport)
      if(hero) hero.setScroll(Math.min(1, Math.max(0, window.scrollY / heroH)));
      // anatomy progress across its tall track
      if(track){
        let p = trackSpan>0 ? (window.scrollY - trackTop)/trackSpan : 0;
        p = Math.max(0, Math.min(1, p));
        if(p !== lastP){
          lastP = p;
          if(anatomy) anatomy.setProgress(p);
          if(progBar) progBar.style.width = (p*100).toFixed(1)+'%';
          // intro copy yields to the annotations as the leaf separates
          if(anatomyIntro){
            anatomyIntro.style.opacity = String(Math.max(0, 1 - p*3));
            anatomyIntro.style.pointerEvents = p>0.3 ? 'none' : '';
          }
        }
      }
    }
    /* layout reads cached here; onScroll itself reads only window.scrollY */
    function measure(){
      if(heroEl) heroH = heroEl.offsetHeight || window.innerHeight;
      if(track){
        const r = track.getBoundingClientRect();
        trackTop = r.top + window.scrollY;
        trackSpan = r.height - window.innerHeight;
      }
      lastP = -1;
      onScroll();
    }
    measure();
    window.addEventListener('scroll', onScroll, {passive:true});
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    /* ---------- finishes: add to enquiry ---------- */
    document.querySelectorAll('.finish').forEach(f=>{
      const btn = f.querySelector('.plus');
      if(!btn) return;
      btn.addEventListener('click', ()=>{
        const name = f.dataset.name||'';
        const ta = document.querySelector('#enq-project');
        if(ta){
          const base = 'I am interested in the '+name+' finish';
          if(ta.value.indexOf(base)===-1){
            const prev = ta.value.trim().replace(/\.$/,'');
            ta.value = prev ? prev+'. '+base+'.' : base+'.';
            ta.dispatchEvent(new Event('input'));
          }
        }
        const c = document.getElementById('contact');
        if(c){
          const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          c.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
        }
      });
    });

    /* ---------- enquiry form: validate, then POST to Web3Forms so the enquiry
       is emailed to the atelier automatically (static hosting, no backend).
       Get a free access key at https://web3forms.com — enter
       info@anasaluxurydoors.co.za, confirm the email, then paste the key below. ---------- */
    const WEB3FORMS_ACCESS_KEY = '1c6b332f-0d8d-4bee-99f3-c696e244429f';
    const form = document.querySelector('form.enquiry');
    if(form){
      const success = document.querySelector('.form-success');
      const errBox = form.querySelector('.form-error');
      const submitBtn = form.querySelector('button[type="submit"]');
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      form.addEventListener('submit', async (e)=>{
        e.preventDefault();
        let firstBad = null;
        form.querySelectorAll('[data-required]').forEach(inp=>{
          const field = inp.closest('.field');
          let bad = !inp.value.trim();
          if(inp.type==='email' && inp.value.trim() && !emailRe.test(inp.value.trim())) bad=true;
          field.classList.toggle('error', bad);
          inp.setAttribute('aria-invalid', bad ? 'true' : 'false');
          if(bad && !firstBad) firstBad = inp;
        });
        if(firstBad){ firstBad.focus(); return; }

        const val = id => { const el=document.getElementById(id); return el ? el.value.trim() : ''; };
        const bot = form.querySelector('[name="botcheck"]');
        const payload = {
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: 'Enquiry — ANASA Luxury Doors',
          from_name: 'ANASA Luxury Doors — Website',
          name: val('enq-name'),
          email: val('enq-email'),
          phone: val('enq-phone') || '—',
          project: val('enq-project'),
          botcheck: bot ? bot.checked : false
        };

        if(errBox) errBox.classList.remove('show');
        const btnHtml = submitBtn ? submitBtn.innerHTML : '';
        if(submitBtn){ submitBtn.disabled = true; submitBtn.setAttribute('aria-busy','true'); submitBtn.innerHTML = 'Sending…'; }

        try{
          const res = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if(!data.success) throw new Error(data.message || 'Submission failed');
          form.style.display='none';
          if(success){
            success.classList.add('show');
            const h = success.querySelector('[tabindex="-1"]');
            if(h) h.focus();
          }
        }catch(err){
          if(submitBtn){ submitBtn.disabled = false; submitBtn.removeAttribute('aria-busy'); submitBtn.innerHTML = btnHtml; }
          if(errBox){
            errBox.textContent = 'Sorry — your enquiry could not be sent just now. Please try again, or email us directly at info@anasaluxurydoors.co.za.';
            errBox.classList.add('show');
            errBox.focus();
          }
        }
      });
      form.querySelectorAll('input,textarea').forEach(inp=>{
        inp.addEventListener('input', ()=>{
          const f=inp.closest('.field'); if(f) f.classList.remove('error');
          inp.removeAttribute('aria-invalid');
        });
      });
    }

    /* ---------- year ---------- */
    const y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();
  });
})();
