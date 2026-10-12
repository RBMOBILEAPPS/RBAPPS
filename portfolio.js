// Project filtering leaves all projects visible when JavaScript is unavailable.
const filters = document.querySelectorAll('[data-filter]');
const projectCards = document.querySelectorAll('[data-category]');
filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  let visible = 0;
  projectCards.forEach(card => {
    card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter;
    if (!card.hidden) visible++;
  });
  document.querySelector('.project-count').textContent = `Showing ${visible} project${visible === 1 ? '' : 's'}`;
}));

// Small spring offsets preserve layout, normal link taps and vertical page scrolling.
const water = document.querySelector('.social-water');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const bubbles = [...document.querySelectorAll('.social-bubble')].map((element, index) => ({element, index, x:0, y:0, vx:0, vy:0, drag:null, suppressClick:false}));
let pointer = null, frame = 0, visible = false, previousTime = 0;
water?.addEventListener('pointermove', event => {
  if (event.pointerType === 'mouse') pointer = {x:event.clientX,y:event.clientY};
});
water?.addEventListener('pointerleave', () => { pointer = null; });
bubbles.forEach(b => {
  b.element.addEventListener('dragstart', e => e.preventDefault());
  b.element.addEventListener('pointerdown', e => {
    if (reducedMotion.matches || e.button !== 0) return;
    b.suppressClick = false;
    b.drag = {id:e.pointerId,x:e.clientX,y:e.clientY,ox:b.x,oy:b.y,moved:false};
    b.element.setPointerCapture(e.pointerId);
  });
  b.element.addEventListener('pointermove', e => {
    if (!b.drag || b.drag.id !== e.pointerId) return;
    const dx = e.clientX-b.drag.x, dy = e.clientY-b.drag.y;
    if (Math.hypot(dx,dy)>7) b.drag.moved = true;
    b.x = Math.max(-45,Math.min(45,b.drag.ox+dx*.65));
    b.y = Math.max(-35,Math.min(35,b.drag.oy+dy*.65));
    b.vx = b.vy = 0;
  });
  const release = e => {
    if (!b.drag || b.drag.id !== e.pointerId) return;
    b.suppressClick = b.drag.moved;
    b.drag = null;
    if (b.element.hasPointerCapture(e.pointerId)) b.element.releasePointerCapture(e.pointerId);
  };
  b.element.addEventListener('pointerup',release);
  b.element.addEventListener('pointercancel',release);
  b.element.addEventListener('lostpointercapture',release);
  b.element.addEventListener('click',e => {
    if (b.suppressClick && e.detail !== 0) { e.preventDefault(); b.suppressClick=false; }
  });
});
function animate(time) {
  const dt = Math.min((time-previousTime)/16.667 || 1,2); previousTime=time;
  for (const b of bubbles) {
    if (!b.drag) {
      let tx=Math.sin(time*.0006+b.index*1.3)*4, ty=Math.cos(time*.00075+b.index*1.6)*6;
      if (pointer) {
        const rect=b.element.parentElement.getBoundingClientRect();
        const dx=rect.left+rect.width/2-pointer.x,dy=rect.top+41-pointer.y;
        const distance=Math.hypot(dx,dy);
        if(distance<140 && distance>0) { const strength=(1-distance/140)*16; tx+=dx/distance*strength; ty+=dy/distance*strength; }
      }
      if(document.activeElement===b.element) tx=ty=0;
      b.vx=(b.vx+(tx-b.x)*.035*dt)*Math.pow(.82,dt);
      b.vy=(b.vy+(ty-b.y)*.035*dt)*Math.pow(.82,dt);
      b.x+=b.vx*dt; b.y+=b.vy*dt;
    }
    b.element.style.transform=`translate3d(${b.x.toFixed(2)}px,${b.y.toFixed(2)}px,0)`;
  }
  frame=requestAnimationFrame(animate);
}
function syncAnimation() {
  cancelAnimationFrame(frame); frame=0; previousTime=0;
  if(visible && !document.hidden && !reducedMotion.matches) frame=requestAnimationFrame(animate);
  else if(reducedMotion.matches) bubbles.forEach(b=>{b.x=b.y=b.vx=b.vy=0;b.drag=null;b.element.style.transform='';});
}
if(water) new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncAnimation();},{rootMargin:'80px'}).observe(water);
reducedMotion.addEventListener('change',syncAnimation);
document.addEventListener('visibilitychange',syncAnimation);

