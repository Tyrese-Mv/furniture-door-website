/* ANASA — Anatomy: exploded door cross-section */
(function(){

  function plywoodTex(hex){
    const w=256,h=512, c=document.createElement('canvas'); c.width=w;c.height=h;
    const x=c.getContext('2d'); const base=new THREE.Color(hex);
    x.fillStyle='#'+base.getHexString(); x.fillRect(0,0,w,h);
    // horizontal lamination bands (edge view of a multi-layer board)
    let y=0;
    while(y<h){
      const band = 10+Math.random()*16;
      const shade = base.clone().multiplyScalar(0.8+Math.random()*0.4);
      x.fillStyle='#'+shade.getHexString(); x.fillRect(0,y,w,band);
      x.fillStyle='rgba(0,0,0,0.18)'; x.fillRect(0,y+band-1.4,w,1.4);
      y+=band;
    }
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping;
    if(THREE.sRGBEncoding) t.encoding=THREE.sRGBEncoding; return t;
  }
  function graphiteTex(){
    const s=512, c=document.createElement('canvas'); c.width=s;c.height=s;
    const x=c.getContext('2d');
    x.fillStyle='#37373a'; x.fillRect(0,0,s,s);
    for(let i=0;i<26000;i++){
      const g=Math.random();
      const v = g<0.5 ? 30+Math.random()*18 : 70+Math.random()*60;
      x.fillStyle='rgba('+v+','+v+','+(v+4)+','+(0.25+Math.random()*0.5)+')';
      x.fillRect(Math.random()*s, Math.random()*s, 1.2, 1.2);
    }
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping;
    if(THREE.sRGBEncoding) t.encoding=THREE.sRGBEncoding; return t;
  }

  window.ANASA_initAnatomy = function(canvas, overlay){
    if(typeof THREE === 'undefined') return null;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
    renderer.setClearColor(0x000000,0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
    if(THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    scene.environment = window.ANASA_env(renderer);
    const camera = new THREE.PerspectiveCamera(18, 1, 0.1, 100);
    camera.position.set(0, 0, 16);

    const root = new THREE.Group(); scene.add(root);

    const W=1.18, H=2.62;
    // layer defs: front -> back
    const veneerWood = window.ANASA_makeWood('#C8A578', {streaks:260});
    const boardWood  = plywoodTex('#8a6a4c');
    const graphite   = graphiteTex();

    const defs = [
      { id:'veneer', t:0.022, mat:new THREE.MeshStandardMaterial({map:veneerWood, roughness:0.42, metalness:0.0}) },
      { id:'board',  t:0.10,  mat:new THREE.MeshStandardMaterial({map:boardWood, roughness:0.7, metalness:0.0}) },
      { id:'core',   t:0.14,  mat:new THREE.MeshStandardMaterial({map:graphite, roughness:0.96, metalness:0.0, color:0xbfbfc4}) },
      { id:'board2', t:0.10,  mat:new THREE.MeshStandardMaterial({map:boardWood, roughness:0.7, metalness:0.0}) },
      { id:'veneer2',t:0.022, mat:new THREE.MeshStandardMaterial({map:veneerWood, roughness:0.42, metalness:0.0}) },
    ];
    // compute closed-stack centre z
    const total = defs.reduce((s,d)=>s+d.t,0);
    let z = total/2;
    const layers = [];
    defs.forEach(d=>{
      z -= d.t/2;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(W, H, d.t), d.mat);
      mesh.position.z = z;
      mesh.userData.baseZ = z;
      root.add(mesh);
      layers.push(mesh);
      z -= d.t/2;
    });
    // thin gold edge band wrapping the closed leaf (decorative)
    const edge = new THREE.Mesh(new THREE.BoxGeometry(W*1.004, H*1.004, total*1.02),
      new THREE.MeshStandardMaterial({color:0xC9A24B, metalness:1, roughness:0.3, transparent:true, opacity:0.0}));
    root.add(edge);

    // lights
    scene.add(new THREE.AmbientLight(0xffffff,0.22));
    const key=new THREE.DirectionalLight(0xfff0d6,2.0); key.position.set(-2,2.4,3.4); scene.add(key);
    const rim=new THREE.DirectionalLight(0xE8C874,1.3); rim.position.set(3,1,-2); scene.add(rim);
    const fill=new THREE.DirectionalLight(0xC9A24B,0.5); fill.position.set(2,-1,2); scene.add(fill);

    // annotations
    const annos = overlay ? Array.from(overlay.querySelectorAll('.anno')) : [];
    const GAP = 2.0;

    let prog = 0, progCur = 0;
    let dragX = 0, dragTarget = 0, dragging=false, lastX=0;
    let raf=null, running=false, start=performance.now();

    let baseDist = 6.2;
    function resize(){
      const r=canvas.getBoundingClientRect();
      const w=r.width||window.innerWidth, h=r.height||window.innerHeight;
      renderer.setSize(w,h,false);
      camera.aspect=w/h;
      baseDist = (w/h<0.8)? 19.5 : (w/h<1.1?17.5:15.5);
      camera.updateProjectionMatrix();
    }

    function setProgress(p){ prog = Math.max(0,Math.min(1,p)); }

    // pointer drag to rotate
    function down(e){ dragging=true; lastX=(e.touches?e.touches[0].clientX:e.clientX); }
    function move(e){
      if(!dragging) return;
      const cx=(e.touches?e.touches[0].clientX:e.clientX);
      dragTarget += (cx-lastX)*0.005; lastX=cx;
      dragTarget=Math.max(-0.7,Math.min(0.7,dragTarget));
    }
    function up(){ dragging=false; }
    canvas.addEventListener('pointerdown',down); window.addEventListener('pointermove',move); window.addEventListener('pointerup',up);

    const v = new THREE.Vector3();
    const NS = 'http://www.w3.org/2000/svg';
    let svg = null;
    if(overlay){
      svg = overlay.querySelector('.anno-lines');
      if(!svg){ svg = document.createElementNS(NS,'svg'); svg.setAttribute('class','anno-lines'); overlay.insertBefore(svg, overlay.firstChild); }
      annos.forEach(el=>{
        const ln = document.createElementNS(NS,'line'); svg.appendChild(ln); el._line = ln;
      });
    }
    const ANCHOR_Y = { 0: H*0.30, 1: H*0.05, 2: -H*0.20 };
    function updateAnnos(explode){
      if(!annos.length) return;
      const rect = canvas.getBoundingClientRect();
      const colX = rect.width * (rect.width < 760 ? 0.66 : 0.69);
      const show = explode > 0.34;
      annos.forEach((el, k)=>{
        const li = parseInt(el.dataset.layer,10);
        const mesh = layers[li];
        if(!mesh) return;
        const ay = (li in ANCHOR_Y) ? ANCHOR_Y[li] : H*0.2;
        mesh.localToWorld(v.set(0, ay, (mesh.geometry.parameters.depth/2)));
        v.project(camera);
        const sx = (v.x*0.5+0.5)*rect.width;
        const sy = (-v.y*0.5+0.5)*rect.height;
        const cardY = rect.height*(0.30 + k*0.205);
        const dot = el.querySelector('.dot');
        const card = el.querySelector('.anno-card');
        if(dot){ dot.style.left = sx+'px'; dot.style.top = sy+'px'; }
        if(card){ card.style.left = colX+'px'; card.style.top = cardY+'px'; }
        if(el._line){
          el._line.setAttribute('x1', sx); el._line.setAttribute('y1', sy);
          el._line.setAttribute('x2', colX-3); el._line.setAttribute('y2', cardY);
          el._line.classList.toggle('show', show && v.z<1);
        }
        el.classList.toggle('show', show && v.z<1);
      });
    }

    function applyFrame(explode, t){
      const e2 = explode*explode*(3-2*explode); // smoothstep for a settled finish
      layers.forEach((m,i)=>{
        m.position.z = m.userData.baseZ + (i-2)*GAP*explode;
        m.position.y = (i-2)*0.14*explode;          // slight vertical fan
      });
      root.position.x = -0.5*e2;                    // drift left to clear the labels
      edge.material.opacity = Math.max(0, 0.5 - explode*1.6);
      const idle = reduce?0:Math.sin(t*0.3)*0.04;
      // three-quarter view so the fanned layers read as a cross-section
      root.rotation.y = -0.05 - e2*0.66 + dragX + idle;
      root.rotation.x = 0.05 + e2*0.14;
      camera.position.z = baseDist + explode*2.4;
      camera.updateProjectionMatrix();
      renderer.render(scene,camera);
      updateAnnos(explode);
    }

    function loop(now){
      const t=(now-start)/1000;
      progCur += (prog-progCur)*0.08;
      dragX += (dragTarget-dragX)*0.08;
      applyFrame(progCur, t);
      raf=requestAnimationFrame(loop);
    }
    function play(){ if(running)return; running=true; start=performance.now(); raf=requestAnimationFrame(loop); }
    function stop(){ running=false; if(raf)cancelAnimationFrame(raf); raf=null; annos.forEach(el=>el.classList.remove('show')); }

    // manual single-frame render (used for verification / frozen-timeline fallback)
    function renderOnce(p){
      if(p!=null){ prog=progCur=Math.max(0,Math.min(1,p)); }
      applyFrame(progCur, 0);
    }

    resize(); window.addEventListener('resize',resize);
    renderer.render(scene,camera);
    return { play, stop, setProgress, resize, renderOnce };
  };
})();
