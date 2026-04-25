import { getHighscores, saveHighscore } from "./highscore.js";

/* ===============================
   CANVAS
=============================== */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");

/* ===============================
   UI
=============================== */

const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const highscoresEl = document.getElementById("highscores");

const soundBtn = document.getElementById("soundBtn");
const musicBtn = document.getElementById("musicBtn");

/* ===============================
   AUDIO
=============================== */

const AUDIO_PATH = "./assets/audio/";

const sounds = {
  move: new Audio(AUDIO_PATH + "move.wav"),
  rotate: new Audio(AUDIO_PATH + "rotate.wav"),
  drop: new Audio(AUDIO_PATH + "harddrop.wav"),
  clear: new Audio(AUDIO_PATH + "clear.wav"),
  levelup: new Audio(AUDIO_PATH + "levelup.wav"),
  gameover: new Audio(AUDIO_PATH + "gameover.wav"),
};

const music = {
  normal: new Audio(AUDIO_PATH + "music_loop.wav"),
};

music.normal.loop = true;
music.normal.volume = 0.4;

let soundOn = true;
let musicOn = false;

/* Unlock audio on mobile */

function unlockAudio() {
  Object.values(sounds).forEach(s => {
    s.play().then(() => s.pause()).catch(()=>{});
  });
}

document.addEventListener("pointerdown", unlockAudio, { once: true });

function playSound(name) {
  if (!soundOn) return;

  try {
    const s = sounds[name];
    s.currentTime = 0;
    s.play().catch(()=>{});
  } catch {}
}

/* ===============================
   GAME SETTINGS
=============================== */

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

/* Strong neon colors */

const COLORS = {
  I: "#00f5ff",
  J: "#006dff",
  L: "#ff8c00",
  O: "#fff200",
  S: "#39ff14",
  T: "#bf00ff",
  Z: "#ff1744",
};

const SHAPES = {
  I: [[1,1,1,1]],
  J: [[1,0,0],[1,1,1]],
  L: [[0,0,1],[1,1,1]],
  O: [[1,1],[1,1]],
  S: [[0,1,1],[1,1,0]],
  T: [[0,1,0],[1,1,1]],
  Z: [[1,1,0],[0,1,1]],
};

/* ===============================
   GAME STATE
=============================== */

let board = createBoard();
let piece = randomPiece();
let nextPiece = randomPiece();

let particles = [];

let score = 0;
let lines = 0;
let level = 1;

let dropCounter = 0;
let dropInterval = 850;

let lastTime = 0;
let gameOver = false;

/* ===============================
   BOARD
=============================== */

function createBoard() {
  return Array.from({length:ROWS},
    () => Array(COLS).fill(null)
  );
}

function randomPiece() {
  const keys = Object.keys(SHAPES);
  const type = keys[Math.floor(Math.random()*keys.length)];

  return {
    type,
    shape: SHAPES[type].map(r=>[...r]),
    x: Math.floor(COLS/2)-2,
    y: 0
  };
}

/* ===============================
   COLLISION
=============================== */

function collides(p=piece) {

  for(let y=0;y<p.shape.length;y++){
    for(let x=0;x<p.shape[y].length;x++){

      if(!p.shape[y][x]) continue;

      const bx=p.x+x;
      const by=p.y+y;

      if(
        bx<0 ||
        bx>=COLS ||
        by>=ROWS
      ) return true;

      if(by>=0 && board[by][bx])
        return true;
    }
  }

  return false;
}

/* ===============================
   GHOST PIECE
=============================== */

function getGhost() {

  const ghost={
    type:piece.type,
    shape:piece.shape,
    x:piece.x,
    y:piece.y
  };

  while(!collides(ghost))
    ghost.y++;

  ghost.y--;

  return ghost;
}

/* ===============================
   ROTATE
=============================== */

function rotate(matrix){

  return matrix[0]
    .map((_,i)=>
      matrix.map(r=>r[i]).reverse()
    );
}