// A damped spring gives project panels the same soft response as the social bubbles.
// Touch browsing keeps native scrolling and links; tilt follows a mouse pointer only.
document.querySelectorAll('.work-card').forEach(card => {
  let x=0,y=0,vx=0,vy=0,tx=0,ty=0,raised=false,raf=0,last=0;
  function render(time) {
    if(reducedMotion.matches || document.hidden) {reset();return;}
    const dt=Math.min((time-last)/16.667||1,2);last=time;
    vx=(vx+(tx-x)*.05*dt)*Math.pow(.78,dt);
    vy=(vy+(ty-y)*.05*dt)*Math.pow(.78,dt);
    x+=vx*dt;y+=vy*dt;
    card.style.transform=`translateY(${raised?-5:0}px) rotateX(${(-y*3).toFixed(3)}deg) rotateY(${(x*3).toFixed(3)}deg)`;
    if(Math.abs(tx-x)+Math.abs(ty-y)+Math.abs(vx)+Math.abs(vy)>.002) raf=requestAnimationFrame(render);
    else {raf=0;last=0;if(!raised) card.style.transform='';}
  }
  function run(){if(!raf && !reducedMotion.matches) raf=requestAnimationFrame(render);}
  function reset(){cancelAnimationFrame(raf);raf=0;last=0;x=y=vx=vy=tx=ty=0;raised=false;card.style.transform='';}
  card.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse' || reducedMotion.matches)return;
    const rect=card.getBoundingClientRect();
    tx=(event.clientX-rect.left)/rect.width-.5;ty=(event.clientY-rect.top)/rect.height-.5;
    raised=true;
    card.style.setProperty('--glow-x',`${((tx+.5)*100).toFixed(1)}%`);
    card.style.setProperty('--glow-y',`${((ty+.5)*100).toFixed(1)}%`);
    run();
  });
  card.addEventListener('pointerleave',()=>{tx=ty=0;raised=false;run();});
  reducedMotion.addEventListener('change',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
});

// App icons are playful buttons; the separate Explore app link opens the project.
document.querySelectorAll('.app-preview').forEach(button => {
  button.addEventListener('click', () => {
    button.querySelectorAll('.app-bubble-particle').forEach(p => p.remove());
    const image = button.querySelector('img');
    const box = button.getBoundingClientRect(), icon = image.getBoundingClientRect();
    const originX = icon.left + icon.width / 2 - box.left;
    const originY = icon.top + icon.height / 2 - box.top;
    const colors = ['#80f5d0','#81c7ff','#c494ff','#ff98c5','#ffe48a','#ffad7a'];
    const count = reducedMotion.matches ? 6 : 20;
    for(let i=0;i<count;i++) {
      const particle = document.createElement('span');
      particle.className = 'app-bubble-particle';
      particle.setAttribute('aria-hidden','true');
      const angle = (i / count) * Math.PI * 2 + Math.random() * .3;
      const size = 10 + Math.random() * 18;
      const distance = 85 + Math.random() * 70;
      particle.style.cssText = `left:${originX}px;top:${originY}px;width:${size}px;height:${size}px;--bubble-color:${colors[i%colors.length]}`;
      button.append(particle);
      const dx = Math.cos(angle) * distance, dy = Math.sin(angle) * distance;
      const frames = reducedMotion.matches
        ? [{transform:`translate(${dx*.5}px,${dy*.5}px)`,opacity:.8},{transform:`translate(${dx*.5}px,${dy*.5}px)`,opacity:0}]
        : [{transform:'translate(-50%,-50%) scale(.15)',opacity:0},{transform:`translate(calc(-50% + ${dx*.65}px),calc(-50% + ${dy*.65}px)) scale(1)`,opacity:.95,offset:.35},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy-45}px)) scale(.5)`,opacity:0}];
      const animation = particle.animate(frames,{duration:reducedMotion.matches?300:1100+Math.random()*500,easing:'cubic-bezier(.16,.7,.3,1)',fill:'forwards'});
      animation.finished.then(()=>particle.remove()).catch(()=>particle.remove());
    }
  });
});
