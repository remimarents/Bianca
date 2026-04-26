import { getHighscores, saveHighscore } from "./highscore.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");

const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const highscoresEl = document.getElementById("highscores");
const soundBtn = document.getElementById("soundBtn");
const musicBtn = document.getElementById("musicBtn");

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

function unlockAudio() {
  Object.values(sounds).forEach(s => {
    s.play().then(() => {
      s.pause();
      s.currentTime = 0;
    }).catch(() => {});
  });
}

document.addEventListener("pointerdown", unlockAudio, { once: true });

function playSound(name) {
  if (!soundOn || !sounds[name]) return;
  try {
    sounds[name].currentTime = 0;
    sounds[name].play().catch(() => {});
  } catch {}
}

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

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
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]],
};

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
let nameSaved = false;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece() {
  const keys = Object.keys(SHAPES);
  const type = keys[Math.floor(Math.random() * keys.length)];

  return {
    type,
    shape: SHAPES[type].map(row => [...row]),
    x: Math.floor(COLS / 2) - 2,
    y: 0,
  };
}

function collides(p = piece) {
  for (let y = 0; y < p.shape.length; y++) {
    for (let x = 0; x < p.shape[y].length; x++) {
      if (!p.shape[y][x]) continue;

      const bx = p.x + x;
      const by = p.y + y;

      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
  }

  return false;
}

function getGhost() {
  const ghost = {
    type: piece.type,
    shape: piece.shape,
    x: piece.x,
    y: piece.y,
  };

  while (!collides(ghost)) ghost.y++;
  ghost.y--;

  return ghost;
}

function rotate(matrix) {
  return matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());
}

function rotatePiece() {
  if (gameOver) return;

  const oldShape = piece.shape;
  const oldX = piece.x;

  piece.shape = rotate(piece.shape);

  for (const offset of [0, -1, 1, -2, 2]) {
    piece.x = oldX + offset;

    if (!collides()) {
      playSound("rotate");
      return;
    }
  }

  piece.shape = oldShape;
  piece.x = oldX;
}

function move(dir) {
  if (gameOver) return;

  piece.x += dir;

  if (collides()) {
    piece.x -= dir;
  } else {
    playSound("move");
  }
}

function softDrop() {
  if (gameOver) return;

  piece.y++;

  if (collides()) {
    piece.y--;
    merge();
    clearLines();
    resetPiece();
    playSound("drop");
  }

  dropCounter = 0;
}

function hardDrop() {
  if (gameOver) return;

  while (!collides()) {
    piece.y++;
    score += 1;
  }

  piece.y--;
  merge();
  clearLines();
  resetPiece();
  playSound("drop");

  dropCounter = 0;
}

function merge() {
  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value && piece.y + y >= 0) {
        board[piece.y + y][piece.x + x] = piece.type;
      }
    });
  });
}

function spawnParticles(rowY) {
  for (let x = 0; x < COLS; x++) {
    for (let i = 0; i < 7; i++) {
      particles.push({
        x: x * BLOCK + BLOCK / 2,
        y: rowY * BLOCK + BLOCK / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.8) * 8,
        life: 42,
        size: 3 + Math.random() * 5,
        color: "#ffffff",
      });
    }
  }
}

function updateParticles() {
  particles = particles.filter(p => p.life > 0);

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.25;
    p.life--;
  }
}

function clearLines() {
  let cleared = 0;

  outer:
  for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      if (!board[y][x]) continue outer;
    }

    spawnParticles(y);
    board.splice(y, 1);
    board.unshift(Array(COLS).fill(null));
    cleared++;
    y++;
  }

  if (cleared > 0) {
    playSound("clear");

    lines += cleared;
    score += [0, 100, 300, 500, 800][cleared] * level;

    const newLevel = Math.floor(lines / 10) + 1;

    if (newLevel > level) {
      level = newLevel;
      playSound("levelup");
    }

    dropInterval = Math.max(120, 850 - (level - 1) * 70);
  }
}

function resetPiece() {
  piece = nextPiece;
  nextPiece = randomPiece();

  if (collides()) {
    gameOver = true;
    playSound("gameover");
  }
}

function drawBlock(context, x, y, color, size = BLOCK, alpha = 1, glow = true) {
  context.save();
  context.globalAlpha = alpha;

  if (glow) {
    context.shadowColor = color;
    context.shadowBlur = 18;
  }

  const px = x * size;
  const py = y * size;

  const gradient = context.createLinearGradient(px, py, px + size, py + size);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.2, color);
  gradient.addColorStop(1, "#120020");

  context.fillStyle = gradient;
  context.fillRect(px + 1, py + 1, size - 2, size - 2);

  context.shadowBlur = 0;
  context.strokeStyle = "rgba(255,255,255,0.9)";
  context.lineWidth = 2;
  context.strokeRect(px + 2, py + 2, size - 4, size - 4);

  context.restore();
}