function rotatePiece(){

  const oldShape=piece.shape;
  const oldX=piece.x;

  piece.shape=rotate(piece.shape);

  for(const offset of [0,-1,1,-2,2]){

    piece.x=oldX+offset;

    if(!collides()){
      playSound("rotate");
      return;
    }
  }

  piece.shape=oldShape;
  piece.x=oldX;
}

/* ===============================
   MOVEMENT
=============================== */

function move(dir){

  piece.x+=dir;

  if(collides())
    piece.x-=dir;
  else
    playSound("move");
}

function softDrop(){

  piece.y++;

  if(collides()){

    piece.y--;

    merge();
    clearLines();
    resetPiece();

    playSound("drop");
  }

  dropCounter=0;
}

function hardDrop(){

  while(!collides()){
    piece.y++;
    score+=1;
  }

  piece.y--;

  merge();
  clearLines();
  resetPiece();

  playSound("drop");

  dropCounter=0;
}

/* ===============================
   MERGE
=============================== */

function merge(){

  piece.shape.forEach((row,y)=>{

    row.forEach((v,x)=>{

      if(v)
        board[piece.y+y][piece.x+x]=piece.type;

    });

  });

}

/* ===============================
   PARTICLES
=============================== */

function spawnParticles(rowY){

  for(let x=0;x<COLS;x++){

    for(let i=0;i<6;i++){

      particles.push({

        x:x*BLOCK+BLOCK/2,
        y:rowY*BLOCK+BLOCK/2,

        vx:(Math.random()-0.5)*8,
        vy:(Math.random()-0.8)*8,

        life:40,
        size:3+Math.random()*4,

        color:"#ffffff"

      });

    }
  }
}

function updateParticles(){

  particles=particles.filter(p=>p.life>0);

  for(const p of particles){

    p.x+=p.vx;
    p.y+=p.vy;

    p.vy+=0.25;
    p.life--;

  }
}

/* ===============================
   CLEAR LINES
=============================== */

function clearLines(){

  let cleared=0;

  outer:
  for(let y=ROWS-1;y>=0;y--){

    for(let x=0;x<COLS;x++){

      if(!board[y][x])
        continue outer;

    }

    spawnParticles(y);

    board.splice(y,1);
    board.unshift(Array(COLS).fill(null));

    cleared++;
    y++;

  }

  if(cleared>0){

    playSound("clear");

    lines+=cleared;

    score+=
      [0,100,300,500,800][cleared]
      * level;

    const newLevel=
      Math.floor(lines/10)+1;

    if(newLevel>level){
      level=newLevel;
      playSound("levelup");
    }

    dropInterval=
      Math.max(
        120,
        850-(level-1)*70
      );

  }
}

/* ===============================
   RESET PIECE
=============================== */

function resetPiece(){

  piece=nextPiece;
  nextPiece=randomPiece();

  if(collides()){

    gameOver=true;

    playSound("gameover");

    saveHighscore(
      "Bianca",
      score
    );

    renderHighscores();

  }

}

/* ===============================
   DRAW BLOCK (GLOW)
=============================== */

function drawBlock(x,y,color,alpha=1,glow=true){

  ctx.save();

  ctx.globalAlpha=alpha;

  if(glow){

    ctx.shadowColor=color;
    ctx.shadowBlur=18;

  }

  const px=x*BLOCK;
  const py=y*BLOCK;

  const g=ctx.createLinearGradient(
    px,
    py,
    px+BLOCK,
    py+BLOCK
  );

  g.addColorStop(0,"#ffffff");
  g.addColorStop(0.2,color);
  g.addColorStop(1,"#120020");

  ctx.fillStyle=g;

  ctx.fillRect(
    px+1,
    py+1,
    BLOCK-2,
    BLOCK-2
  );

  ctx.shadowBlur=0;

  ctx.strokeStyle="white";
  ctx.lineWidth=2;

  ctx.strokeRect(
    px+2,
    py+2,
    BLOCK-4,
    BLOCK-4
  );

  ctx.restore();
}

/* ===============================
   DRAW
=============================== */

