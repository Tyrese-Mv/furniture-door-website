/* ANASA — shared 3D helpers (wood texture + environment) */
(function(){
  if(typeof THREE === 'undefined') return;

  // Procedural vertical wood-grain texture, tinted to a base colour.
  window.ANASA_makeWood = function(hex, opts){
    opts = opts || {};
    const w = 512, h = 1024;
    const c = document.createElement('canvas'); c.width=w; c.height=h;
    const x = c.getContext('2d');
    const base = new THREE.Color(hex);
    const light = base.clone().multiplyScalar(1.22);
    const dark  = base.clone().multiplyScalar(0.74);
    // base fill
    x.fillStyle = '#'+base.getHexString(); x.fillRect(0,0,w,h);
    // long vertical grain streaks
    const streaks = opts.streaks || 240;
    for(let i=0;i<streaks;i++){
      const px = Math.random()*w;
      const mix = Math.random();
      const col = base.clone().lerp(Math.random()>.5?light:dark, mix*0.6);
      x.strokeStyle = 'rgba('+(col.r*255|0)+','+(col.g*255|0)+','+(col.b*255|0)+','+(0.05+Math.random()*0.16)+')';
      x.lineWidth = 0.5+Math.random()*2.2;
      x.beginPath();
      let cx = px;
      x.moveTo(cx,0);
      for(let y=0;y<=h;y+=24){
        cx += (Math.random()-0.5)*5;
        x.lineTo(cx,y);
      }
      x.stroke();
    }
    // occasional darker cathedral figure
    for(let i=0;i<5;i++){
      const gx = Math.random()*w;
      const grad = x.createLinearGradient(gx-40,0,gx+40,0);
      grad.addColorStop(0,'rgba(0,0,0,0)');
      grad.addColorStop(.5,'rgba('+(dark.r*255|0)+','+(dark.g*255|0)+','+(dark.b*255|0)+',0.22)');
      grad.addColorStop(1,'rgba(0,0,0,0)');
      x.fillStyle = grad; x.fillRect(gx-40,0,80,h);
    }

    // engraved geometric detailing (incised grooves + key-fret motifs)
    if(opts.engrave){
      const dcol = base.clone().multiplyScalar(0.42);
      const hcol = base.clone().multiplyScalar(1.5);
      const ds = 'rgba('+(dcol.r*255|0)+','+(dcol.g*255|0)+','+(dcol.b*255|0)+',';
      const hs = 'rgba('+(hcol.r*255|0)+','+(hcol.g*255|0)+','+(hcol.b*255|0)+',';
      // an incised line reads as a dark channel with a fine catch-light on one edge
      function incise(x1,y1,x2,y2){
        x.strokeStyle = ds+'0.9)'; x.lineWidth = 2.4;
        x.beginPath(); x.moveTo(x1,y1); x.lineTo(x2,y2); x.stroke();
        x.strokeStyle = hs+'0.55)'; x.lineWidth = 1;
        x.beginPath(); x.moveTo(x1+1.5,y1); x.lineTo(x2+1.5,y2); x.stroke();
      }
      function rect(cx,cy,r){
        x.strokeStyle = ds+'0.9)'; x.lineWidth = 2.2; x.strokeRect(cx-r,cy-r,2*r,2*r);
        x.strokeStyle = hs+'0.5)'; x.lineWidth = 1;   x.strokeRect(cx-r+1.4,cy-r+1.4,2*r,2*r);
      }
      // a refined nested-square key motif
      function fret(cx,cy,s){ rect(cx,cy,s); rect(cx,cy,s*0.52); incise(cx,cy-s,cx,cy-s*0.52); incise(cx,cy+s*0.52,cx,cy+s); }
      const bandCx = w*0.585;
      const y0 = h*0.07, y1 = h*0.93;
      for(let i=0;i<3;i++){ const gx = bandCx-15 + i*15; incise(gx,y0,gx,y1); }
      fret(bandCx, h*0.235, 21);
      fret(bandCx, h*0.765, 21);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    if(THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    return tex;
  };

  // Soft studio environment so metals & woods read with real reflections.
  window.ANASA_env = function(renderer){
    const w=512,h=256;
    const c=document.createElement('canvas'); c.width=w; c.height=h;
    const x=c.getContext('2d');
    const g=x.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#2b2922');
    g.addColorStop(0.42,'#15140f');
    g.addColorStop(0.5,'#0c0b08');
    g.addColorStop(0.6,'#171510');
    g.addColorStop(1,'#050504');
    x.fillStyle=g; x.fillRect(0,0,w,h);
    // warm key highlight
    const r=x.createRadialGradient(w*0.32,h*0.32,2,w*0.32,h*0.32,150);
    r.addColorStop(0,'rgba(255,232,180,0.95)');
    r.addColorStop(1,'rgba(255,232,180,0)');
    x.fillStyle=r; x.fillRect(0,0,w,h);
    // soft gold band
    const r2=x.createRadialGradient(w*0.72,h*0.42,2,w*0.72,h*0.42,120);
    r2.addColorStop(0,'rgba(201,162,75,0.5)');
    r2.addColorStop(1,'rgba(201,162,75,0)');
    x.fillStyle=r2; x.fillRect(0,0,w,h);
    const tex=new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem=new THREE.PMREMGenerator(renderer);
    const env=pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose(); tex.dispose();
    return env;
  };
})();
