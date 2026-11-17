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
let dropInterval = 1350;
let lastTime = 0;
let gameOver = false;
let nameSaved = false;
let drag = null;
let dropping = null;

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
  if (gameOver || drag || dropping) return;

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
  if (gameOver || drag || dropping) return;

  piece.x += dir;

  if (collides()) {
    piece.x -= dir;
  } else {
    playSound("move");
  }
}

function softDrop() {
  if (gameOver || drag || dropping) return;

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
  if (gameOver || drag || dropping) return;
  const target = getGhost();
  const distance = target.y - piece.y;
  dropping = { from: piece.y, to: target.y, start: performance.now(), duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Math.min(650, 220 + distance * 24), distance };
  dropCounter = 0;
}

function finishDrop() {
  piece.y = dropping.to;
  score += dropping.distance + 1;
  dropping = null;
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

    dropInterval = Math.max(450, 1350 - (level - 1) * 55);
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
  if (gameOver || dropping) return;

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
    const progress = dropping ? (dropping.duration ? Math.min(1, (performance.now() - dropping.start) / dropping.duration) : 1) : 0;
    const displayY = dropping ? dropping.from + (dropping.to - dropping.from) * (1 - Math.pow(1 - progress, 2)) : piece.y;
    piece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          drawBlock(ctx, piece.x + x, displayY + y, COLORS[piece.type]);
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

  if (dropping) {
    if (time - dropping.start >= dropping.duration) finishDrop();
  } else if (!gameOver && !drag && !document.querySelector('.game-settings')?.open) {
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

// Pointer events support fingers, mouse and trackpad with the same placement rules.
canvas.style.touchAction = "none";
canvas.style.userSelect = "none";
canvas.style.cursor = "grab";
canvas.setAttribute("aria-label", "Tetris. Dra brikken og slipp for å plassere. Trykk for å rotere.");
function cancelDrag() {
  if (!drag) return;
  piece.x = drag.x; piece.y = drag.y;
  const id = drag.id;
  drag = null;
  dropCounter = 0;
  canvas.style.cursor = "grab";
  if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
}
function stableCell(value, current) {
  // A small dead zone prevents trembling fingers from toggling adjacent cells.
  return Math.abs(value - current) < 0.7 ? current : Math.round(value);
}
function updateDrag(e) {
  if (!drag || drag.id !== e.pointerId) return;
  const rect = canvas.getBoundingClientRect();
  const dx = e.clientX - drag.clientX, dy = e.clientY - drag.clientY;
  if (Math.hypot(dx, dy) >= 14) drag.moved = true;
  if (!drag.moved) return;
  const targetX = Math.max(-4, Math.min(COLS, drag.x + stableCell(dx / (rect.width / COLS), piece.x - drag.x)));
  const targetY = Math.max(drag.y, Math.min(ROWS, drag.y + stableCell(dy / (rect.height / ROWS), piece.y - drag.y)));
  // Step through cells: a dragged piece must never pass through a wall or stack.
  for (const [axis, target] of [["y", Math.min(piece.y, targetY)], ["x", targetX], ["y", targetY]]) {
    while (piece[axis] !== target) {
      const step = Math.sign(target - piece[axis]);
      piece[axis] += step;
      if (collides()) { piece[axis] -= step; break; }
    }
  }
}
canvas.addEventListener("pointerdown", e => {
  if (gameOver || drag || dropping || !e.isPrimary || e.button !== 0) return;
  e.preventDefault();
  drag = { id: e.pointerId, clientX: e.clientX, clientY: e.clientY, x: piece.x, y: piece.y, moved: false };
  canvas.setPointerCapture(e.pointerId);
  canvas.style.cursor = "grabbing";
});
canvas.addEventListener("pointermove", e => {
  if (drag?.id !== e.pointerId) return;
  e.preventDefault();
  updateDrag(e);
});
canvas.addEventListener("pointerup", e => {
  if (drag?.id !== e.pointerId) return;
  e.preventDefault();
  updateDrag(e);
  const rect = canvas.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) { cancelDrag(); return; }
  const moved = drag.moved;
  drag = null;
  canvas.releasePointerCapture(e.pointerId);
  canvas.style.cursor = "grab";
  dropCounter = 0;
  if (moved) hardDrop(); else rotatePiece();
});
canvas.addEventListener("pointercancel", e => { if (drag?.id === e.pointerId) cancelDrag(); });
canvas.addEventListener("lostpointercapture", e => { if (drag?.id === e.pointerId) cancelDrag(); });
window.addEventListener("blur", cancelDrag);
document.addEventListener("visibilitychange", () => { if (document.hidden) cancelDrag(); });

// Buttons and keyboard can take over immediately, even during a drag/release.
function takeControl(fn) {
  if (gameOver) return;
  const interrupted = drag || dropping;
  if (drag) {
    const id = drag.id;
    drag = null;
    canvas.style.cursor = "grab";
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  if (dropping) {
    const progress = dropping.duration ? Math.min(1, (performance.now() - dropping.start) / dropping.duration) : 1;
    piece.y = Math.floor(dropping.from + (dropping.to - dropping.from) * (1 - Math.pow(1 - progress, 2)));
    dropping = null;
  }
  if (interrupted) dropCounter = 0;
  fn();
}
document.addEventListener("keydown", e => {
  const actions = { ArrowLeft: () => move(-1), ArrowRight: () => move(1), ArrowDown: softDrop, ArrowUp: rotatePiece, " ": hardDrop };
  if (!actions[e.key] || e.target.closest('input,select,textarea,summary') || document.querySelector('.game-settings')?.open) return;
  e.preventDefault();
  takeControl(actions[e.key]);
});

function bindHold(id, fn, repeat = false) {
  const btn = document.getElementById(id);
  let timer = null, pointerId = null, handledPress = false;
  btn.style.touchAction = "none";
  const stop = () => {
    clearTimeout(timer); clearInterval(timer); timer = null;
    const id = pointerId; pointerId = null;
    if (id !== null && btn.hasPointerCapture(id)) btn.releasePointerCapture(id);
  };
  btn.addEventListener("pointerdown", e => {
    if (e.button !== 0 || pointerId !== null) return;
    e.preventDefault();
    stop();
    pointerId = e.pointerId;
    handledPress = true;
    btn.setPointerCapture(e.pointerId);
    takeControl(fn);
    if (repeat) timer = setTimeout(() => { takeControl(fn); timer = setInterval(() => takeControl(fn), 170); }, 320);
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
    btn.addEventListener(event, e => { if (e.pointerId === pointerId) stop(); });
  }
  // Supports keyboard/assistive clicks and browsers that deliver only click.
  btn.addEventListener("click", e => {
    if (handledPress && e.detail !== 0) { handledPress = false; return; }
    handledPress = false;
    takeControl(fn);
  });
  window.addEventListener("blur", stop);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
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