function draw(){

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  drawGhost();

  board.forEach((row,y)=>{

    row.forEach((t,x)=>{

      if(t)
        drawBlock(
          x,
          y,
          COLORS[t]
        );

    });

  });

  piece.shape.forEach((row,y)=>{

    row.forEach((v,x)=>{

      if(v)
        drawBlock(
          piece.x+x,
          piece.y+y,
          COLORS[piece.type]
        );

    });

  });

  drawParticles();

}

/* Ghost */

function drawGhost(){

  const g=getGhost();

  g.shape.forEach((row,y)=>{

    row.forEach((v,x)=>{

      if(v){

        drawBlock(
          g.x+x,
          g.y+y,
          "#ffffff",
          0.2,
          false
        );

      }

    });

  });

}

/* ===============================
   NEXT
=============================== */

function drawNext(){

  nextCtx.clearRect(
    0,
    0,
    nextCanvas.width,
    nextCanvas.height
  );

  nextPiece.shape.forEach((row,y)=>{

    row.forEach((v,x)=>{

      if(v){

        nextCtx.fillStyle=
          COLORS[nextPiece.type];

        nextCtx.fillRect(
          (x+1)*22,
          (y+1)*22,
          20,
          20
        );

      }

    });

  });

}

/* ===============================
   PARTICLES DRAW
=============================== */

function drawParticles(){

  particles.forEach(p=>{

    ctx.globalAlpha=p.life/40;

    ctx.fillStyle=p.color;

    ctx.beginPath();

    ctx.arc(
      p.x,
      p.y,
      p.size,
      0,
      Math.PI*2
    );

    ctx.fill();

  });

  ctx.globalAlpha=1;

}

/* ===============================
   UI
=============================== */

function updateUI(){

  scoreEl.textContent=score;
  linesEl.textContent=lines;
  levelEl.textContent=level;

}

function renderHighscores(){

  const list=getHighscores();

  highscoresEl.innerHTML="";

  if(list.length===0){

    highscoresEl.innerHTML=
      "<li>Ingen score ennå</li>";

    return;
  }

  list.forEach(s=>{

    const li=
      document.createElement("li");

    li.textContent=
      `${s.name}: ${s.score}`;

    highscoresEl.appendChild(li);

  });

}

/* ===============================
   LOOP
=============================== */

function update(time=0){

  const delta=time-lastTime;
  lastTime=time;

  if(!gameOver){

    dropCounter+=delta;

    if(dropCounter>dropInterval)
      softDrop();

  }

  updateParticles();

  draw();
  drawNext();
  updateUI();

  requestAnimationFrame(update);

}

/* ===============================
   CONTROLS
=============================== */

document.addEventListener("keydown",e=>{

  if(e.key==="ArrowLeft")
    move(-1);

  if(e.key==="ArrowRight")
    move(1);

  if(e.key==="ArrowDown")
    softDrop();

  if(e.key==="ArrowUp")
    rotatePiece();

  if(e.key===" ")
    hardDrop();

});

/* TOUCH */

function bindHold(id,fn,repeat=false){

  const b=document.getElementById(id);

  let t=null;

  const start=e=>{
    e.preventDefault();
    fn();
    if(repeat)
      t=setInterval(fn,90);
  };

  const stop=()=>{
    if(t) clearInterval(t);
  };

  b.addEventListener("pointerdown",start);
  b.addEventListener("pointerup",stop);
  b.addEventListener("pointerleave",stop);

}

bindHold("leftBtn",()=>move(-1),true);
bindHold("rightBtn",()=>move(1),true);
bindHold("downBtn",softDrop,true);
bindHold("rotateBtn",rotatePiece);
bindHold("dropBtn",hardDrop);

/* ===============================
   SOUND BUTTONS
=============================== */

soundBtn.onclick=()=>{

  soundOn=!soundOn;

  soundBtn.textContent=
    soundOn
      ? "Lyd: på"
      : "Lyd: av";

};

musicBtn.onclick=()=>{

  musicOn=!musicOn;

  if(musicOn){

    music.normal.play();

    musicBtn.textContent=
      "Musikk: på";

  }else{

    music.normal.pause();

    musicBtn.textContent=
      "Musikk: av";

  }

};

/* ===============================
   START
=============================== */

renderHighscores();
update();