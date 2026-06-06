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
       timeline is frozen (transitions can't advance). Fires after the CSS
       fade would already be complete in a normal browser, so it is a no-op
       there but a safety net elsewhere. */
    function settle(el){
      setTimeout(()=>{ el.style.transition='none'; el.style.opacity='1'; el.style.transform='none'; }, 1000);
    }

    /* ---------- mobile nav ---------- */
    const navToggle = document.getElementById('navToggle');
    const navClose  = document.getElementById('navClose');
    const mobileNav = document.getElementById('mobileNav');
    if(navToggle && mobileNav){
      const openNav = ()=>{ mobileNav.classList.add('open'); mobileNav.setAttribute('aria-hidden','false'); navToggle.setAttribute('aria-expanded','true'); document.body.style.overflow='hidden'; };
      const closeNav = ()=>{ mobileNav.classList.remove('open'); mobileNav.setAttribute('aria-hidden','true'); navToggle.setAttribute('aria-expanded','false'); document.body.style.overflow=''; };
      navToggle.addEventListener('click', openNav);
      navClose && navClose.addEventListener('click', closeNav);
      mobileNav.querySelectorAll('a').forEach(a=> a.addEventListener('click', closeNav));
      document.addEventListener('keydown', e=>{ if(e.key==='Escape' && mobileNav.classList.contains('open')) closeNav(); });
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
    if(webgl){
      const heroCanvas = document.getElementById('hero-canvas');
      const anaCanvas  = document.getElementById('anatomy-canvas');
      const overlay    = document.querySelector('.anatomy-overlay');
      try{ hero = window.ANASA_initHero(heroCanvas); }catch(e){ console.warn('hero failed', e); document.documentElement.classList.add('no-webgl'); }
      try{ anatomy = window.ANASA_initAnatomy(anaCanvas, overlay); }catch(e){ console.warn('anatomy failed', e); }
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
    const track  = document.querySelector('.anatomy-track');
    const progBar= document.querySelector('.anatomy-progress .bar i');
    function onScroll(){
      // hero scroll factor (0 at top -> 1 after one viewport)
      if(hero){
        const ht = Math.min(1, Math.max(0, window.scrollY / (heroEl.offsetHeight||window.innerHeight)));
        hero.setScroll(ht);
      }
      // anatomy progress across its tall track
      if(track){
        const r = track.getBoundingClientRect();
        const vh = window.innerHeight;
        const span = r.height - vh;
        let p = span>0 ? (-r.top)/span : 0;
        p = Math.max(0, Math.min(1, p));
        if(anatomy) anatomy.setProgress(p);
        if(progBar) progBar.style.width = (p*100).toFixed(1)+'%';
      }
    }
    onScroll(); window.addEventListener('scroll', onScroll, {passive:true});

    /* ---------- finishes: click swatch -> prefill enquiry ---------- */
    document.querySelectorAll('.finish').forEach(f=>{
      f.addEventListener('click', ()=>{
        const name = f.dataset.name||'';
        const ta = document.querySelector('#enq-project');
        if(ta){
          const base = 'I am interested in the '+name+' finish';
          ta.value = ta.value && ta.value.indexOf(base)===-1 ? ta.value+'. '+base : base+'.';
          ta.dispatchEvent(new Event('input'));
        }
        const c = document.getElementById('contact');
        if(c){
          const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          window.scrollTo({ top: c.getBoundingClientRect().top + window.scrollY - 10, behavior: smooth ? 'smooth' : 'auto' });
        }
      });
    });

    /* ---------- enquiry form ---------- */
    const form = document.querySelector('form.enquiry');
    if(form){
      const success = document.querySelector('.form-success');
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      form.addEventListener('submit', (e)=>{
        e.preventDefault();
        let ok=true;
        form.querySelectorAll('[data-required]').forEach(inp=>{
          const field = inp.closest('.field');
          let bad = !inp.value.trim();
          if(inp.type==='email' && inp.value.trim() && !emailRe.test(inp.value.trim())) bad=true;
          field.classList.toggle('error', bad);
          if(bad) ok=false;
        });
        if(!ok) return;
        form.style.display='none';
        success.classList.add('show');
      });
      form.querySelectorAll('input,textarea').forEach(inp=>{
        inp.addEventListener('input', ()=>{ const f=inp.closest('.field'); if(f) f.classList.remove('error'); });
      });
    }

    /* ---------- year ---------- */
    const y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();
  });
})();
