/* Decorative animation aligned with the original 1536 × 1024 illustration. */
(() => {
  const canvas = document.querySelector('.hero-effects');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const colors = ['#ff36cf', '#22e9f2', '#ffce32', '#ad40ff'];
  const shapes = [[[0,0],[1,0],[2,0],[2,1]], [[0,0],[1,0],[0,1],[1,1]], [[0,0],[1,0],[2,0],[1,1]], [[0,0],[0,1],[0,2],[0,3]], [[1,0],[2,0],[0,1],[1,1]]];
  const stars = [[98,106],[69,243],[246,476],[526,473],[355,389],[775,632],[1080,44],[1038,115],[1327,48],[1221,155],[1351,18],[1086,683],[203,22],[695,180],[760,151]];
  let board, piece, sequence = 0, elapsed = 0, previous = 0, frame = 0, visible = true, clearRows = [], clearTime = 0;
  function reset() {
    board = Array.from({length:10}, () => Array(7).fill(null));
    [2,3,1,2,1,3,2].forEach((height,x) => { for (let y=10-height;y<10;y++) board[y][x] = colors[(x+y)%4]; });
  }
  function fits(shape,x,y) { return shape.every(([dx,dy]) => x+dx>=0 && x+dx<7 && y+dy<10 && (y+dy<0 || !board[y+dy][x+dx])); }
  function spawn() {
    const shape=shapes[sequence%shapes.length];
    // Pick a valid landing position, favoring full rows and lower stacks.
    let best = null;
    for(let x=0;x<7;x++) {
      if(!fits(shape,x,0)) continue;
      let y=0; while(fits(shape,x,y+1)) y++;
      const trial=board.map(row=>row.slice()); shape.forEach(([dx,dy])=>trial[y+dy][x+dx]=true);
      const rows=trial.filter(row=>row.every(Boolean)).length;
      const score=rows*100+y*3- Math.abs(x-3)*0.1;
      if(!best || score>best.score) best={x,y,score};
    }
    if(!best) { reset(); spawn(); return; }
    piece={shape,x:best.x,y:-Math.max(...shape.map(p=>p[1]))-1,color:colors[sequence%4]}; sequence++;
  }
  function block(x,y,color,alpha=1) {
    const px=642+x*36.3, py=211+y*38.7;
    ctx.globalAlpha=alpha;ctx.shadowColor=color;ctx.shadowBlur=11;
    const gradient=ctx.createLinearGradient(px,py,px+34,py+36);
    gradient.addColorStop(0,'#fff3');gradient.addColorStop(.2,color);gradient.addColorStop(1,'#38104c');
    ctx.fillStyle=gradient;ctx.beginPath();ctx.roundRect(px+2,py+2,32.3,34.7,4);ctx.fill();
    ctx.shadowBlur=0;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
    ctx.strokeStyle='#ffffffaa';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px+5,py+12);ctx.lineTo(px+5,py+5);ctx.lineTo(px+28,py+5);ctx.stroke();ctx.globalAlpha=1;
  }
  function draw(time) {
    const box=canvas.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);
    const width=Math.round(box.width*dpr),height=Math.round(box.height*dpr);
    if(canvas.width!==width || canvas.height!==height){canvas.width=width;canvas.height=height;}
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);
    const scale=Math.max(width/1536,height/1024);
    ctx.setTransform(scale,0,0,scale,(width-1536*scale)/2,(height-1024*scale)/2);
    ctx.save();ctx.beginPath();ctx.rect(639,209,261,391);ctx.clip();
    const backdrop=ctx.createLinearGradient(640,210,900,600);backdrop.addColorStop(0,'#482569');backdrop.addColorStop(.5,'#63236f');backdrop.addColorStop(1,'#271b58');ctx.fillStyle=backdrop;ctx.fillRect(639,209,261,391);
    ctx.strokeStyle='#f6b6ff18';ctx.lineWidth=1;
    for(let x=0;x<=7;x++){ctx.beginPath();ctx.moveTo(642+x*36.3,210);ctx.lineTo(642+x*36.3,600);ctx.stroke();}
    board.forEach((row,y)=>row.forEach((color,x)=>{if(color) block(x,y,color);}));
    if(piece) piece.shape.forEach(([dx,dy])=>block(piece.x+dx,piece.y+dy,piece.color));
    clearRows.forEach(y=>{ctx.fillStyle=`rgba(255,239,183,${0.35+0.25*Math.sin(clearTime*8)})`;ctx.fillRect(641,211+y*38.7,258,38.7);});
    ctx.restore();
    // Headlights pulse in pairs, with a pause between each car.
    [[650,811,0],[737,794,0],[838,792,1],[903,771,1]].forEach(([x,y,car])=>{
      const phase=(time/1000+car*2.4)%6;
      const pulse=motion.matches?0:Math.max(0,1-Math.abs(phase-.3)/.22)*.85;
      if(!pulse)return;
      ctx.save();ctx.translate(x,y);ctx.rotate(-.28);ctx.scale(1.5,1);
      const light=ctx.createRadialGradient(0,0,1,0,0,23);light.addColorStop(0,`rgba(255,255,239,${pulse})`);light.addColorStop(.3,`rgba(255,242,172,${pulse*.8})`);light.addColorStop(1,'rgba(255,239,170,0)');ctx.fillStyle=light;ctx.fillRect(-24,-24,48,48);ctx.restore();
    });
    stars.forEach(([x,y],i)=>{
      const glow=motion.matches?.65:.25+.75*((Math.sin(time*.0013+i*2.7)+1)/2)**3;
      ctx.save();ctx.translate(x,y);ctx.globalAlpha=glow;ctx.shadowColor='#ffe8ae';ctx.shadowBlur=18;ctx.fillStyle='#fff6cf';
      const r=5+glow*6;ctx.beginPath();ctx.moveTo(0,-r);ctx.quadraticCurveTo(1,-1,r,0);ctx.quadraticCurveTo(1,1,0,r);ctx.quadraticCurveTo(-1,1,-r,0);ctx.quadraticCurveTo(-1,-1,0,-r);ctx.fill();ctx.restore();
    });
  }
  function tick(now) {
    const delta=previous?Math.min((now-previous)/1000,.1):0;previous=now;elapsed+=delta;
    if(clearRows.length){clearTime+=delta;if(clearTime>.8){board=board.filter((_,y)=>!clearRows.includes(y));while(board.length<10)board.unshift(Array(7).fill(null));clearRows=[];spawn();}}
    else if(elapsed>.38){elapsed=0;if(fits(piece.shape,piece.x,piece.y+1))piece.y++;else{piece.shape.forEach(([dx,dy])=>{if(piece.y+dy>=0)board[piece.y+dy][piece.x+dx]=piece.color;});piece=null;clearRows=board.flatMap((row,y)=>row.every(Boolean)?[y]:[]);clearTime=0;if(!clearRows.length)spawn();}}
    draw(now);frame=requestAnimationFrame(tick);
  }
  function update(){cancelAnimationFrame(frame);previous=0;if(visible&&!document.hidden&&!motion.matches)frame=requestAnimationFrame(tick);else draw(0);}
  reset();spawn();new ResizeObserver(()=>draw(performance.now())).observe(canvas);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update();}).observe(canvas);
  document.addEventListener('visibilitychange',update);motion.addEventListener('change',update);update();
})();
