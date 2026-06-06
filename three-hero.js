/* ANASA — Hero 3D scene */
(function(){
  window.ANASA_initHero = function(canvas){
    if(typeof THREE === 'undefined') return null;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true, powerPreference:'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
    if(THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;

    const scene = new THREE.Scene();
    scene.environment = window.ANASA_env(renderer);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0.05, 0.12, 5.6);

    // ---- door assembly ----
    const root = new THREE.Group();
    scene.add(root);

    const W=1.06, H=2.42, T=0.085;            // leaf dimensions
    const FW=0.10, FD=0.16;                    // frame width / depth

    // gold metallic frame (portal)
    const goldMat = new THREE.MeshStandardMaterial({ color:0xb98f3f, metalness:1.0, roughness:0.28 });
    const frame = new THREE.Group();
    function bar(w,h,d,x,y,z){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), goldMat); m.position.set(x,y,z); frame.add(m); }
    const oW = W+FW*2, oH = H+FW*2;
    bar(FW, oH, FD, -(W/2+FW/2), 0, 0);        // left
    bar(FW, oH, FD,  (W/2+FW/2), 0, 0);        // right
    bar(oW, FW, FD, 0,  (H/2+FW/2), 0);        // top
    root.add(frame);

    // wood leaf, hinged on the left edge
    const hinge = new THREE.Group();
    hinge.position.set(-W/2, 0, 0);            // pivot at left edge
    root.add(hinge);

    const wood = window.ANASA_makeWood('#6B3327', { streaks:300, engrave:true });
    const leafMat = new THREE.MeshStandardMaterial({ map:wood, roughness:0.62, metalness:0.0, color:0xe8e0d8 });
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), leafMat);
    leaf.position.set(W/2, 0, 0);              // shift so left edge sits on pivot
    hinge.add(leaf);

    // black slim handle
    const handleMat = new THREE.MeshStandardMaterial({ color:0x121212, roughness:0.35, metalness:0.6 });
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.05), handleMat);
    handle.position.set(W*0.40, -0.04, T/2+0.02);
    leaf.add(handle);

    // gold rim glow along leading edge of the leaf
    const rimMat = new THREE.MeshBasicMaterial({ color:0xE8C874, transparent:true, opacity:0.0 });
    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.014, H, T*1.05), rimMat);
    rim.position.set(W/2, 0, 0);
    leaf.add(rim);

    // ---- lights ----
    scene.add(new THREE.AmbientLight(0xffffff, 0.12));
    const key = new THREE.DirectionalLight(0xfff0d4, 1.5); key.position.set(-2.4, 2.6, 3.2); scene.add(key);
    const warmFill = new THREE.DirectionalLight(0xC9A24B, 0.38); warmFill.position.set(3, 0.5, 1.5); scene.add(warmFill);
    const goldRim = new THREE.DirectionalLight(0xE8C874, 1.4); goldRim.position.set(2.6, 1.0, -2.6); scene.add(goldRim);
    const backGlow = new THREE.PointLight(0xC9A24B, 4, 8, 2); backGlow.position.set(0, 0.4, -1.4); scene.add(backGlow);

    // ---- state ----
    const OPEN_BASE = -0.34;     // resting ajar angle (radians)
    let openTarget = OPEN_BASE;
    let openCur = -0.02;         // start almost closed for entrance
    const pointer = { x:0, y:0, tx:0, ty:0 };
    let scrollT = 0;
    let raf=null, running=false, start=performance.now();

    function resize(){
      const r = canvas.getBoundingClientRect();
      const w = r.width||window.innerWidth, h = r.height||window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w/h;
      // pull camera back a touch on portrait so the door fits
      camera.position.z = (w/h < 0.85) ? 6.8 : 5.6;
      camera.updateProjectionMatrix();
    }

    function onPointer(e){
      if(reduce) return;
      const nx = (e.clientX/window.innerWidth)*2 - 1;
      const ny = (e.clientY/window.innerHeight)*2 - 1;
      pointer.tx = nx; pointer.ty = ny;
    }

    function setScroll(t){ scrollT = Math.max(0, Math.min(1, t)); }

    function frameLoop(now){
      const t = (now - start)/1000;
      // entrance: ease the door from shut to ajar over first ~2.2s
      const intro = Math.min(1, t/2.2);
      const introEase = 1 - Math.pow(1-intro, 3);
      // scroll opens further + invites camera in slightly
      openTarget = OPEN_BASE - scrollT*0.5;
      const idleBreath = reduce ? 0 : Math.sin(t*0.6)*0.025;
      const goalOpen = (OPEN_BASE*introEase) + (openTarget-OPEN_BASE) + idleBreath;
      openCur += (goalOpen - openCur)*0.06;
      hinge.rotation.y = openCur;

      // cursor parallax on the whole assembly
      pointer.x += (pointer.tx - pointer.x)*0.05;
      pointer.y += (pointer.ty - pointer.y)*0.05;
      const idleSpin = reduce ? 0 : Math.sin(t*0.18)*0.06;
      root.rotation.y = idleSpin + pointer.x*0.26;
      root.rotation.x = -pointer.y*0.10 + 0.02;

      // rim glow pulses subtly + grows as door opens
      rimMat.opacity = 0.35 + Math.abs(Math.sin(t*0.9))*0.25 + (-openCur)*0.3;
      backGlow.intensity = 5 + Math.sin(t*1.1)*1.5;

      // gentle camera dolly with scroll
      camera.position.y = 0.12 - scrollT*0.25;
      camera.lookAt(0, -scrollT*0.15, 0);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frameLoop);
    }

    function play(){ if(running) return; running=true; start=performance.now()-300; raf=requestAnimationFrame(frameLoop); }
    function stop(){ running=false; if(raf) cancelAnimationFrame(raf); raf=null; }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointer);
    renderer.render(scene, camera);

    return { play, stop, setScroll, resize, dispose(){ stop(); renderer.dispose(); } };
  };
})();