function drawGhost() {
  if (gameOver) return;

  const ghost = getGhost();

  ghost.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawBlock(
          ctx,
          ghost.x + x,
          ghost.y + y,
          "#ffffff",
          BLOCK,
          0.18,
          false
        );
      }
    });
  });
}

function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life / 42;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

async function saveNameAndScoreOnce() {
  if (nameSaved) return;

  nameSaved = true;

  setTimeout(async () => {
    let name = prompt("Skriv navnet ditt:");

    if (!name || name.trim() === "") {
      name = "Spiller";
    }

    name = name.trim().slice(0, 18);

    await saveHighscore(name, score);
    await renderHighscores();
  }, 250);
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.82)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff200";
  ctx.shadowColor = "#ff00cc";
  ctx.shadowBlur = 28;
  ctx.textAlign = "center";

  ctx.font = "bold 34px system-ui";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 50);

  ctx.font = "bold 22px system-ui";
  ctx.fillText(`Poeng: ${score}`, canvas.width / 2, canvas.height / 2 - 8);

  ctx.font = "bold 16px system-ui";
  ctx.fillText("Skriv navn for highscore", canvas.width / 2, canvas.height / 2 + 28);
  ctx.fillText("Trykk Start på nytt etterpå", canvas.width / 2, canvas.height / 2 + 56);

  ctx.shadowBlur = 0;

  saveNameAndScoreOnce();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, "#090018");
  bg.addColorStop(1, "#190035");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGhost();

  board.forEach((row, y) => {
    row.forEach((type, x) => {
      if (type) drawBlock(ctx, x, y, COLORS[type]);
    });
  });

  if (!gameOver) {
    piece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          drawBlock(ctx, piece.x + x, piece.y + y, COLORS[piece.type]);
        }
      });
    });
  }

  drawParticles();

  if (gameOver) {
    drawGameOver();
  }
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

  nextCtx.fillStyle = "rgba(0,0,0,0.35)";
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  const size = 22;

  nextPiece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawBlock(
          nextCtx,
          x + 1,
          y + 1,
          COLORS[nextPiece.type],
          size,
          1,
          true
        );
      }
    });
  });
}

function updateUI() {
  scoreEl.textContent = score;
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

async function renderHighscores() {
  const list = await getHighscores();

  highscoresEl.innerHTML = "";

  if (!list || list.length === 0) {
    highscoresEl.innerHTML = "<li>Ingen score ennå</li>";
    return;
  }

  list.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.name}: ${item.score}`;
    highscoresEl.appendChild(li);
  });
}

function update(time = 0) {
  const delta = time - lastTime;
  lastTime = time;

  if (!gameOver) {
    dropCounter += delta;

    if (dropCounter > dropInterval) {
      softDrop();
    }
  }

  updateParticles();
  draw();
  drawNext();
  updateUI();

  requestAnimationFrame(update);
}

document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") move(-1);
  if (e.key === "ArrowRight") move(1);
  if (e.key === "ArrowDown") softDrop();
  if (e.key === "ArrowUp") rotatePiece();
  if (e.key === " ") hardDrop();
});

function bindHold(id, fn, repeat = false) {
  const btn = document.getElementById(id);
  let timer = null;

  const start = e => {
    e.preventDefault();
    fn();

    if (repeat) {
      timer = setInterval(fn, 90);
    }
  };

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  btn.addEventListener("pointerdown", start);
  btn.addEventListener("pointerup", stop);
  btn.addEventListener("pointercancel", stop);
  btn.addEventListener("pointerleave", stop);
}

bindHold("leftBtn", () => move(-1), true);
bindHold("rightBtn", () => move(1), true);
bindHold("downBtn", softDrop, true);
bindHold("rotateBtn", rotatePiece);
bindHold("dropBtn", hardDrop);

soundBtn.onclick = () => {
  soundOn = !soundOn;
  soundBtn.textContent = soundOn ? "Lyd: på" : "Lyd: av";
};

musicBtn.onclick = () => {
  musicOn = !musicOn;

  if (musicOn) {
    music.normal.play().catch(() => {});
    musicBtn.textContent = "Musikk: på";
  } else {
    music.normal.pause();
    musicBtn.textContent = "Musikk: av";
  }
};

document.getElementById("quitBtn").onclick = () => location.reload();

renderHighscores();
update();